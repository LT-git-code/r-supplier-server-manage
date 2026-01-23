import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  File, 
  Trash2, 
  Download, 
  Loader2,
  FileText,
  Image,
  FileSpreadsheet,
} from 'lucide-react';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  description: string | null;
  created_at: string;
}

interface AttachmentUploadProps {
  supplierId: string;
  category: 'capacity' | 'finance' | 'cases';
  title?: string;
  description?: string;
  readOnly?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (fileType: string) => {
  if (fileType?.startsWith('image/')) return Image;
  if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return FileSpreadsheet;
  return FileText;
};

export function AttachmentUpload({ 
  supplierId, 
  category, 
  title = '附件管理',
  description = '上传相关文件和资料',
  readOnly = false
}: AttachmentUploadProps) {
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (supplierId) {
      loadAttachments();
    }
  }, [supplierId, category]);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_attachments')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Load attachments error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 限制文件大小 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: '文件过大',
        description: '文件大小不能超过10MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      
      // 获取当前用户ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('未登录');

      // 上传到 storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${category}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('supplier-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 获取公开URL
      const { data: { publicUrl } } = supabase.storage
        .from('supplier-attachments')
        .getPublicUrl(fileName);

      // 保存附件记录
      const { error: insertError } = await supabase
        .from('supplier_attachments')
        .insert({
          supplier_id: supplierId,
          category,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
        });

      if (insertError) throw insertError;

      toast({
        title: '上传成功',
        description: `${file.name} 已上传`,
      });

      loadAttachments();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: '上传失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // 清空input
      e.target.value = '';
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      setDeletingId(attachment.id);

      // 从URL中提取文件路径
      const urlParts = attachment.file_url.split('/supplier-attachments/');
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1]);
        await supabase.storage.from('supplier-attachments').remove([filePath]);
      }

      // 删除数据库记录
      const { error } = await supabase
        .from('supplier_attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;

      toast({
        title: '删除成功',
        description: `${attachment.file_name} 已删除`,
      });

      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    window.open(attachment.file_url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {!readOnly && (
          <div className="relative">
            <Input
              type="file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={uploading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
            />
            <Button disabled={uploading} variant="outline">
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              上传附件
            </Button>
          </div>
        )}
      </div>

      {attachments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <File className="h-12 w-12 mb-4 opacity-50" />
            <p>暂无附件</p>
            {!readOnly && (
              <p className="text-sm mt-1">支持 PDF、Word、Excel、图片格式，单个文件不超过10MB</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {attachments.map(attachment => {
            const FileIcon = getFileIcon(attachment.file_type);
            return (
              <Card key={attachment.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{attachment.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)} · {new Date(attachment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(attachment)}
                        disabled={deletingId === attachment.id}
                      >
                        {deletingId === attachment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}