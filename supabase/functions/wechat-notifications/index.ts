import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// 微信 API 基础地址
const WECHAT_API_BASE = 'https://api.weixin.qq.com/cgi-bin'
const WECHAT_WXA_API_BASE = 'https://api.weixin.qq.com/wxaapi/newtmpl'

// 获取 access_token（带缓存）
async function getAccessToken(supabase: any, configId: string, appid: string, appsecret: string) {
  // 先从数据库缓存中读取
  const { data: cached } = await supabase
    .from('wechat_access_tokens')
    .select('*')
    .eq('config_id', configId)
    .maybeSingle()

  if (cached && cached.expires_at && new Date(cached.expires_at) > new Date()) {
    return cached.access_token
  }

  // 缓存失效，重新获取
  const url = `${WECHAT_API_BASE}/token?grant_type=client_credential&appid=${appid}&secret=${appsecret}`
  const response = await fetch(url)
  const data = await response.json()

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errmsg}`)
  }

  const accessToken = data.access_token
  const expiresIn = data.expires_in || 7200

  // 存入数据库缓存
  const expiresAt = new Date(Date.now() + (Number(expiresIn) - 300) * 1000).toISOString()
  await supabase.from('wechat_access_tokens').upsert({
    config_id: configId,
    access_token: accessToken,
    expires_at: expiresAt
  }, { onConflict: 'config_id' })

  return accessToken
}

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少环境变量');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));
    const { action, configId, taskId, priTmplId, tid, kidList, sceneDesc, ids, start, limit } = body;

    if (!configId) {
      throw new Error('缺少 configId');
    }

    // 获取微信配置
    const { data: config, error: configError } = await supabase
      .from('wechat_configs')
      .select('*')
      .eq('id', configId)
      .maybeSingle();

    if (configError) throw configError;
    if (!config) throw new Error('微信配置不存在');

    let accessToken = '';
    try {
      accessToken = await getAccessToken(supabase, config.id, config.appid, config.appsecret);
    } catch (tokenErr) {
      if (action === 'send_task' && taskId) {
        await supabase.from('wechat_notification_tasks').update({ 
          status: 'failed', 
          error_message: tokenErr.message,
          updated_at: new Date().toISOString()
        }).eq('id', taskId);
      }
      throw tokenErr;
    }

    let result: any = {};

    switch (action) {
      case 'sync_templates':
        const getTmplUrl = `${WECHAT_WXA_API_BASE}/gettemplate?access_token=${accessToken}`
        const tmplRes = await fetch(getTmplUrl)
        const tmplData = await tmplRes.json()

        if (tmplData.errcode === 0) {
          const templates = tmplData.data || []
          for (const tmpl of templates) {
            await supabase.from('wechat_notification_templates').upsert({
              config_id: configId,
              pri_tmpl_id: tmpl.priTmplId,
              title: tmpl.title,
              content: tmpl.content,
              example: tmpl.example,
              type: tmpl.type,
              status: 'active'
            }, { onConflict: 'config_id, pri_tmpl_id' })
          }
          result = { count: templates.length }
        } else {
          throw new Error(tmplData.errmsg)
        }
        break

      case 'get_category':
        const catUrl = `${WECHAT_WXA_API_BASE}/getcategory?access_token=${accessToken}`
        const catRes = await fetch(catUrl)
        result = await catRes.json()
        break

      case 'get_pub_templates':
        const pubTmplUrl = `${WECHAT_WXA_API_BASE}/getpubtemplatetitles?access_token=${accessToken}&ids=${ids || ''}&start=${start || 0}&limit=${limit || 30}`
        const pubRes = await fetch(pubTmplUrl)
        result = await pubRes.json()
        break

      case 'get_pub_keywords':
        const keyUrl = `${WECHAT_WXA_API_BASE}/getpubtemplatekeywords?access_token=${accessToken}&tid=${tid}`
        const keyRes = await fetch(keyUrl)
        result = await keyRes.json()
        break

      case 'add_template':
        const addUrl = `${WECHAT_WXA_API_BASE}/addtemplate?access_token=${accessToken}`
        const addRes = await fetch(addUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tid, kidList, sceneDesc })
        })
        result = await addRes.json()
        break

      case 'delete_template':
        const delUrl = `${WECHAT_WXA_API_BASE}/deltemplate?access_token=${accessToken}`
        const delRes = await fetch(delUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priTmplId })
        })
        result = await delRes.json()
        break

      case 'send_task':
        if (!taskId) throw new Error('缺少 taskId');
        const { data: task, error: taskError } = await supabase
          .from('wechat_notification_tasks')
          .select('*, wechat_notification_templates(pri_tmpl_id)')
          .eq('id', taskId)
          .single()

        if (taskError || !task) throw new Error('任务不存在');

        // 更新状态为正在处理
        await supabase.from('wechat_notification_tasks').update({ status: 'processing' }).eq('id', taskId)

        let openids = task.target_ids || []
        
        // 如果是全部粉丝，则需要获取所有关注者
        if (task.target_type === 'all') {
          const { data: fans, error: fansError } = await supabase
            .from('wechat_fans')
            .select('openid')
            .eq('config_id', configId);
            
          if (fansError) throw new Error(`获取粉丝列表失败: ${fansError.message}`);
          openids = (fans || []).map(f => f.openid);
        }

        if (openids.length === 0) {
           await supabase.from('wechat_notification_tasks').update({ 
            status: 'failed',
            error_message: '未找到符合条件的接收用户'
          }).eq('id', taskId);
          throw new Error('未找到符合条件的接收用户');
        }

        const templateId = task.wechat_notification_templates.pri_tmpl_id
        
        const sendResults = []
        // 分批发送，每批 50 条并发，防止超时
        const chunkSize = 50;
        for (let i = 0; i < openids.length; i += chunkSize) {
          const chunk = openids.slice(i, i + chunkSize);
          const chunkPromises = chunk.map(async (openid: string) => {
            const sendUrl = `${WECHAT_API_BASE}/message/subscribe/bizsend?access_token=${accessToken}`
            const sendBody = {
              touser: openid,
              template_id: templateId,
              page: task.page,
              data: task.data,
              miniprogram_state: task.miniprogram_state
            }
            
            let sendData: any = {};
            try {
              const sendRes = await fetch(sendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sendBody)
              })
              sendData = await sendRes.json()
            } catch (fetchErr) {
              sendData = { errcode: -1, errmsg: fetchErr.message };
            }
            
            const isSuccess = sendData.errcode === 0;
            
            // 记录日志，包含 msg_id 以便状态跟踪
            await supabase.from('wechat_notification_logs').insert({
              config_id: configId,
              task_id: taskId,
              openid: openid,
              template_id: task.template_id,
              status: isSuccess ? 'success' : 'failed',
              error_code: sendData.errcode?.toString() || '-1',
              error_message: sendData.errmsg || '未知错误',
              response_data: sendData,
              msg_id: sendData.msgid ? sendData.msgid.toString() : null
            })
            
            return { openid, success: isSuccess };
          });
          
          const batchResults = await Promise.all(chunkPromises);
          sendResults.push(...batchResults);
        }

        const successCount = sendResults.filter(r => r.success).length
        const failCount = sendResults.length - successCount

        const finalStatus = successCount > 0 ? 'completed' : 'failed';
        const finalErrorMessage = successCount === 0 ? '全部发送失败，请在日志中查看详情' : null;

        await supabase.from('wechat_notification_tasks').update({ 
          status: finalStatus,
          error_message: finalErrorMessage,
          updated_at: new Date().toISOString()
        }).eq('id', taskId)

        result = { successCount, failCount }
        break

      default:
        throw new Error(`未知操作类型: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Wechat-Notifications Error]:', error.message);
    
    // 如果有任务ID且是任务发送操作，更新任务状态为失败
    try {
      if (body?.action === 'send_task' && body?.taskId && body?.configId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase.from('wechat_notification_tasks').update({ 
            status: 'failed', 
            error_message: error.message,
            updated_at: new Date().toISOString()
          }).eq('id', body.taskId);
        }
      }
    } catch (updateErr) {
      console.error('[Wechat-Notifications Update Error]:', updateErr.message);
    }

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}

Deno.serve(handler);
