import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: '未授权' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: '认证失败' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 验证用户角色
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes('admin');
    const isDept = roles.includes('department');

    const { action, ...params } = await req.json();
    console.log('Roles API action:', action, params);

    // get_user_menus 不需要角色验证，允许所有已认证用户调用
    if (action !== 'get_user_menus' && !isAdmin && !isDept) {
      return new Response(
        JSON.stringify({ error: '无权限执行此操作' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'get_roles_data': {
        const { terminal } = params;
        
        // 获取角色列表
        const { data: backendRoles, error: rolesError } = await supabaseAdmin
          .from('backend_roles')
          .select('*')
          .order('name');

        if (rolesError) throw rolesError;

        // 获取菜单权限
        const { data: menuPermissions, error: menusError } = await supabaseAdmin
          .from('menu_permissions')
          .select('*')
          .eq('terminal', terminal)
          .eq('is_active', true)
          .order('sort_order');

        if (menusError) throw menusError;

        // 获取角色-菜单关联
        const { data: roleMenus } = await supabaseAdmin
          .from('role_menu_permissions')
          .select('role_id, menu_id');

        // 为每个角色添加 menu_permissions
        const rolesWithMenus = backendRoles?.map(role => ({
          ...role,
          menu_permissions: roleMenus?.filter(rm => rm.role_id === role.id).map(rm => rm.menu_id) || []
        }));

        // 获取用户列表（根据终端类型筛选）
        // 支持三个终端：admin, department, supplier
        const targetRole = terminal === 'admin' ? 'admin' : (terminal === 'supplier' ? 'supplier' : 'department');
        const { data: targetUsers } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('role', targetRole);

        const targetUserIds = targetUsers?.map(u => u.user_id) || [];

        let users: any[] = [];
        if (targetUserIds.length > 0) {
          const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
          const { data: profiles } = await supabaseAdmin.from('profiles').select('*');
          const { data: userBackendRoles } = await supabaseAdmin.from('user_backend_roles').select('*');

          users = authUsers?.users
            .filter(u => targetUserIds.includes(u.id))
            .map(u => ({
              id: u.id,
              email: u.email,
              profile: profiles?.find(p => p.user_id === u.id) || null,
              backend_roles: userBackendRoles?.filter(ubr => ubr.user_id === u.id).map(ubr => ubr.role_id) || []
            })) || [];
        }

        return new Response(
          JSON.stringify({ 
            roles: rolesWithMenus || [], 
            menus: menuPermissions || [],
            users 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_all_menus': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '只有管理员可以管理菜单' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { terminal } = params;
        
        const { data: allMenus, error: menuError } = await supabaseAdmin
          .from('menu_permissions')
          .select('*')
          .eq('terminal', terminal)
          .order('sort_order');

        if (menuError) throw menuError;

        return new Response(
          JSON.stringify({ menus: allMenus || [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_menu': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '只有管理员可以创建菜单' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { menu } = params;
        
        const { data: newMenu, error: createError } = await supabaseAdmin
          .from('menu_permissions')
          .insert({
            menu_key: menu.menu_key,
            menu_name: menu.menu_name,
            menu_path: menu.menu_path,
            terminal: menu.terminal,
            sort_order: menu.sort_order || 0,
            icon: menu.icon || null,
            parent_key: menu.parent_key || null,
            is_active: true,
          })
          .select()
          .single();

        if (createError) throw createError;

        return new Response(
          JSON.stringify({ success: true, menu: newMenu }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_menu': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '只有管理员可以更新菜单' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { menuId, menu } = params;
        
        const { error: updateError } = await supabaseAdmin
          .from('menu_permissions')
          .update({
            menu_key: menu.menu_key,
            menu_name: menu.menu_name,
            menu_path: menu.menu_path,
            terminal: menu.terminal,
            sort_order: menu.sort_order || 0,
            icon: menu.icon || null,
            parent_key: menu.parent_key || null,
          })
          .eq('id', menuId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle_menu_status': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '只有管理员可以修改菜单状态' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { menuId, isActive } = params;
        
        const { error: updateError } = await supabaseAdmin
          .from('menu_permissions')
          .update({ is_active: isActive })
          .eq('id', menuId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_menu': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '只有管理员可以删除菜单' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { menuId } = params;

        // 先检查菜单是否已禁用
        const { data: menuData } = await supabaseAdmin
          .from('menu_permissions')
          .select('is_active')
          .eq('id', menuId)
          .single();

        if (menuData?.is_active) {
          return new Response(
            JSON.stringify({ error: '只能删除已禁用的菜单' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 删除相关的角色-菜单关联
        await supabaseAdmin
          .from('role_menu_permissions')
          .delete()
          .eq('menu_id', menuId);
        
        const { error: deleteError } = await supabaseAdmin
          .from('menu_permissions')
          .delete()
          .eq('id', menuId);

        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_role': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '只有管理员可以创建角色' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { role } = params;
        
        const { data: newRole, error: createError } = await supabaseAdmin
          .from('backend_roles')
          .insert({
            name: role.name,
            code: role.code,
            description: role.description,
          })
          .select()
          .single();

        if (createError) throw createError;

        // 添加菜单权限关联
        if (role.menu_permissions && role.menu_permissions.length > 0) {
          const menuInserts = role.menu_permissions.map((menuId: string) => ({
            role_id: newRole.id,
            menu_id: menuId,
          }));
          await supabaseAdmin.from('role_menu_permissions').insert(menuInserts);
        }

        return new Response(
          JSON.stringify({ success: true, role: newRole }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update_role': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '只有管理员可以更新角色' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { roleId, role } = params;
        
        const { error: updateError } = await supabaseAdmin
          .from('backend_roles')
          .update({
            name: role.name,
            code: role.code,
            description: role.description,
          })
          .eq('id', roleId);

        if (updateError) throw updateError;

        // 更新菜单权限关联
        await supabaseAdmin
          .from('role_menu_permissions')
          .delete()
          .eq('role_id', roleId);

        if (role.menu_permissions && role.menu_permissions.length > 0) {
          const menuInserts = role.menu_permissions.map((menuId: string) => ({
            role_id: roleId,
            menu_id: menuId,
          }));
          await supabaseAdmin.from('role_menu_permissions').insert(menuInserts);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_role': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '只有管理员可以删除角色' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { roleId } = params;
        
        const { error: deleteError } = await supabaseAdmin
          .from('backend_roles')
          .delete()
          .eq('id', roleId);

        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'assign_user_roles': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '只有管理员可以分配角色' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { userId, roleIds } = params;
        
        // 删除现有后台角色
        await supabaseAdmin
          .from('user_backend_roles')
          .delete()
          .eq('user_id', userId);

        // 添加新角色
        if (roleIds && roleIds.length > 0) {
          const roleInserts = roleIds.map((roleId: string) => ({
            user_id: userId,
            role_id: roleId,
          }));
          await supabaseAdmin.from('user_backend_roles').insert(roleInserts);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_user_menus': {
        const { terminal } = params;
        
        // 获取该终端的所有基础菜单
        const { data: allMenus, error: menuError } = await supabaseAdmin
          .from('menu_permissions')
          .select('id, menu_key, menu_name, menu_path, parent_key, sort_order, icon')
          .eq('terminal', terminal)
          .eq('is_active', true)
          .order('sort_order');

        if (menuError) throw menuError;

        // 管理员可以访问所有菜单，并且可以管理所有终端的权限
        if (isAdmin) {
          const menusWithoutId = allMenus?.map(({ id, ...rest }) => rest) || [];
          return new Response(
            JSON.stringify({ menus: menusWithoutId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 获取用户的后台角色
        const { data: userBackendRoles } = await supabaseAdmin
          .from('user_backend_roles')
          .select('role_id')
          .eq('user_id', user.id);

        const roleIds = userBackendRoles?.map(r => r.role_id) || [];

        // 如果用户没有分配后台角色，返回所有基础菜单（不受角色限制）
        if (roleIds.length === 0) {
          const menusWithoutId = allMenus?.map(({ id, ...rest }) => rest) || [];
          return new Response(
            JSON.stringify({ menus: menusWithoutId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 获取角色对应的菜单权限
        const { data: roleMenus } = await supabaseAdmin
          .from('role_menu_permissions')
          .select('menu_id')
          .in('role_id', roleIds);

        const allowedMenuIds = new Set(roleMenus?.map(rm => rm.menu_id) || []);

        // 如果角色没有配置任何菜单权限，返回所有基础菜单
        if (allowedMenuIds.size === 0) {
          const menusWithoutId = allMenus?.map(({ id, ...rest }) => rest) || [];
          return new Response(
            JSON.stringify({ menus: menusWithoutId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 根据角色权限过滤菜单
        const filteredMenus = allMenus
          ?.filter(menu => allowedMenuIds.has(menu.id))
          .map(({ id, ...rest }) => rest) || [];

        return new Response(
          JSON.stringify({ menus: filteredMenus }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: '未知操作' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Roles API error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
