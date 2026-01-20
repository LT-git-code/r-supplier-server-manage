import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SetupAdmin from "./pages/SetupAdmin";
import AdminUsers from "./pages/admin/AdminUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* 公开路由 */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup-admin" element={<SetupAdmin />} />
            
            {/* 需要认证的路由 */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* 供应商路由 */}
              <Route path="/supplier/info" element={<div className="p-4">企业信息（开发中）</div>} />
              <Route path="/supplier/products" element={<div className="p-4">产品管理（开发中）</div>} />
              <Route path="/supplier/qualifications" element={<div className="p-4">资质管理（开发中）</div>} />
              <Route path="/supplier/reports" element={<div className="p-4">报表填写（开发中）</div>} />
              <Route path="/supplier/complaints" element={<div className="p-4">投诉建议（开发中）</div>} />
              
              {/* 部门路由 */}
              <Route path="/dept/suppliers" element={<div className="p-4">供应商库（开发中）</div>} />
              <Route path="/dept/products" element={<div className="p-4">产品搜索（开发中）</div>} />
              
              {/* 管理员路由 */}
              <Route path="/admin/dashboard" element={<div className="p-4">数据看板（开发中）</div>} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/audit" element={<div className="p-4">供应商审核（开发中）</div>} />
              <Route path="/admin/suppliers" element={<div className="p-4">供应商管理（开发中）</div>} />
              <Route path="/admin/products" element={<div className="p-4">产品管理（开发中）</div>} />
              <Route path="/admin/reports" element={<div className="p-4">报表管理（开发中）</div>} />
              <Route path="/admin/announcements" element={<div className="p-4">公告管理（开发中）</div>} />
              <Route path="/admin/settings" element={<div className="p-4">系统设置（开发中）</div>} />
              
              {/* 个人设置 */}
              <Route path="/profile" element={<div className="p-4">个人设置（开发中）</div>} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
