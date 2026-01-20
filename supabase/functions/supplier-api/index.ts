import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 验证用户身份
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 检查是否是供应商
    const { data: isSupplier } = await supabase.rpc("is_supplier", { _user_id: user.id });
    if (!isSupplier) {
      return new Response(JSON.stringify({ error: "Not a supplier" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    // 获取供应商ID
    const { data: supplierId } = await supabase.rpc("get_user_supplier_id", { _user_id: user.id });

    switch (action) {
      case "get_dashboard_stats": {
        // 获取工作台统计数据
        const [productsRes, qualificationsRes, reportsRes, supplierRes] = await Promise.all([
          supabase.from("products").select("id", { count: "exact" }).eq("supplier_id", supplierId),
          supabase.from("qualifications").select("id, status", { count: "exact" }).eq("supplier_id", supplierId),
          supabase.from("report_submissions").select("id, status", { count: "exact" }).eq("supplier_id", supplierId),
          supabase.from("suppliers").select("status").eq("id", supplierId).single(),
        ]);

        const productCount = productsRes.count || 0;
        const qualifications = qualificationsRes.data || [];
        const approvedQualifications = qualifications.filter(q => q.status === 'approved').length;
        const pendingQualifications = qualifications.filter(q => q.status === 'pending').length;
        const reports = reportsRes.data || [];
        const pendingReports = reports.filter(r => r.status === 'pending').length;
        const supplierStatus = supplierRes.data?.status || 'pending';

        return new Response(JSON.stringify({
          productCount,
          approvedQualifications,
          pendingQualifications,
          pendingReports,
          supplierStatus,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_announcements": {
        const { limit = 5 } = params;
        const { data, error } = await supabase
          .from("announcements")
          .select("id, title, content, published_at, created_at")
          .eq("is_published", true)
          .or("target_roles.is.null,target_roles.cs.{supplier}")
          .order("published_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_recent_products": {
        const { limit = 10 } = params;
        const { data, error } = await supabase
          .from("products")
          .select("id, name, code, status, created_at, updated_at")
          .eq("supplier_id", supplierId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_recent_audits": {
        const { limit = 10 } = params;
        const { data, error } = await supabase
          .from("audit_records")
          .select("id, audit_type, target_table, status, review_comment, created_at, reviewed_at")
          .eq("submitted_by", user.id)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_supplier_info": {
        const { data, error } = await supabase
          .from("suppliers")
          .select("*")
          .eq("id", supplierId)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_supplier_info": {
        const { info } = params;
        const { error } = await supabase
          .from("suppliers")
          .update(info)
          .eq("id", supplierId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_contacts": {
        const { data, error } = await supabase
          .from("supplier_contacts")
          .select("*")
          .eq("supplier_id", supplierId)
          .order("is_primary", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "add_contact": {
        const { contact } = params;
        const { data, error } = await supabase
          .from("supplier_contacts")
          .insert({ ...contact, supplier_id: supplierId })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_contact": {
        const { id, contact } = params;
        const { error } = await supabase
          .from("supplier_contacts")
          .update(contact)
          .eq("id", id)
          .eq("supplier_id", supplierId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_contact": {
        const { id } = params;
        const { error } = await supabase
          .from("supplier_contacts")
          .delete()
          .eq("id", id)
          .eq("supplier_id", supplierId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 产品管理
      case "get_products": {
        const { page = 1, pageSize = 10, search = "" } = params;
        const offset = (page - 1) * pageSize;

        let query = supabase
          .from("products")
          .select("*, product_categories(name)", { count: "exact" })
          .eq("supplier_id", supplierId);

        if (search) {
          query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
        }

        const { data, count, error } = await query
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        return new Response(JSON.stringify({ data, total: count }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_product": {
        const { id } = params;
        const { data, error } = await supabase
          .from("products")
          .select("*, product_categories(id, name)")
          .eq("id", id)
          .eq("supplier_id", supplierId)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_product": {
        const { product } = params;
        const { data, error } = await supabase
          .from("products")
          .insert({ ...product, supplier_id: supplierId })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_product": {
        const { id, product } = params;
        const { error } = await supabase
          .from("products")
          .update(product)
          .eq("id", id)
          .eq("supplier_id", supplierId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_product": {
        const { id } = params;
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", id)
          .eq("supplier_id", supplierId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_product_categories": {
        const { data, error } = await supabase
          .from("product_categories")
          .select("id, name, code, level, parent_id")
          .eq("is_active", true)
          .order("sort_order");

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 资质管理
      case "get_qualifications": {
        const { data, error } = await supabase
          .from("qualifications")
          .select("*, qualification_types(id, name, code)")
          .eq("supplier_id", supplierId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_qualification": {
        const { id } = params;
        const { data, error } = await supabase
          .from("qualifications")
          .select("*, qualification_types(id, name, code)")
          .eq("id", id)
          .eq("supplier_id", supplierId)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_qualification": {
        const { qualification } = params;
        const { data, error } = await supabase
          .from("qualifications")
          .insert({ ...qualification, supplier_id: supplierId, status: 'pending' })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_qualification": {
        const { id, qualification } = params;
        // 如果资质已审核通过，重新提交需要重置状态
        const { error } = await supabase
          .from("qualifications")
          .update({ ...qualification, status: 'pending' })
          .eq("id", id)
          .eq("supplier_id", supplierId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_qualification": {
        const { id } = params;
        const { error } = await supabase
          .from("qualifications")
          .delete()
          .eq("id", id)
          .eq("supplier_id", supplierId);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_qualification_types": {
        const { data, error } = await supabase
          .from("qualification_types")
          .select("id, name, code, is_required, description")
          .eq("is_active", true);

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 报表管理
      case "get_report_templates": {
        const { data, error } = await supabase
          .from("report_templates")
          .select("*")
          .eq("is_active", true)
          .or("target_roles.is.null,target_roles.cs.{supplier}")
          .order("deadline");

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_report_submissions": {
        const { data, error } = await supabase
          .from("report_submissions")
          .select("*, report_templates(id, name, deadline, description)")
          .eq("supplier_id", supplierId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "submit_report": {
        const { templateId, fileUrl } = params;
        const { data, error } = await supabase
          .from("report_submissions")
          .insert({
            supplier_id: supplierId,
            template_id: templateId,
            file_url: fileUrl,
            status: 'pending',
            submitted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
