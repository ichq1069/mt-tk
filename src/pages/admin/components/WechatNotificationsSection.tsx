import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Plus, 
  RefreshCw, 
  Loader2, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  Users,
  FileText,
  Trash2,
  Eye,
  Search,
  Settings
} from 'lucide-react';

export function WechatNotificationsSection() {
  const [activeTab, setActiveTab] = useState('templates');
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksPage, setTasksPage] = useState(0);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subsPage, setSubsPage] = useState(0);
  const [subsTotal, setSubsTotal] = useState(0);
  const [subsSearch, setSubsSearch] = useState('');

  const [taskForm, setTaskForm] = useState({
    title: '',
    template_id: '',
    target_type: 'all',
    target_ids: [] as string[],
    data: {} as any,
    page: '',
    scheduled_at: new Date().toISOString().slice(0, 16)
  });

  const commonPages = [
    { label: '不跳转', value: '' },
    { label: '首页', value: '/' },
    { label: '图集写真', value: '/albums' },
    { label: '每日图集', value: '/daily-gallery' },
    { label: '文档中心', value: '/usage-guide' },
    { label: '个人中心', value: '/profile' },
    { label: '我的勋章', value: '/badges' },
    { label: '签到中心', value: '/check-in' },
  ];

  // 解析模板字段
  const [templateFields, setTemplateFields] = useState<any[]>([]);

  useEffect(() => {
    if (taskForm.template_id) {
      const template = templates.find(t => t.id === taskForm.template_id);
      if (template) {
        // 先提取所有占位符如 {{thing1.DATA}}
        const allMatches = [...template.content.matchAll(/\{\{(.*?)\.DATA\}\}/g)];
        
        // 尝试从内容中推断中文标签，匹配格式如 "项目名称：{{thing1.DATA}}"
        const fields = allMatches.map(m => {
          const key = m[1];
          let label = key;
          
          // 在内容中寻找该占位符前面的文字作为标签
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const labelRegex = new RegExp(`([^\\n\\r：:]{1,20})[:：]\\s*\\{\\{${escapedKey}\\.DATA\\}\\}`, 'i');
          const labelMatch = template.content.match(labelRegex);
          
          if (labelMatch && labelMatch[1]) {
            label = labelMatch[1].trim();
          } else {
            // 如果内容中没找到，从示例中找 (WeChat API 示例格式通常是 "关键词1:内容1\n关键词2:内容2")
            const exampleRegex = new RegExp(`([^\\n\\r：:]{1,20})[:：][^\\n\\r]+\\{\\{${escapedKey}\\.DATA\\}\\}`, 'i');
            const exampleMatch = (template.example || '').match(exampleRegex);
            if (exampleMatch && exampleMatch[1]) {
              label = exampleMatch[1].trim();
            }
          }

          let type = 'text';
          if (key.startsWith('date')) type = 'date';
          else if (key.startsWith('time')) type = 'time';
          else if (key.includes('time') || key.includes('date')) type = 'datetime-local';
          else if (key.startsWith('number')) type = 'number';
          
          return { key, label, type };
        });
        
        setTemplateFields(fields);
        
        // 初始化 data 对象
        const newData = { ...taskForm.data };
        fields.forEach(f => {
          if (!newData[f.key]) newData[f.key] = { value: '' };
        });
        setTaskForm(prev => ({ ...prev, data: newData }));
      }
    } else {
      setTemplateFields([]);
    }
  }, [taskForm.template_id, templates]);

  const [fansSearch, setFansSearch] = useState('');
  const [availableFans, setAvailableFans] = useState<any[]>([]);
  const [searchingFans, setSearchingFans] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (fansSearch && taskForm.target_type === 'fans') {
        searchFans();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [fansSearch, taskForm.target_type]);

  const searchFans = async () => {
    setSearchingFans(true);
    try {
      const { data, error } = await api.getWechatFans(selectedConfig, 0, 10, fansSearch);
      if (error) throw error;
      setAvailableFans(data || []);
    } catch (error: any) {
      toast.error(`搜索失败: ${error.message}`);
    } finally {
      setSearchingFans(false);
    }
  };

  const handleToggleFan = (fan: any) => {
    const currentIds = [...taskForm.target_ids];
    const index = currentIds.indexOf(fan.openid);
    if (index > -1) {
      currentIds.splice(index, 1);
    } else {
      currentIds.push(fan.openid);
    }
    setTaskForm({ ...taskForm, target_ids: currentIds });
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      fetchTemplates();
      fetchTasks();
      fetchSubscriptions();
    }
  }, [selectedConfig, tasksPage, subsPage]);

  const fetchSubscriptions = async () => {
    if (!selectedConfig) return;
    setLoading(true);
    try {
      const { data, error, total } = await api.getWechatNotificationSubscriptions(selectedConfig, subsPage, 20, subsSearch);
      if (error) throw error;
      setSubscriptions(data || []);
      setSubsTotal(total);
    } catch (error: any) {
      toast.error(`获取订阅状态失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      const { data, error } = await api.getWechatConfigs();
      if (error) throw error;
      setConfigs(data || []);
      if (data && data.length > 0 && !selectedConfig) {
        setSelectedConfig(data[0].id);
      }
    } catch (error: any) {
      toast.error(`获取配置失败: ${error.message}`);
    }
  };

  const fetchTemplates = async () => {
    if (!selectedConfig) return;
    setLoading(true);
    try {
      const { data, error } = await api.getWechatNotificationTemplates(selectedConfig);
      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error(`获取模板失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!selectedConfig) return;
    setLoading(true);
    try {
      const { data, error, total } = await api.getWechatNotificationTasks(selectedConfig, tasksPage, 20);
      if (error) throw error;
      setTasks(data || []);
      setTasksTotal(total);
    } catch (error: any) {
      toast.error(`获取任务失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncTemplates = async () => {
    if (!selectedConfig) return;
    setLoading(true);
    try {
      const { data, error } = await api.syncWechatNotificationTemplates(selectedConfig);
      if (error) throw error;
      if (data?.success) {
        toast.success(`同步成功，共 ${data.data?.count || 0} 个模板`);
        fetchTemplates();
      } else {
        throw new Error(data?.error || '同步失败');
      }
    } catch (error: any) {
      toast.error(`同步失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedConfig || !taskForm.template_id || !taskForm.title) {
      toast.error('请填写必填项');
      return;
    }

    setLoading(true);
    try {
      // 智能处理日期时间格式，适配微信 API 要求
      const cleanedData = JSON.parse(JSON.stringify(taskForm.data));
      Object.keys(cleanedData).forEach(key => {
        let val = cleanedData[key]?.value;
        if (val && typeof val === 'string' && val.includes('T') && val.length >= 16) {
          // 如果是日期字段 (date1, date2...)，只取 YYYY-MM-DD
          if (key.startsWith('date')) {
            cleanedData[key].value = val.split('T')[0];
          } 
          // 如果是时间字段 (time1, time2...)，只取 HH:mm
          else if (key.startsWith('time')) {
            cleanedData[key].value = val.split('T')[1];
          } 
          // 其他包含日期时间的字段，将 T 替换为空格，格式为 YYYY-MM-DD HH:mm
          else {
            cleanedData[key].value = val.replace('T', ' ');
          }
        }
      });

      const taskData = {
        template_id: taskForm.template_id,
        title: taskForm.title,
        target_type: taskForm.target_type,
        target_ids: taskForm.target_ids,
        data: cleanedData,
        page: taskForm.page,
        scheduled_at: taskForm.scheduled_at
      };

      if (isEditing && editingTaskId) {
        const { data, error } = await api.updateWechatNotificationTask(editingTaskId, {
          ...taskData,
          status: 'pending',
          error_message: null
        });
        if (error) throw error;
        toast.success('任务更新成功，已重置为待发送状态');
      } else {
        const { data, error } = await api.createWechatNotificationTask({
          ...taskData,
          config_id: selectedConfig,
          status: 'pending'
        });
        if (error) throw error;
        toast.success('任务创建成功');
      }
      
      setCreateDialogOpen(false);
      setIsEditing(false);
      setEditingTaskId(null);
      setTaskForm({
        title: '',
        template_id: '',
        target_type: 'all',
        target_ids: [],
        data: {},
        page: '',
        scheduled_at: new Date().toISOString().slice(0, 16)
      });
      fetchTasks();
    } catch (error: any) {
      toast.error(`${isEditing ? '更新' : '创建'}失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = (task: any) => {
    setIsEditing(true);
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      template_id: task.template_id,
      target_type: task.target_type,
      target_ids: task.target_ids || [],
      data: task.data || {},
      page: task.page || '',
      scheduled_at: task.scheduled_at ? new Date(task.scheduled_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
    });
    setCreateDialogOpen(true);
  };

  const handleSendTask = async (taskId: string) => {
    if (!selectedConfig) return;
    setLoading(true);
    try {
      const { data, error } = await api.sendWechatNotificationTask(selectedConfig, taskId);
      
      if (error) {
        // 尝试从 error.context 中获取详细错误
        let errMsg = error.message;
        try {
          if ((error as any).context && typeof (error as any).context.text === 'function') {
            const bodyText = typeof (error as any)?.context?.text === 'function' ? await (error as any).context.text() : (error as any)?.message;
            const body = JSON.parse(bodyText);
            errMsg = body.error || body.message || errMsg;
          }
        } catch (e) {
          console.error('解析错误响应失败', e);
        }
        throw new Error(errMsg);
      }

      if (data?.success) {
        toast.success(`发送成功: 成功 ${data.data?.successCount || 0} 条，失败 ${data.data?.failCount || 0} 条`);
        fetchTasks();
      } else {
        throw new Error(data?.error || '发送失败');
      }
    } catch (error: any) {
      toast.error(`发送失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await confirmAsync('确定删除此任务？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteWechatNotificationTask(taskId);
      if (error) throw error;
      toast.success('删除成功');
      fetchTasks();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const handleViewLogs = async (task: any) => {
    setSelectedTask(task);
    setLogsDialogOpen(true);
    setLoading(true);
    try {
      const { data, error } = await api.getWechatNotificationLogs(task.id, 0, 50);
      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast.error(`获取日志失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [logDetailDialogOpen, setLogDetailDialogOpen] = useState(false);

  const handleViewLogDetail = (log: any) => {
    setSelectedLog(log);
    setLogDetailDialogOpen(true);
  };

  const handleRetryFailed = async () => {
    if (!selectedTask || !selectedConfig) return;
    const failedOpenIds = logs.filter(l => l.status === 'failed').map(l => l.openid);
    if (failedOpenIds.length === 0) {
      toast.info('没有失败记录需要重试');
      return;
    }

    const confirmed = await confirmAsync(`确定为 ${failedOpenIds.length} 个失败的用户重新发送吗？`, { variant: 'destructive' });
    if (!confirmed) return;

    setLoading(true);
    try {
      // 创建一个新的补发任务，基于原任务
      const { data, error } = await api.createWechatNotificationTask({
        config_id: selectedConfig,
        template_id: selectedTask.template_id,
        title: `[补发] ${selectedTask.title}`,
        target_type: 'fans',
        target_ids: failedOpenIds,
        data: selectedTask.data,
        page: selectedTask.page,
        scheduled_at: new Date().toISOString(),
        status: 'pending'
      });

      if (error) throw error;
      toast.success('补发任务已创建');
      setLogsDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast.error(`补发失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResendTask = async (task: any) => {
    const confirmed = await confirmAsync('确定要重新发送此任务吗？这将会创建一个新的任务。', { variant: 'destructive' });
    if (!confirmed) return;
    setLoading(true);
    try {
      const { data, error } = await api.createWechatNotificationTask({
        config_id: task.config_id,
        template_id: task.template_id,
        title: `[重发] ${task.title}`,
        target_type: task.target_type,
        target_ids: task.target_ids,
        data: task.data,
        page: task.page,
        scheduled_at: new Date().toISOString(),
        status: 'pending'
      });
      if (error) throw error;
      toast.success('重发任务已创建');
      fetchTasks();
    } catch (error: any) {
      toast.error(`重发失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: any = {
      pending: { label: '待发送', variant: 'secondary' },
      processing: { label: '发送中', variant: 'default' },
      completed: { label: '已完成', variant: 'outline' },
      failed: { label: '失败', variant: 'destructive' },
      cancelled: { label: '已取消', variant: 'secondary' }
    };
    const s = statusMap[status] || statusMap.pending;
    return <Badge variant={s.variant as any}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">微信订阅通知</h2>
          <p className="text-muted-foreground mt-1">管理订阅消息模板、创建定时通知任务、查看发送记录</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedConfig} onValueChange={setSelectedConfig}>
            <SelectTrigger className="w-[200px] rounded-xl">
              <SelectValue placeholder="选择公众号配置" />
            </SelectTrigger>
            <SelectContent>
              {configs.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl p-1 bg-muted/30">
          <TabsTrigger value="templates" className="rounded-xl font-bold gap-2 text-xs">
            <FileText className="w-4 h-4" />
            模板管理
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-xl font-bold gap-2 text-xs">
            <Bell className="w-4 h-4" />
            通知任务
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="rounded-xl font-bold gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4" />
            订阅状态
          </TabsTrigger>
          <TabsTrigger value="stats" className="rounded-xl font-bold gap-2 text-xs">
            <Settings className="w-4 h-4" />
            统计分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">已有模板列表</h3>
            <Button onClick={handleSyncTemplates} disabled={loading || !selectedConfig} className="rounded-xl gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              同步模板
            </Button>
          </div>

          <Card className="rounded-3xl border-none shadow-sm bg-muted/20">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : templates.length > 0 ? (
                <div className="space-y-3">
                  {templates.map(tmpl => (
                    <Card key={tmpl.id} className="rounded-2xl border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm">{tmpl.title}</h4>
                              <Badge variant={tmpl.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                                {tmpl.status === 'active' ? '启用' : '停用'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                {tmpl.type === 2 ? '一次性订阅' : '长期订阅'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{tmpl.content}</p>
                            {tmpl.example && (
                              <p className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded-lg">示例：{tmpl.example}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">暂无模板</p>
                  <p className="text-xs mt-1">点击「同步模板」从微信官方同步已添加的模板</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">通知任务列表</h3>
            <Dialog open={createDialogOpen} onOpenChange={(open) => {
              setCreateDialogOpen(open);
              if (!open) {
                setIsEditing(false);
                setEditingTaskId(null);
                setTaskForm({
                  title: '',
                  template_id: '',
                  target_type: 'all',
                  target_ids: [],
                  data: {},
                  page: '',
                  scheduled_at: new Date().toISOString().slice(0, 16)
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4" />
                  创建任务
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden flex flex-col max-h-[90vh] border-none shadow-2xl">
                <DialogHeader className="p-6 border-b bg-muted/50">
                  <DialogTitle className="text-xl font-black flex items-center gap-2">
                    <Bell className="w-6 h-6 text-primary" />
                    {isEditing ? '编辑通知任务' : '创建通知任务'}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 px-6 py-4">
                  <div className="space-y-4 pr-3 pb-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold">任务标题 *</Label>
                      <Input 
                        value={taskForm.title} 
                        onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                        placeholder="例如：订单发货通知"
                        className="rounded-xl border-border/60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold">选择模板 *</Label>
                      <Select value={taskForm.template_id} onValueChange={v => setTaskForm({ ...taskForm, template_id: v })}>
                        <SelectTrigger className="rounded-xl border-border/60">
                          <SelectValue placeholder="选择通知模板" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-xl">
                          {templates.filter(t => t.status === 'active').map(t => (
                            <SelectItem key={t.id} value={t.id} className="py-2.5">{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex justify-between items-center">
                        <span className="text-sm font-bold">发送对象</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">需用户在12小时内互动或订阅</span>
                      </Label>
                      <Select value={taskForm.target_type} onValueChange={v => setTaskForm({ ...taskForm, target_type: v })}>
                        <SelectTrigger className="rounded-xl border-border/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-xl">
                          <SelectItem value="all" className="py-2.5">全部粉丝</SelectItem>
                          <SelectItem value="fans" className="py-2.5">指定粉丝 (搜索及手动输入)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {taskForm.target_type === 'fans' && (
                      <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              value={fansSearch}
                              onChange={e => setFansSearch(e.target.value)}
                              placeholder="搜索昵称或 OpenID..."
                              className="rounded-xl h-10 pl-9 border-border/60 bg-background"
                            />
                          </div>
                          {searchingFans && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        </div>

                        {availableFans.length > 0 && (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {availableFans.map(fan => (
                              <div 
                                key={fan.openid} 
                                onClick={() => handleToggleFan(fan)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                                  taskForm.target_ids.includes(fan.openid) 
                                  ? 'bg-primary/10 border-primary/50 text-primary shadow-sm' 
                                  : 'hover:bg-background border-transparent'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">{fan.display_nickname}</span>
                                  <span className="text-[10px] opacity-60 font-mono">{fan.openid}</span>
                                </div>
                                {taskForm.target_ids.includes(fan.openid) && <CheckCircle2 className="w-4 h-4" />}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground flex justify-between">
                            <span>已选择: {taskForm.target_ids.length} 人</span>
                            <span>支持手动粘贴，每行一个</span>
                          </Label>
                          <Textarea 
                            value={taskForm.target_ids.join('\n')}
                            onChange={e => setTaskForm({ ...taskForm, target_ids: e.target.value.split('\n').filter(Boolean) })}
                            placeholder="输入粉丝 OpenID，每行一个"
                            className="rounded-xl min-h-[100px] text-[10px] font-mono border-border/60 bg-background resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {templateFields.length > 0 && (
                      <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
                        <Label className="text-sm font-black flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          模板字段数据填写
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {templateFields.map(field => (
                            <div key={field.key} className="space-y-2">
                              <Label className="text-[11px] font-bold text-muted-foreground pl-1">{field.label}</Label>
                              <Input 
                                type={field.type}
                                value={taskForm.data[field.key]?.value || ''}
                                onChange={e => {
                                  const newData = { ...taskForm.data };
                                  if (!newData[field.key]) newData[field.key] = { value: '' };
                                  newData[field.key].value = e.target.value;
                                  setTaskForm({ ...taskForm, data: newData });
                                }}
                                placeholder={`请输入 ${field.label}`}
                                className="rounded-xl border-border/60 bg-background h-10"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="flex justify-between items-center">
                        <span className="text-sm font-bold">跳转页面</span>
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">支持自定义输入路径</span>
                      </Label>
                      <div className="flex gap-2">
                        <Select 
                          value={commonPages.some(p => p.value === taskForm.page) ? taskForm.page : 'custom'} 
                          onValueChange={(val) => {
                            if (val !== 'custom') {
                              setTaskForm({ ...taskForm, page: val });
                            }
                          }}
                        >
                          <SelectTrigger className="w-[140px] rounded-xl border-border/60 h-11">
                            <SelectValue placeholder="快捷页面" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-xl">
                            {commonPages.map(p => (
                              <SelectItem key={p.value || 'none'} value={p.value}>{p.label}</SelectItem>
                            ))}
                            <SelectItem value="custom">自定义输入</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input 
                          value={taskForm.page}
                          onChange={e => setTaskForm({ ...taskForm, page: e.target.value })}
                          placeholder="例如：pages/index/index"
                          className="rounded-xl flex-1 border-border/60 h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        定时发送时间
                      </Label>
                      <Input 
                        type="datetime-local"
                        value={taskForm.scheduled_at}
                        onChange={e => setTaskForm({ ...taskForm, scheduled_at: e.target.value })}
                        className="rounded-xl border-border/60 h-11"
                      />
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter className="p-6 border-t bg-muted/50 gap-3">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="rounded-xl px-6">取消</Button>
                  <Button onClick={handleCreateTask} disabled={loading} className="rounded-xl px-8 gap-2 font-bold shadow-lg shadow-primary/20">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isEditing ? '更新任务' : '创建任务'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="rounded-3xl border-none shadow-sm bg-muted/20">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map(task => (
                    <Card key={task.id} className="rounded-2xl border border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm">{task.title}</h4>
                              {getStatusBadge(task.status)}
                            </div>
                            {task.status === 'failed' && task.error_message && (
                              <p className="text-[10px] text-red-500 bg-red-50 p-1 rounded border border-red-100 mt-1">
                                失败原因: {task.error_message}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {task.wechat_notification_templates?.title || '未知模板'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {task.target_type === 'all' ? '全部粉丝' : `${task.target_ids?.length || 0} 人`}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.scheduled_at).toLocaleString('zh-CN')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(task.status === 'pending' || task.status === 'failed') && (
                              <>
                                <Button size="sm" onClick={() => handleSendTask(task.id)} className="rounded-xl gap-1 h-8 text-xs">
                                  <Send className="w-3 h-3" />
                                  {task.status === 'failed' ? '重新发送' : '立即发送'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleEditTask(task)} className="rounded-xl gap-1 h-8 text-xs">
                                  编辑
                                </Button>
                              </>
                            )}
                            {task.status === 'completed' && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleViewLogs(task)} className="rounded-xl gap-1 h-8 text-xs">
                                  <Eye className="w-3 h-3" />
                                  查看日志
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleResendTask(task)} className="rounded-xl gap-1 h-8 text-xs">
                                  再次发送
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteTask(task.id)} className="rounded-xl h-8 w-8 p-0">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">暂无任务</p>
                  <p className="text-xs mt-1">点击「创建任务」开始发送订阅通知</p>
                </div>
              )}
            </CardContent>
          </Card>

          {tasksTotal > 20 && (
            <div className="flex items-center justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTasksPage(Math.max(0, tasksPage - 1))}
                disabled={tasksPage === 0}
                className="rounded-xl"
              >
                上一页
              </Button>
              <span className="text-xs text-muted-foreground">
                第 {tasksPage + 1} 页 / 共 {Math.ceil(tasksTotal / 20)} 页
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setTasksPage(tasksPage + 1)}
                disabled={(tasksPage + 1) * 20 >= tasksTotal}
                className="rounded-xl"
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4 mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black">用户订阅授权状态</h3>
              <p className="text-xs text-muted-foreground mt-1">
                用户在公众号文章或 H5 页面点击订阅通知按钮后，微信会推送事件到服务端并记录在此
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                value={subsSearch} 
                onChange={e => setSubsSearch(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && fetchSubscriptions()}
                placeholder="搜索 OpenID 或 模板ID..." 
                className="w-[250px] rounded-xl h-9"
              />
              <Button size="sm" onClick={fetchSubscriptions} className="rounded-xl h-9">搜索</Button>
            </div>
          </div>

          <Card className="rounded-3xl border-none shadow-sm bg-muted/20">
            <CardContent className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : subscriptions.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-6 gap-4 px-4 py-2 text-[10px] font-black uppercase text-muted-foreground bg-muted/50 rounded-xl">
                    <span>用户 OpenID</span>
                    <span className="col-span-2">模板信息</span>
                    <span>状态</span>
                    <span>点击时间</span>
                    <span>最后更新</span>
                  </div>
                  {subscriptions.map(sub => (
                    <Card key={sub.id} className="rounded-2xl border border-border/50">
                      <CardContent className="p-3">
                        <div className="grid grid-cols-6 gap-4 items-center">
                          <span className="text-xs font-mono truncate">{sub.openid}</span>
                          <div className="col-span-2 flex flex-col min-w-0">
                            <span className="text-xs font-bold truncate">{sub.template_id}</span>
                            <span className="text-[10px] text-muted-foreground">场景: {sub.popup_scene === 1 ? 'H5页面' : '图文消息'}</span>
                          </div>
                          <div>
                            {sub.status === 'accept' ? (
                              <Badge variant="outline" className="text-[10px] gap-1 bg-green-50 text-green-700 border-green-200">
                                <CheckCircle2 className="w-3 h-3" />
                                已同意
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] gap-1 bg-red-50 text-red-700 border-red-200">
                                <XCircle className="w-3 h-3" />
                                已拒绝
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(sub.created_at).toLocaleString('zh-CN')}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(sub.updated_at).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">暂无订阅记录</p>
                  <p className="text-xs mt-1">用户点击订阅通知按钮后会自动记录在此</p>
                </div>
              )}
            </CardContent>
          </Card>

          {subsTotal > 20 && (
            <div className="flex items-center justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSubsPage(Math.max(0, subsPage - 1))}
                disabled={subsPage === 0}
                className="rounded-xl"
              >
                上一页
              </Button>
              <span className="text-xs text-muted-foreground">
                第 {subsPage + 1} 页 / 共 {Math.ceil(subsTotal / 20)} 页
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSubsPage(subsPage + 1)}
                disabled={(subsPage + 1) * 20 >= subsTotal}
                className="rounded-xl"
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-6">
          <Card className="rounded-3xl border-none shadow-sm bg-muted/20">
            <CardHeader>
              <CardTitle>发送统计</CardTitle>
              <CardDescription>订阅通知发送数据统计（开发中）</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-20 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold">统计功能开发中</p>
                <p className="text-xs mt-1">即将上线发送成功率、用户反馈等统计数据</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl rounded-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-border/50">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle>发送日志 - {selectedTask?.title}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">查看详细发送情况及错误信息</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleRetryFailed} className="rounded-xl gap-2 h-9">
                <RefreshCw className="w-3 h-3" />
                补发失败记录
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : logs.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4 px-4 py-2 text-[10px] font-black uppercase text-muted-foreground bg-muted/50 rounded-xl">
                  <span>接收用户</span>
                  <span>状态</span>
                  <span className="col-span-2">详情 / 错误原因</span>
                </div>
                {logs.map(log => (
                  <Card 
                    key={log.id} 
                    onClick={() => handleViewLogDetail(log)}
                    className="rounded-2xl border border-border/50 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all"
                  >
                    <CardContent className="p-3">
                      <div className="grid grid-cols-4 gap-4 items-center">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-mono truncate">{log.openid}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(log.sent_at).toLocaleString('zh-CN')}</span>
                        </div>
                        <div>
                          {log.status === 'success' ? (
                            <Badge variant="outline" className="text-[10px] gap-1 bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3" />
                              成功
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px] gap-1 bg-red-50 text-red-700 border-red-200">
                              <XCircle className="w-3 h-3" />
                              失败
                            </Badge>
                          )}
                        </div>
                        <div className="col-span-2">
                          <div className={`p-2 rounded-lg border ${log.status === 'success' ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                            <p className={`text-[10px] font-mono break-all line-clamp-2 group-hover:line-clamp-none transition-all ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                              {log.error_message || (log.status === 'success' ? '已成功推送到微信服务器' : '发送失败，请查看详情')}
                            </p>
                            {log.response_data && log.status !== 'success' && (
                              <p className="text-[8px] mt-1 opacity-70">
                                响应: {JSON.stringify(log.response_data)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-bold">暂无日志</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={logDetailDialogOpen} onOpenChange={setLogDetailDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>日志详情</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">用户 OpenID</Label>
              <p className="text-sm font-mono p-2 bg-muted rounded-xl">{selectedLog?.openid}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">发送状态</Label>
              <div className="flex items-center gap-2">
                {selectedLog?.status === 'success' ? (
                  <Badge className="bg-green-100 text-green-700">发送成功</Badge>
                ) : (
                  <Badge variant="destructive">发送失败</Badge>
                )}
                {selectedLog?.error_code && <span className="text-xs font-mono">错误码: {selectedLog.error_code}</span>}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">错误信息</Label>
              <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 min-h-[60px]">
                {selectedLog?.error_message || '无错误信息'}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">微信原始响应</Label>
              <pre className="text-[10px] font-mono p-3 bg-muted rounded-xl overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedLog?.response_data, null, 2)}
              </pre>
            </div>
            <div className="flex items-center gap-2 pt-2 text-[10px] text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>消息ID (MsgID): {selectedLog?.msg_id || '暂无'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setLogDetailDialogOpen(false)} className="w-full rounded-xl">关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
