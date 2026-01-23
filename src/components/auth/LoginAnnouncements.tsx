import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  published_at: string;
}

export function LoginAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, content, published_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MM-dd HH:mm');
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <Card className="h-full bg-card/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            系统公告
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] px-4 pb-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                ))}
              </div>
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <Bell className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">暂无公告</p>
              </div>
            ) : (
              <div className="space-y-2">
                {announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="group p-3 rounded-lg bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors"
                    onClick={() => setSelectedAnnouncement(announcement)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                        {announcement.title}
                      </h4>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(announcement.published_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement?.title}</DialogTitle>
            <DialogDescription>
              发布时间：{selectedAnnouncement?.published_at && formatDate(selectedAnnouncement.published_at)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg max-h-[300px] overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap">{selectedAnnouncement?.content}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
