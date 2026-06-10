import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { redisUtils } from "../_shared/redis.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// 备用IP接口列表（优先级从高到低）
const IP_API_LIST = [
  {
    url: 'https://ip9.com.cn/get',
    type: 'ip9' // 国内稳定接口，返回纯汉字
  },
  {
    url: 'https://whois.pconline.com.cn/ipJson.jsp?json=true',
    type: 'pconline' // 太平洋电脑网，返回汉字
  },
  {
    url: 'https://ipinfo.io/json',
    type: 'ipinfo' // 备用，可能返回拼音/英文
  }
];

// 城市名称映射（拼音/英文 → 汉字）
const CITY_NAME_MAP = {
  // 常见拼音/英文转汉字
  'beijing': '北京',
  'shanghai': '上海',
  'guangzhou': '广州',
  'shenzhen': '深圳',
  'tianjin': '天津',
  'chongqing': '重庆',
  'hangzhou': '杭州',
  'nanjing': '南京',
  'wuhan': '武汉',
  'chengdu': '成都',
  'xian': '西安',
  'zhengzhou': '郑州',
  'jinan': '济南',
  'qingdao': '青岛',
  'suzhou': '苏州',
  'wuxi': '无锡',
  'ningbo': '宁波',
  'foshan': '佛山',
  'dongguan': '东莞',
  'zhongshan': '中山',
  'zhuhai': '珠海',
  'xiamen': '厦门',
  'fuzhou': '福州',
  'changsha': '长沙',
  'changchun': '长春',
  'shenyang': '沈阳',
  'harbin': '哈尔滨',
  'kunming': '昆明',
  'guiyang': '贵阳',
  'nanning': '南宁',
  'hefei': '合肥',
  'nanchang': '南昌',
  'taiyuan': '太原',
  'lanzhou': '兰州',
  'xining': '西宁',
  'yinchuan': '银川',
  'wulumuqi': '乌鲁木齐',
  'haerbin': '哈尔滨',
  'jiaxing': '嘉兴',
  'zhoushan': '舟山',
  'wenzhou': '温州',
  'jinhua': '金华',
  'taizhou': '台州',
  'lishui': '丽水',
  'hz': '杭州',
  'bj': '北京',
  'sh': '上海',
  'gz': '广州',
  'sz': '深圳',
  // 英文城市名
  'Beijing': '北京',
  'Shanghai': '上海',
  'Guangzhou': '广州',
  'Shenzhen': '深圳',
  'Hangzhou': '杭州',
  'Hong Kong': '香港',
  'Macau': '澳门',
  'Taipei': '台北'
};

// 省份名称映射（拼音/英文 → 汉字）
const PROVINCE_NAME_MAP = {
  'jiangsu': '江苏',
  'zhejiang': '浙江',
  'guangdong': '广东',
  'shandong': '山东',
  'henan': '河南',
  'hebei': '河北',
  'hubei': '湖北',
  'hunan': '湖南',
  'sichuan': '四川',
  'shaanxi': '陕西',
  'gansu': '甘肃',
  'qinghai': '青海',
  'ningxia': '宁夏',
  'xinjiang': '新疆',
  'inner mongolia': '内蒙古',
  'liaoning': '辽宁',
  'jilin': '吉林',
  'heilongjiang': '黑龙江',
  'anhui': '安徽',
  'jiangxi': '江西',
  'fujian': '福建',
  'guangxi': '广西',
  'yunnan': '云南',
  'guizhou': '贵州',
  'hainan': '海南',
  'taiwan': '台湾',
  'jiangxi': '江西',
  'js': '江苏',
  'zj': '浙江',
  'gd': '广东',
  'sd': '山东',
  'hn': '河南',
  'hb': '湖北',
  'sc': '四川',
  'gs': '甘肃',
  'js': '江苏',
  // 英文省份名
  'Jiangsu': '江苏',
  'Zhejiang': '浙江',
  'Guangdong': '广东',
  'Shandong': '山东',
  'Henan': '河南',
  'Hebei': '河北',
  'Hubei': '湖北',
  'Hunan': '湖南',
  'Sichuan': '四川'
};

// 转换名称为汉字（支持拼音/英文/缩写）
function convertToChinese(name: string, type: 'city' | 'province'): string {
  if (!name) return '';
  
  // 去除空格和特殊字符，转小写
  const cleanName = name.trim().toLowerCase().replace(/\s+/g, '');
  
  // 根据类型查找映射
  const map = type === 'city' ? CITY_NAME_MAP : PROVINCE_NAME_MAP;
  
  // 优先返回映射值，无映射则返回原名称（已为汉字）
  return map[cleanName] || name;
}

// 格式化ip9.com.cn接口数据
function formatIp9Data(data: any) {
  if (!data || data.ret !== 200 || !data.data) return { ip: '', province: '', city: '', addr: '' };
  
  const ipData = data.data;
  const country = ipData.country || '中国';
  const province = convertToChinese(ipData.prov || '', 'province');
  const city = convertToChinese(ipData.city || '', 'city');
  
  let addr = '';
  if (country === '中国') {
    addr = `${province} ${city}`.trim();
  } else {
    addr = country;
  }
  
  return {
    ip: ipData.ip || '',
    province,
    city,
    addr: addr || '未知位置'
  };
}

// 格式化太平洋电脑网接口数据
function formatPconlineData(data: any) {
  if (!data || !data.ip) return { ip: '', province: '', city: '', addr: '' };
  
  const country = data.country || '中国';
  const province = convertToChinese(data.province || '', 'province');
  const city = convertToChinese(data.city || '', 'city');
  
  let addr = '';
  if (country === '中国') {
    addr = `${province} ${city}`.trim();
  } else {
    addr = country;
  }
  
  return {
    ip: data.ip || '',
    province,
    city,
    addr: addr || '未知位置'
  };
}

// 格式化ipinfo.io接口数据
function formatIpinfoData(data: any) {
  if (!data || !data.ip) return { ip: '', province: '', city: '', addr: '' };
  
  const country = data.country === 'CN' ? '中国' : data.country || '';
  let region = convertToChinese(data.region || '', 'province');
  let city = convertToChinese(data.city || '', 'city');
  
  if (region === data.region && data.region) {
    region = convertToChinese(data.region, 'province');
  }
  
  let addr = '';
  if (country === '中国') {
    addr = `${region} ${city}`.trim();
  } else {
    addr = country;
  }
  
  return {
    ip: data.ip || '',
    province: region,
    city,
    addr: addr || '未知位置'
  };
}

// 通用IP信息获取函数（带重试）
async function fetchIpInfo() {
  let lastError: Error | null = null;
  
  for (const api of IP_API_LIST) {
    try {
      console.log(`尝试接口: ${api.url}`);
      
      const res = await fetch(api.url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01'
        },
        timeout: 5000 // 5秒超时
      });
      
      // 检查响应状态
      if (!res.ok) {
        throw new Error(`接口返回错误状态: ${res.status}`);
      }
      
      // 处理不同接口的响应格式
      let data;
      const text = await res.text();
      
      try {
        // 太平洋电脑网可能返回带bom的JSON，需要处理
        const cleanText = text.replace(/^\uFEFF/, '');
        data = JSON.parse(cleanText);
      } catch (e) {
        throw new Error(`JSON解析失败: ${text.substring(0, 50)}`);
      }
      
      // 根据接口类型格式化数据
      let result;
      switch (api.type) {
        case 'ip9':
          result = formatIp9Data(data);
          break;
        case 'pconline':
          result = formatPconlineData(data);
          break;
        case 'ipinfo':
          result = formatIpinfoData(data);
          break;
        default:
          result = { ip: '', province: '', city: '', addr: '未知位置' };
      }
      
      // 验证数据有效性
      if (result.ip) {
        console.log(`接口 ${api.url} 获取成功:`, result);
        return result;
      } else {
        throw new Error('返回IP为空');
      }
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`接口 ${api.url} 失败:`, lastError.message);
      continue; // 尝试下一个接口
    }
  }
  
  // 所有接口都失败
  throw new Error(`所有IP接口请求失败: ${lastError?.message || '未知错误'}`);
}

serve(async (req) => {
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 优先尝试从请求头获取 IP（自建环境或 CDN 环境通常会透传）
    const headerIp = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-real-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0].trim();
    
    if (headerIp && headerIp !== '127.0.0.1' && !headerIp.startsWith('172.') && !headerIp.startsWith('10.')) {
      console.log(`从请求头获取到有效 IP: ${headerIp}`);
      return new Response(JSON.stringify({
        ip: headerIp,
        province: '',
        city: '',
        addr: '通过请求头获取'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 如果请求头没有或为内网 IP，则调用外部接口（带自动重试）
    const cacheKey = 'server_ip_info';
    const cached = await redisUtils.get(cacheKey);
    if (cached) {
      console.log('从缓存获取 IP 信息');
      return new Response(cached, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    const result = await fetchIpInfo();
    
    // 缓存 1 小时
    await redisUtils.set(cacheKey, JSON.stringify(result), 3600);

    // 返回成功响应
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('IP信息获取失败:', error);
    // 返回友好的500错误（保证前端能解析）
    return new Response(JSON.stringify({
      error: 'IP信息获取失败',
      detail: error instanceof Error ? error.message : '未知错误',
      ip: '',
      province: '',
      city: '',
      addr: '未知位置'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})