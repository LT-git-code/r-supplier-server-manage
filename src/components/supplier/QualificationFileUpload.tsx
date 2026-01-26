import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, FileText, Loader2, Download, Eye } from 'lucide-react';

interface QualificationFileUploadProps {
  supplierId: string;
  fileUrl: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  readonly?: boolean;
}

export function QualificationFileUpload({
  supplierId,
  fileUrl,
  onChange,
  disabled = false,
  readonly = false,
}: QualificationFileUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件大小 (最大10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: '文件过大',
        description: '文件大小不能超过10MB',
        variant: 'destructive',
      });
      return;
    }

    // 验证文件类型
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: '文件格式不支持',
        description: '请上传 PDF、JPG 或 PNG 格式的文件',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      // 生成唯一文件名
      const fileExt = file.name.split('.').pop();
      const fileName = `${supplierId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // 上传文件
      const { error: uploadError } = await supabase.storage
        .from('qualification-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 获取公开URL
      const { data: { publicUrl } } = supabase.storage
        .from('qualification-attachments')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast({
        title: '上传成功',
        description: '资质附件已上传',
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '上传失败',
        description: err.message || '无法上传文件',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // 重置input以便可以重新选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!fileUrl) return;

    try {
      // 从URL中提取文件路径
      const urlParts = fileUrl.split('/qualification-attachments/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage
          .from('qualification-attachments')
          .remove([filePath]);
      }

      onChange('');
      toast({
        title: '删除成功',
        description: '资质附件已删除',
      });
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: '删除失败',
        description: err.message || '无法删除文件',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const getFileName = (url: string) => {
    if (!url) return '';
    const parts = url.split('/');
    return parts[parts.length - 1];
  };

  if (readonly) {
    // 只读模式：部门人员查看
    if (!fileUrl) {
      return (
        <div className="text-sm text-muted-foreground">暂无附件</div>
      );
    }

    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm truncate flex-1">{getFileName(fileUrl)}</span>
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" />
          下载
        </Button>
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Eye className="h-4 w-4 mr-1" />
          预览
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {fileUrl ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate flex-1">{getFileName(fileUrl)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="w-full h-20 border-dashed"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 mr-2" />
              点击上传资质附件
            </>
          )}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        支持 PDF、JPG、PNG 格式，最大 10MB
      </p>
    </div>
  );
}
