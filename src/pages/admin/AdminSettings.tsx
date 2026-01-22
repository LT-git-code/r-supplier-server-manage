import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, Menu } from 'lucide-react';
import AdminUsers from './AdminUsers';
import DeptRoles from '@/pages/dept/DeptRoles';
import MenuManagement from '@/components/admin/MenuManagement';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-muted-foreground">管理系统用户和权限配置</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            用户管理
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            后台角色管理
          </TabsTrigger>
          <TabsTrigger value="menus" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            菜单管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <AdminUsers embedded />
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <DeptRoles embedded />
        </TabsContent>

        <TabsContent value="menus" className="mt-4">
          <MenuManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
