import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, AuthUser, UserProfile } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  authUser: AuthUser | null;
  loading: boolean;
  currentRole: AppRole | null;
  setCurrentRole: (role: AppRole) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRoleState] = useState<AppRole | null>(null);
  const { toast } = useToast();

  const fetchUserData = useCallback(async (userId: string, email: string): Promise<AuthUser | null> => {
    try {
      // 获取用户档案
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // 获取用户角色
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const userRoles = (roles?.map(r => r.role) as AppRole[]) || [];
      
      const authUserData: AuthUser = {
        id: userId,
        email,
        profile: profile as UserProfile | null,
        roles: userRoles,
        currentRole: userRoles.length > 0 ? userRoles[0] : null,
        isSupplier: userRoles.includes('supplier'),
        isDepartment: userRoles.includes('department'),
        isAdmin: userRoles.includes('admin'),
      };

      return authUserData;
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      return null;
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (user) {
      const userData = await fetchUserData(user.id, user.email || '');
      setAuthUser(userData);
      
      // 恢复保存的当前角色，或使用第一个可用角色
      const savedRole = localStorage.getItem('srm_current_role') as AppRole | null;
      if (savedRole && userData?.roles.includes(savedRole)) {
        setCurrentRoleState(savedRole);
      } else if (userData?.roles.length) {
        setCurrentRoleState(userData.roles[0]);
      }
    }
  }, [user, fetchUserData]);

  const assignPendingRole = useCallback(async (userId: string) => {
    const pendingRole = localStorage.getItem('pending_role');
    if (!pendingRole) return;

    try {
      // 检查用户是否已有角色
      const { data: existingRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (existingRoles && existingRoles.length > 0) {
        // 用户已有角色，清除pending
        localStorage.removeItem('pending_role');
        localStorage.removeItem('pending_dept_permissions');
        return;
      }

      // 分配角色
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: pendingRole as 'supplier' | 'department' | 'admin' });

      if (!error) {
        console.log('Auto-assigned role:', pendingRole);
        
        // 部门人员注册后分配默认菜单权限（供应商管理和产品管理）
        if (pendingRole === 'department' && localStorage.getItem('pending_dept_permissions')) {
          try {
            // 调用边缘函数分配默认权限
            await supabase.functions.invoke('dept-api', {
              body: { action: 'assign_default_permissions', userId },
            });
            console.log('Assigned default department permissions');
          } catch (permError) {
            console.error('Failed to assign department permissions:', permError);
          }
        }
      } else {
        console.error('Failed to assign role:', error);
      }
    } catch (e) {
      console.error('Error assigning pending role:', e);
    } finally {
      localStorage.removeItem('pending_role');
      localStorage.removeItem('pending_dept_permissions');
    }
  }, []);

  useEffect(() => {
    // 首先设置认证状态监听器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // 延迟获取用户数据，避免死锁
        if (session?.user) {
          setTimeout(async () => {
            // 检查是否需要分配待定角色
            await assignPendingRole(session.user.id);
            
            const userData = await fetchUserData(session.user.id, session.user.email || '');
            setAuthUser(userData);
            
            const savedRole = localStorage.getItem('srm_current_role') as AppRole | null;
            if (savedRole && userData?.roles.includes(savedRole)) {
              setCurrentRoleState(savedRole);
            } else if (userData?.roles.length) {
              setCurrentRoleState(userData.roles[0]);
            }
            
            setLoading(false);
          }, 0);
        } else {
          setAuthUser(null);
          setCurrentRoleState(null);
          setLoading(false);
        }
      }
    );

    // 然后检查现有会话
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // 检查是否需要分配待定角色
        await assignPendingRole(session.user.id);
        
        const userData = await fetchUserData(session.user.id, session.user.email || '');
        setAuthUser(userData);
        
        const savedRole = localStorage.getItem('srm_current_role') as AppRole | null;
        if (savedRole && userData?.roles.includes(savedRole)) {
          setCurrentRoleState(savedRole);
        } else if (userData?.roles.length) {
          setCurrentRoleState(userData.roles[0]);
        }
        
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData, assignPendingRole]);

  const setCurrentRole = useCallback((role: AppRole) => {
    if (authUser?.roles.includes(role)) {
      setCurrentRoleState(role);
      localStorage.setItem('srm_current_role', role);
    }
  }, [authUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('srm_current_role');
      setAuthUser(null);
      setCurrentRoleState(null);
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        variant: 'destructive',
        title: '登出失败',
        description: '请稍后重试',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        authUser,
        loading,
        currentRole,
        setCurrentRole,
        signIn,
        signUp,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
