import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Plus, 
  MoreHorizontal, 
  UserPlus, 
  Building2, 
  Shield, 
  Trash2,
  RefreshCw,
  Search,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
  roles: string[];
  departments: {
    id: string;
    name: string;
    is_manager: boolean;
  }[];
}

interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
}

const terminalLabels: Record<string, string> = {
  supplier: '供应商',
  department: '部门',
  admin: '管理员',
};

const terminalColors: Record<string, string> = {
  supplier: 'bg-info/10 text-info border-info/30',
  department: 'bg-warning/10 text-warning border-warning/30',
  admin: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function AdminUsers() {
  const { authUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // 创建用户弹窗
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRoles, setNewUserRoles] = useState<string[]>([]);
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [creating, setCreating] = useState(false);

  // 编辑角色弹窗
  const [editRolesDialogOpen, setEditRolesDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // 创建部门弹窗
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [creatingDept, setCreatingDept] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [usersRes, deptsRes] = await Promise.all([
        supabase.functions.invoke('admin-api', { body: { action: 'list_users' } }),
        supabase.functions.invoke('admin-api', { body: { action: 'list_departments' } }),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (deptsRes.error) throw deptsRes.error;

      setUsers(usersRes.data.users || []);
      setDepartments(deptsRes.data.departments || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '加载失败',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({ variant: 'destructive', title: '请填写邮箱和密码' });
      return;
    }

    try {
      setCreating(true);
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'create_user',
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserName,
          roles: newUserRoles,
          departmentId: newUserDepartment || null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: '用户创建成功' });
      setCreateDialogOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRoles([]);
      setNewUserDepartment('');
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '创建失败',
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRoles = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);
      const { error } = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'update_user_roles',
          userId: editingUser.id,
          roles: editRoles,
        },
      });

      if (error) throw error;

      toast({ title: '终端更新成功' });
      setEditRolesDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '更新失败',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除此用户吗？此操作不可恢复。')) return;

    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'delete_user', userId },
      });

      if (error) throw error;

      toast({ title: '用户已删除' });
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: error.message,
      });
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDeptName) {
      toast({ variant: 'destructive', title: '请填写部门名称' });
      return;
    }

    try {
      setCreatingDept(true);
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: {
          action: 'create_department',
          name: newDeptName,
          code: newDeptCode || null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: '部门创建成功' });
      setDeptDialogOpen(false);
      setNewDeptName('');
      setNewDeptCode('');
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '创建失败',
        description: error.message,
      });
    } finally {
      setCreatingDept(false);
    }
  };

  const openEditRoles = (user: UserData) => {
    setEditingUser(user);
    setEditRoles([...user.roles]);
    setEditRolesDialogOpen(true);
  };

  const toggleRole = (role: string, checked: boolean) => {
    if (checked) {
      setEditRoles([...editRoles, role]);
    } else {
      setEditRoles(editRoles.filter(r => r !== role));
    }
  };

  const toggleNewUserRole = (role: string, checked: boolean) => {
    if (checked) {
      setNewUserRoles([...newUserRoles, role]);
    } else {
      setNewUserRoles(newUserRoles.filter(r => r !== role));
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户账号和权限</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                新建部门
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建部门</DialogTitle>
                <DialogDescription>创建一个新的部门</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>部门名称 *</Label>
                  <Input
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    placeholder="如：采购部"
                  />
                </div>
                <div className="space-y-2">
                  <Label>部门代码</Label>
                  <Input
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    placeholder="如：PURCHASE"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>取消</Button>
                <Button onClick={handleCreateDepartment} disabled={creatingDept}>
                  {creatingDept && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                新建用户
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>新建用户</DialogTitle>
                <DialogDescription>创建新的系统用户账号</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>邮箱 *</Label>
                  <Input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>密码 *</Label>
                  <Input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="至少6个字符"
                  />
                </div>
                <div className="space-y-2">
                  <Label>姓名</Label>
                  <Input
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="用户姓名"
                  />
                </div>
                <div className="space-y-2">
                  <Label>终端</Label>
                  <div className="flex flex-wrap gap-4">
                    {['supplier', 'department', 'admin'].map(terminal => (
                      <div key={terminal} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-terminal-${terminal}`}
                          checked={newUserRoles.includes(terminal)}
                          onCheckedChange={(checked) => toggleNewUserRole(terminal, !!checked)}
                        />
                        <label htmlFor={`new-terminal-${terminal}`} className="text-sm">
                          {terminalLabels[terminal]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {newUserRoles.includes('department') && (
                  <div className="space-y-2">
                    <Label>所属部门</Label>
                    <Select value={newUserDepartment} onValueChange={setNewUserDepartment}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择部门" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>取消</Button>
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  创建用户
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总用户数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">管理员</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.roles.includes('admin')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">部门人员</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.roles.includes('department')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">供应商</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.roles.includes('supplier')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索邮箱或姓名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="筛选终端" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部终端</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="department">部门</SelectItem>
                <SelectItem value="supplier">供应商</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>终端</TableHead>
                  <TableHead>部门</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>最后登录</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.profile?.full_name || '未设置姓名'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length === 0 ? (
                            <Badge variant="outline" className="text-muted-foreground">无终端</Badge>
                          ) : (
                            user.roles.map(terminal => (
                              <Badge key={terminal} variant="outline" className={terminalColors[terminal]}>
                                {terminalLabels[terminal]}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.departments.length > 0 ? (
                          user.departments.map(d => d.name).join(', ')
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString('zh-CN')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditRoles(user)}>
                              <Shield className="h-4 w-4 mr-2" />
                              编辑终端
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-destructive"
                              disabled={user.id === authUser?.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除用户
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 编辑终端弹窗 */}
      <Dialog open={editRolesDialogOpen} onOpenChange={setEditRolesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户终端</DialogTitle>
            <DialogDescription>
              {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {['supplier', 'department', 'admin'].map(terminal => (
              <div key={terminal} className="flex items-center space-x-3">
                <Checkbox
                  id={`edit-terminal-${terminal}`}
                  checked={editRoles.includes(terminal)}
                  onCheckedChange={(checked) => toggleRole(terminal, !!checked)}
                />
                <label htmlFor={`edit-terminal-${terminal}`} className="flex-1">
                  <div className="font-medium">{terminalLabels[terminal]}</div>
                  <div className="text-sm text-muted-foreground">
                    {terminal === 'supplier' && '可以管理自己的供应商信息、产品和资质'}
                    {terminal === 'department' && '可以查看和管理本部门的供应商库'}
                    {terminal === 'admin' && '拥有系统的完整管理权限'}
                  </div>
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRolesDialogOpen(false)}>取消</Button>
            <Button onClick={handleUpdateRoles} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
