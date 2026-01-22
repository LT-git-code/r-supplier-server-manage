import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, Edit, Trash2, FolderOpen, Building2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Supplier {
  id: string;
  company_name: string;
  supplier_type: string;
}

interface ProjectSupplier {
  id: string;
  contract_amount: number | null;
  supplier: Supplier;
}

interface Department {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  department: Department | null;
  project_suppliers: ProjectSupplier[];
  created_at: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: '进行中', variant: 'default' },
  completed: { label: '已完成', variant: 'secondary' },
  pending: { label: '待启动', variant: 'outline' },
  cancelled: { label: '已取消', variant: 'destructive' },
};

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [approvedSuppliers, setApprovedSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: '',
    budget: '',
    department_id: '',
    supplier_ids: [] as string[],
  });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get_projects' },
      });
      if (error) throw error;
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedSuppliers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get_approved_suppliers' },
      });
      if (error) throw error;
      setApprovedSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'list_departments' },
      });
      if (error) throw error;
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchApprovedSuppliers();
    fetchDepartments();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      status: 'active',
      start_date: '',
      end_date: '',
      budget: '',
      department_id: '',
      supplier_ids: [],
    });
    setEditingProject(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      code: project.code || '',
      description: project.description || '',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      budget: project.budget?.toString() || '',
      department_id: project.department?.id || '',
      supplier_ids: project.project_suppliers.map(ps => ps.supplier.id),
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('请输入项目名称');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code || null,
        description: formData.description || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        department_id: formData.department_id || null,
        supplier_ids: formData.supplier_ids,
      };

      if (editingProject) {
        const { error } = await supabase.functions.invoke('admin-api', {
          body: { action: 'update_project', projectId: editingProject.id, ...payload },
        });
        if (error) throw error;
        toast.success('项目更新成功');
      } else {
        const { error } = await supabase.functions.invoke('admin-api', {
          body: { action: 'create_project', ...payload },
        });
        if (error) throw error;
        toast.success('项目创建成功');
      }

      setShowDialog(false);
      resetForm();
      fetchProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error(editingProject ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!confirm(`确定删除项目「${project.name}」吗？`)) return;

    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'delete_project', projectId: project.id },
      });
      if (error) throw error;
      toast.success('删除成功');
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('删除失败');
    }
  };

  const toggleSupplier = (supplierId: string) => {
    setFormData(prev => ({
      ...prev,
      supplier_ids: prev.supplier_ids.includes(supplierId)
        ? prev.supplier_ids.filter(id => id !== supplierId)
        : [...prev.supplier_ids, supplierId],
    }));
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase()) ||
    p.department?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">项目管理</h1>
          <p className="text-muted-foreground">管理平台所有项目</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          新建项目
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            项目列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索项目名称、编码或部门..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchProjects}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>项目编码</TableHead>
                  <TableHead>所属部门</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>起止时间</TableHead>
                  <TableHead>预算</TableHead>
                  <TableHead>关联供应商</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      暂无项目数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.code || '-'}</TableCell>
                      <TableCell>{project.department?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[project.status]?.variant || 'default'}>
                          {statusConfig[project.status]?.label || project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {project.start_date && project.end_date
                          ? `${format(new Date(project.start_date), 'yyyy/MM/dd')} - ${format(new Date(project.end_date), 'yyyy/MM/dd')}`
                          : project.start_date
                          ? `${format(new Date(project.start_date), 'yyyy/MM/dd')} -`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {project.budget ? `¥${project.budget.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        {project.project_suppliers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {project.project_suppliers.slice(0, 2).map(ps => (
                              <Badge key={ps.id} variant="outline" className="text-xs">
                                {ps.supplier.company_name}
                              </Badge>
                            ))}
                            {project.project_suppliers.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{project.project_suppliers.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(project)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(project)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProject ? '编辑项目' : '新建项目'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>项目名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入项目名称"
                />
              </div>
              <div className="space-y-2">
                <Label>项目编码</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="输入项目编码"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>项目描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="输入项目描述"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>所属部门</Label>
                <Select 
                  value={formData.department_id} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, department_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择部门" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待启动</SelectItem>
                    <SelectItem value="active">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>结束日期</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>预算金额</Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                  placeholder="输入预算金额"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                关联供应商（已审核）
              </Label>
              {approvedSuppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无已审核的供应商</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {approvedSuppliers.map((supplier) => (
                    <div key={supplier.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={supplier.id}
                        checked={formData.supplier_ids.includes(supplier.id)}
                        onCheckedChange={() => toggleSupplier(supplier.id)}
                      />
                      <label htmlFor={supplier.id} className="text-sm cursor-pointer">
                        {supplier.company_name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
