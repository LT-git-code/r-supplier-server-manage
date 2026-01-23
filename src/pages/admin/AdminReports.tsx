import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  TrendingUp,
  Users,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Send,
  Shield,
  Lock,
  Calendar,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  file_url: string;
  deadline: string;
  target_roles: string[];
  supplier_selection_type: string;
  target_supplier_ids: string[] | null;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

interface ReportSubmission {
  id: string;
  template_id: string;
  supplier_id: string;
  file_url: string;
  status: string;
  submitted_at: string;
  review_comment: string;
  reviewed_at: string;
  reviewed_by: string;
  template?: { id: string; name: string; deadline: string };
  supplier?: { id: string; company_name: string; supplier_type: string; contact_name: string };
}

interface Supplier {
  id: string;
  company_name: string;
  unified_social_credit_code: string;
  supplier_type: string;
  contact_name: string;
  contact_phone: string;
}

interface Statistics {
  templateCount: number;
  activeTemplateCount: number;
  submissionCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  supplierCount: number;
  submissionRate: number;
  templateStats: { id: string; name: string; total: number; pending: number; approved: number; rejected: number }[];
  monthlyTrend: { month: string; submissions: number; approved: number }[];
}

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

// 报表类型定义
const REPORT_TYPES = [
  {
    id: 'integrity_agreement',
    name: '供应商廉洁协议',
    icon: <Shield className="h-5 w-5 text-blue-500" />,
    description: '供应商廉洁自律承诺协议',
  },
  {
    id: 'confidentiality_agreement',
    name: '供应商保密协议',
    icon: <Lock className="h-5 w-5 text-green-500" />,
    description: '供应商保密责任协议',
  },
  {
    id: 'related_party_declaration',
    name: '关联关系申报表',
    icon: <Users className="h-5 w-5 text-orange-500" />,
    description: '供应商关联关系申报',
  },
  {
    id: 'periodic_report',
    name: '年度/季度报表',
    icon: <Calendar className="h-5 w-5 text-purple-500" />,
    description: '定期经营数据报表',
  },
];

export default function AdminReports() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [submissions, setSubmissions] = useState<ReportSubmission[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  
  // Dialog states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showSupplierSelectDialog, setShowSupplierSelectDialog] = useState(false);
  
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<ReportTemplate | null>(null);
  const [reviewingSubmission, setReviewingSubmission] = useState<ReportSubmission | null>(null);
  
  // Form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    file_url: '',
    deadline: '',
    supplier_selection_type: 'all',
    target_supplier_ids: [] as string[],
  });
  const [reviewForm, setReviewForm] = useState({ status: 'approved', review_comment: '' });
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  
  // Filter state
  const [submissionFilter, setSubmissionFilter] = useState({ templateId: '', status: '' });

  // Distribute report dialog state
  const [showDistributeDialog, setShowDistributeDialog] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [distributeForm, setDistributeForm] = useState({
    reportType: '',
    deadline: '',
    supplierSelectionType: 'all',
  });
  const [distributeSelectedSuppliers, setDistributeSelectedSuppliers] = useState<string[]>([]);
  const [showDistributeSupplierDialog, setShowDistributeSupplierDialog] = useState(false);
  const [distributeSupplierSearch, setDistributeSupplierSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, templatesRes, suppliersRes] = await Promise.all([
        supabase.functions.invoke('admin-api', { body: { action: 'get_report_statistics' } }),
        supabase.functions.invoke('admin-api', { body: { action: 'get_report_templates' } }),
        supabase.functions.invoke('admin-api', { body: { action: 'get_all_approved_suppliers' } }),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (templatesRes.error) throw templatesRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      setStatistics(statsRes.data);
      setTemplates(templatesRes.data.templates || []);
      setAllSuppliers(suppliersRes.data.suppliers || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: '加载失败', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      const res = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'get_report_submissions',
          templateId: submissionFilter.templateId || undefined,
          status: submissionFilter.status || undefined,
        },
      });
      if (res.error) throw res.error;
      setSubmissions(res.data.submissions || []);
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: '加载提交记录失败', description: err.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (activeTab === 'submissions') {
      loadSubmissions();
    }
  }, [activeTab, submissionFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('report-templates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('report-templates')
        .getPublicUrl(filePath);

      setTemplateForm(prev => ({ ...prev, file_url: urlData.publicUrl }));
      toast({ title: '上传成功', description: '模板文件已上传' });
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: '上传失败', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // 简单的CSV/文本解析，提取供应商名称或统一社会信用代码
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // 跳过可能的标题行
      const dataLines = lines.slice(1);
      const matchedIds: string[] = [];
      const notFound: string[] = [];

      for (const line of dataLines) {
        const values = line.split(/[,\t]/).map(v => v.trim().replace(/"/g, ''));
        const nameOrCode = values[0]; // 假设第一列是供应商名称或信用代码

        if (!nameOrCode) continue;

        // 尝试匹配
        const supplier = allSuppliers.find(
          s => s.company_name === nameOrCode || s.unified_social_credit_code === nameOrCode
        );

        if (supplier) {
          if (!matchedIds.includes(supplier.id)) {
            matchedIds.push(supplier.id);
          }
        } else {
          notFound.push(nameOrCode);
        }
      }

      setSelectedSuppliers(matchedIds);
      
      let message = `成功匹配 ${matchedIds.length} 个供应商`;
      if (notFound.length > 0) {
        message += `，${notFound.length} 个未找到`;
      }
      
      toast({ 
        title: '导入完成', 
        description: message,
        variant: notFound.length > 0 ? 'default' : 'default',
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: '导入失败', description: err.message, variant: 'destructive' });
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const openTemplateDialog = (template?: ReportTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        description: template.description || '',
        file_url: template.file_url || '',
        deadline: template.deadline || '',
        supplier_selection_type: template.supplier_selection_type || 'all',
        target_supplier_ids: template.target_supplier_ids || [],
      });
      setSelectedSuppliers(template.target_supplier_ids || []);
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        name: '',
        description: '',
        file_url: '',
        deadline: '',
        supplier_selection_type: 'all',
        target_supplier_ids: [],
      });
      setSelectedSuppliers([]);
    }
    setShowTemplateDialog(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast({ title: '请填写报表名称', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const action = editingTemplate ? 'update_report_template' : 'create_report_template';
      const params = editingTemplate
        ? { templateId: editingTemplate.id, ...templateForm, target_supplier_ids: selectedSuppliers.length > 0 ? selectedSuppliers : null }
        : { ...templateForm, target_supplier_ids: selectedSuppliers.length > 0 ? selectedSuppliers : null };

      const res = await supabase.functions.invoke('admin-api', { body: { action, ...params } });
      if (res.error) throw res.error;
      if (res.data.error) throw new Error(res.data.error);

      toast({ title: editingTemplate ? '更新成功' : '创建成功' });
      setShowTemplateDialog(false);
      loadData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: '保存失败', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return;

    try {
      setSaving(true);
      const res = await supabase.functions.invoke('admin-api', {
        body: { action: 'delete_report_template', templateId: deletingTemplate.id },
      });
      if (res.error) throw res.error;

      toast({ title: '删除成功' });
      setShowDeleteDialog(false);
      setDeletingTemplate(null);
      loadData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: '删除失败', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReviewSubmission = async () => {
    if (!reviewingSubmission) return;

    try {
      setSaving(true);
      const res = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'review_report_submission',
          submissionId: reviewingSubmission.id,
          status: reviewForm.status,
          review_comment: reviewForm.review_comment,
        },
      });
      if (res.error) throw res.error;

      toast({ title: '审核完成' });
      setShowReviewDialog(false);
      setReviewingSubmission(null);
      loadSubmissions();
      loadData(); // Refresh statistics
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: '审核失败', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSupplierSelection = (supplierId: string) => {
    setSelectedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const toggleDistributeSupplierSelection = (supplierId: string) => {
    setDistributeSelectedSuppliers(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  const handleDistributeReport = async () => {
    if (!distributeForm.reportType || !distributeForm.deadline) {
      toast({ title: '请填写完整信息', variant: 'destructive' });
      return;
    }

    if (distributeForm.supplierSelectionType === 'selected' && distributeSelectedSuppliers.length === 0) {
      toast({ title: '请选择目标供应商', variant: 'destructive' });
      return;
    }

    const reportType = REPORT_TYPES.find(t => t.id === distributeForm.reportType);
    if (!reportType) return;

    try {
      setDistributing(true);
      const res = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'distribute_report',
          reportType: distributeForm.reportType,
          reportTypeName: reportType.name,
          deadline: distributeForm.deadline,
          supplierSelectionType: distributeForm.supplierSelectionType,
          targetSupplierIds: distributeForm.supplierSelectionType === 'selected' ? distributeSelectedSuppliers : null,
        },
      });
      if (res.error) throw res.error;
      if (res.data.error) throw new Error(res.data.error);

      toast({ 
        title: '下发成功', 
        description: res.data.message || `已下发给 ${res.data.distributedCount} 家供应商` 
      });
      setShowDistributeDialog(false);
      setDistributeForm({ reportType: '', deadline: '', supplierSelectionType: 'all' });
      setDistributeSelectedSuppliers([]);
      loadData();
    } catch (error: unknown) {
      const err = error as Error;
      toast({ title: '下发失败', description: err.message, variant: 'destructive' });
    } finally {
      setDistributing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />已通过</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />待审核</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />已驳回</Badge>;
      case 'assigned':
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Send className="h-3 w-3 mr-1" />待填写</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredSuppliers = allSuppliers.filter(s =>
    (s.company_name || '').includes(supplierSearch) ||
    (s.unified_social_credit_code || '').includes(supplierSearch) ||
    (s.contact_name || '').includes(supplierSearch)
  );

  const filteredDistributeSuppliers = allSuppliers.filter(s =>
    (s.company_name || '').includes(distributeSupplierSearch) ||
    (s.unified_social_credit_code || '').includes(distributeSupplierSearch) ||
    (s.contact_name || '').includes(distributeSupplierSearch)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">报表管理</h1>
          <p className="text-muted-foreground">平台数据统计分析中心</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">报表管理</h1>
          <p className="text-muted-foreground">平台数据统计分析中心，为决策层提供数据支持</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowDistributeDialog(true)} variant="default">
            <Send className="h-4 w-4 mr-2" />
            下发报表
          </Button>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新数据
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            数据概览
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            报表模板
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            提交审核
          </TabsTrigger>
        </TabsList>

        {/* 数据概览 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">报表模板</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statistics?.templateCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  启用中 {statistics?.activeTemplateCount || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">提交总数</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statistics?.submissionCount || 0}</div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    待审 {statistics?.pendingCount || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">已通过</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{statistics?.approvedCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  驳回 {statistics?.rejectedCount || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">提交率</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statistics?.submissionRate || 0}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  供应商 {statistics?.supplierCount || 0} 家
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 图表 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 提交趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  提交趋势
                </CardTitle>
                <CardDescription>近6个月报表提交情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={statistics?.monthlyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={2} name="提交数" />
                      <Line type="monotone" dataKey="approved" stroke="#22c55e" strokeWidth={2} name="通过数" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 各模板提交情况 */}
            <Card>
              <CardHeader>
                <CardTitle>各模板提交情况</CardTitle>
                <CardDescription>按报表模板统计</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {statistics?.templateStats && statistics.templateStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statistics.templateStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          width={100}
                          tickFormatter={(value) => value.length > 8 ? value.substring(0, 8) + '...' : value}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="approved" stackId="a" fill="#22c55e" name="已通过" />
                        <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="待审核" />
                        <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="已驳回" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      暂无数据
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 报表模板 */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">管理报表模板，设置填报要求</p>
            <Button onClick={() => openTemplateDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              新增模板
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>模板名称</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>截止日期</TableHead>
                    <TableHead>适用范围</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暂无报表模板
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {template.name}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {template.description || '-'}
                        </TableCell>
                        <TableCell>
                          {template.deadline ? format(new Date(template.deadline), 'yyyy-MM-dd') : '-'}
                        </TableCell>
                        <TableCell>
                          {template.supplier_selection_type === 'all' ? (
                            <Badge variant="outline">全部供应商</Badge>
                          ) : (
                            <Badge variant="secondary">
                              指定 {template.target_supplier_ids?.length || 0} 家
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.is_active ? (
                            <Badge className="bg-green-500">启用</Badge>
                          ) : (
                            <Badge variant="secondary">停用</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(template.created_at), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {template.file_url && (
                              <Button variant="ghost" size="icon" asChild>
                                <a href={template.file_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openTemplateDialog(template)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingTemplate(template);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 提交审核 */}
        <TabsContent value="submissions" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-2">
              <Select
                value={submissionFilter.templateId || "all"}
                onValueChange={(v) => setSubmissionFilter(prev => ({ ...prev, templateId: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="选择报表模板" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部模板</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={submissionFilter.status || "all"}
                onValueChange={(v) => setSubmissionFilter(prev => ({ ...prev, status: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">待审核</SelectItem>
                  <SelectItem value="approved">已通过</SelectItem>
                  <SelectItem value="rejected">已驳回</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>报表名称</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>提交时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>审核时间</TableHead>
                    <TableHead>审核意见</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暂无提交记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map(sub => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.template?.name || '-'}</TableCell>
                        <TableCell>
                          <div>
                            <div>{sub.supplier?.company_name || '-'}</div>
                            <div className="text-xs text-muted-foreground">{sub.supplier?.contact_name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sub.submitted_at ? format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm') : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell>
                          {sub.reviewed_at ? format(new Date(sub.reviewed_at), 'yyyy-MM-dd HH:mm') : '-'}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {sub.review_comment || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {sub.file_url && (
                              <Button variant="ghost" size="icon" asChild>
                                <a href={sub.file_url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {sub.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReviewingSubmission(sub);
                                  setReviewForm({ status: 'approved', review_comment: '' });
                                  setShowReviewDialog(true);
                                }}
                              >
                                审核
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 新增/编辑模板对话框 */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '编辑报表模板' : '新增报表模板'}</DialogTitle>
            <DialogDescription>设置报表基本信息和填报要求</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>模板名称 *</Label>
              <Input
                placeholder="请输入报表名称"
                value={templateForm.name}
                onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                placeholder="请输入报表描述"
                value={templateForm.description}
                onChange={e => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>截止日期</Label>
                <Input
                  type="date"
                  value={templateForm.deadline}
                  onChange={e => setTemplateForm(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>模板文件</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="模板文件URL"
                    value={templateForm.file_url}
                    onChange={e => setTemplateForm(prev => ({ ...prev, file_url: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.doc,.docx,.pdf"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>适用供应商范围</Label>
              <Select
                value={templateForm.supplier_selection_type}
                onValueChange={v => setTemplateForm(prev => ({ ...prev, supplier_selection_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部供应商</SelectItem>
                  <SelectItem value="selected">指定供应商</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {templateForm.supplier_selection_type === 'selected' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>已选择供应商 ({selectedSuppliers.length})</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => excelInputRef.current?.click()}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Excel导入
                    </Button>
                    <input
                      ref={excelInputRef}
                      type="file"
                      className="hidden"
                      accept=".xlsx,.xls,.csv,.txt"
                      onChange={handleExcelImport}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSupplierSelectDialog(true)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      手动选择
                    </Button>
                  </div>
                </div>
                {selectedSuppliers.length > 0 && (
                  <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {selectedSuppliers.map(id => {
                        const supplier = allSuppliers.find(s => s.id === id);
                        return supplier ? (
                          <Badge key={id} variant="secondary" className="gap-1">
                            {supplier.company_name}
                            <button
                              type="button"
                              onClick={() => toggleSupplierSelection(id)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Excel文件格式：第一列为供应商名称或统一社会信用代码
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>取消</Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 供应商选择对话框 */}
      <Dialog open={showSupplierSelectDialog} onOpenChange={setShowSupplierSelectDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>选择供应商</DialogTitle>
            <DialogDescription>选择需要填写此报表的供应商</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="搜索供应商名称、信用代码、联系人..."
              value={supplierSearch}
              onChange={e => setSupplierSearch(e.target.value)}
            />
            <div className="border rounded-md max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>供应商名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>联系人</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map(supplier => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer"
                      onClick={() => toggleSupplierSelection(supplier.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedSuppliers.includes(supplier.id)}
                          onCheckedChange={() => toggleSupplierSelection(supplier.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{supplier.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {supplier.supplier_type === 'enterprise' ? '企业' :
                           supplier.supplier_type === 'overseas' ? '海外' : '个人'}
                        </Badge>
                      </TableCell>
                      <TableCell>{supplier.contact_name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierSelectDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除报表模板 "{deletingTemplate?.name}" 吗？此操作将同时删除所有相关的提交记录，且不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteTemplate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 审核对话框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>审核报表</DialogTitle>
            <DialogDescription>
              审核来自 {reviewingSubmission?.supplier?.company_name} 的报表提交
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {reviewingSubmission?.file_url && (
              <div>
                <Label>提交文件</Label>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a href={reviewingSubmission.file_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-1" />
                    查看文件
                  </a>
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label>审核结果</Label>
              <Select
                value={reviewForm.status}
                onValueChange={v => setReviewForm(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">通过</SelectItem>
                  <SelectItem value="rejected">驳回</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>审核意见</Label>
              <Textarea
                placeholder="请输入审核意见"
                value={reviewForm.review_comment}
                onChange={e => setReviewForm(prev => ({ ...prev, review_comment: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>取消</Button>
            <Button onClick={handleReviewSubmission} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 下发报表对话框 */}
      <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              下发报表
            </DialogTitle>
            <DialogDescription>
              选择报表类型并设置截止时间，下发给指定供应商
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* 报表类型选择 */}
            <div className="space-y-3">
              <Label>报表类型 *</Label>
              <Select 
                value={distributeForm.reportType} 
                onValueChange={v => setDistributeForm(prev => ({ ...prev, reportType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择报表类型" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        {type.icon}
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {distributeForm.reportType && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-3">
                    {REPORT_TYPES.find(t => t.id === distributeForm.reportType)?.icon}
                    <div>
                      <p className="font-medium">
                        {REPORT_TYPES.find(t => t.id === distributeForm.reportType)?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {REPORT_TYPES.find(t => t.id === distributeForm.reportType)?.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 截止时间 */}
            <div className="space-y-2">
              <Label>截止时间 *</Label>
              <Input
                type="date"
                value={distributeForm.deadline}
                onChange={e => setDistributeForm(prev => ({ ...prev, deadline: e.target.value }))}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              <p className="text-xs text-muted-foreground">
                供应商需要在截止时间前完成报表提交
              </p>
            </div>

            {/* 目标供应商 */}
            <div className="space-y-2">
              <Label>目标供应商</Label>
              <Select
                value={distributeForm.supplierSelectionType}
                onValueChange={v => setDistributeForm(prev => ({ ...prev, supplierSelectionType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部已审核供应商 ({allSuppliers.length} 家)</SelectItem>
                  <SelectItem value="selected">指定供应商</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distributeForm.supplierSelectionType === 'selected' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>已选择供应商 ({distributeSelectedSuppliers.length})</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDistributeSupplierDialog(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    选择供应商
                  </Button>
                </div>
                {distributeSelectedSuppliers.length > 0 && (
                  <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {distributeSelectedSuppliers.map(id => {
                        const supplier = allSuppliers.find(s => s.id === id);
                        return supplier ? (
                          <Badge key={id} variant="secondary" className="gap-1">
                            {supplier.company_name}
                            <button
                              type="button"
                              onClick={() => toggleDistributeSupplierSelection(id)}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistributeDialog(false)}>取消</Button>
            <Button 
              onClick={handleDistributeReport} 
              disabled={distributing || !distributeForm.reportType || !distributeForm.deadline}
            >
              {distributing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              确认下发
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 下发报表-供应商选择对话框 */}
      <Dialog open={showDistributeSupplierDialog} onOpenChange={setShowDistributeSupplierDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>选择供应商</DialogTitle>
            <DialogDescription>选择需要下发报表的供应商</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="搜索供应商名称、信用代码、联系人..."
              value={distributeSupplierSearch}
              onChange={e => setDistributeSupplierSearch(e.target.value)}
            />
            <div className="border rounded-md max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>供应商名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>联系人</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDistributeSuppliers.map(supplier => (
                    <TableRow
                      key={supplier.id}
                      className="cursor-pointer"
                      onClick={() => toggleDistributeSupplierSelection(supplier.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={distributeSelectedSuppliers.includes(supplier.id)}
                          onCheckedChange={() => toggleDistributeSupplierSelection(supplier.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{supplier.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {supplier.supplier_type === 'enterprise' ? '企业' :
                           supplier.supplier_type === 'overseas' ? '海外' : '个人'}
                        </Badge>
                      </TableCell>
                      <TableCell>{supplier.contact_name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistributeSupplierDialog(false)}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}