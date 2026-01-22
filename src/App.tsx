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
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAudit from "./pages/admin/AdminAudit";
import AdminSuppliers from "./pages/admin/AdminSuppliers";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminQualificationAudit from "./pages/admin/AdminQualificationAudit";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminServices from "./pages/admin/AdminServices";
import AdminReports from "./pages/admin/AdminReports";
import SeedTestData from "./pages/admin/SeedTestData";
import SupplierRegister from "./pages/supplier/Register";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierInfo from "./pages/supplier/SupplierInfo";
import SupplierProducts from "./pages/supplier/SupplierProducts";
import SupplierQualifications from "./pages/supplier/SupplierQualifications";
import SupplierReports from "./pages/supplier/SupplierReports";
import DeptSuppliers from "./pages/dept/DeptSuppliers";
import DeptProducts from "./pages/dept/DeptProducts";
import DeptProjects from "./pages/dept/DeptProjects";
import DeptServices from "./pages/dept/DeptServices";
import DeptRoles from "./pages/dept/DeptRoles";
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
            <Route path="/supplier/register" element={<SupplierRegister />} />
            
            {/* 需要认证的路由 */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* 供应商路由 */}
              <Route path="/supplier/info" element={<SupplierInfo />} />
              <Route path="/supplier/products" element={<SupplierProducts />} />
              <Route path="/supplier/qualifications" element={<SupplierQualifications />} />
              <Route path="/supplier/reports" element={<SupplierReports />} />
              
              {/* 部门路由 */}
              <Route path="/dept/suppliers" element={<DeptSuppliers />} />
              <Route path="/dept/products" element={<DeptProducts />} />
              <Route path="/dept/projects" element={<DeptProjects />} />
              <Route path="/dept/services" element={<DeptServices />} />
              <Route path="/dept/roles" element={<DeptRoles />} />
              
              {/* 管理员路由 */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/audit" element={<AdminAudit />} />
              <Route path="/admin/suppliers" element={<AdminSuppliers />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/qualification-audit" element={<AdminQualificationAudit />} />
              <Route path="/admin/projects" element={<AdminProjects />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/announcements" element={<div className="p-4">公告管理（开发中）</div>} />
              <Route path="/admin/roles" element={<DeptRoles />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/seed-data" element={<SeedTestData />} />
              
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
