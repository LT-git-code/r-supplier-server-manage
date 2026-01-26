import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileCheck, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Qualification {
  id: string;
  name: string;
  certificate_number: string | null;
  issuing_authority: string | null;
  issue_date: string | null;
  expire_date: string | null;
  file_url: string | null;
  status: string;
  qualification_types?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface SupplierQualificationsViewProps {
  supplierId: string;
}

export function SupplierQualificationsView({ supplierId }: SupplierQualificationsViewProps) {
  const [loading, setLoading] = useState(true);
  const [qualifications, setQualifications] = useState<Qualification[]>([]);

  useEffect(() => {
    loadQualifications();
  }, [supplierId]);

  const loadQualifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('qualifications')
        .select('*, qualification_types(id, name, code)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQualifications(data || []);
    } catch (error) {
      console.error('Failed to load qualifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />已通过</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />待审核</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />已拒绝</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (qualifications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>暂无资质证书</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {qualifications.map(q => (
        <div key={q.id} className="p-3 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium">{q.name}</span>
              {q.qualification_types && (
                <Badge variant="secondary" className="text-xs">
                  {q.qualification_types.name}
                </Badge>
              )}
            </div>
            {getStatusBadge(q.status)}
          </div>
          <div className="text-sm text-muted-foreground mt-2 grid grid-cols-2 gap-2">
            <div>证书编号：{q.certificate_number || '-'}</div>
            <div>发证机关：{q.issuing_authority || '-'}</div>
            <div>发证日期：{q.issue_date || '-'}</div>
            <div>有效期至：{q.expire_date || '长期有效'}</div>
          </div>
          {q.file_url && (
            <div className="mt-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(q.file_url!, '_blank')}
              >
                <Download className="h-4 w-4 mr-1" />
                下载附件
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
