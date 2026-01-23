import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useSupplierApi } from '@/hooks/useSupplierApi';
import { useDeptApi } from '@/hooks/useDeptApi';
import { useAdminDashboardApi } from '@/hooks/useAdminDashboardApi';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  published_at: string;
  created_at: string;
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentRole } = useAuth();

  const supplierApi = useSupplierApi();
  const deptApi = useDeptApi();
  const adminApi = useAdminDashboardApi();

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        let data: Announcement[] = [];

        // 根据当前角色使用不同的API
        if (currentRole === 'supplier') {
          data = await supplierApi.getAnnouncements(100);
        } else if (currentRole === 'department') {
          data = await deptApi.getAnnouncements(100);
        } else if (currentRole === 'admin') {
          data = await adminApi.getAnnouncements(100);
        }

        setAnnouncements(data || []);
      } catch (error) {
        toast({
          title: '获取公告失败',
          description: error instanceof Error ? error.message : '未知错误',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (currentRole) {
      fetchAnnouncements();
    }
  }, [currentRole]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          公告中心
        </h1>
        <p className="text-muted-foreground">查看平台发布的所有公告通知</p>
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无公告</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map(announcement => (
            <Card key={announcement.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  <span className="text-sm text-muted-foreground whitespace-nowrap ml-4">
                    {format(new Date(announcement.published_at), 'yyyy-MM-dd HH:mm')}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
