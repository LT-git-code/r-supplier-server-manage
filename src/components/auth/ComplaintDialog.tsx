import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquareWarning, Upload, X } from 'lucide-react';

const COMPLAINT_TYPES = [
  { value: 'complaint', label: '投诉' },
  { value: 'suggestion', label: '建议' },
  { value: 'report', label: '举报' },
  { value: 'other', label: '其他' },
];

export function ComplaintDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    complaint_type: '',
    content: '',
    company_name: '',
    contact_name: '',
    contact_phone: '',
  });
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.complaint_type || !formData.content) {
      toast({
        title: '请填写必填项',
        description: '投诉类型和具体内容为必填项',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Upload attachments if any
      const attachmentUrls: string[] = [];
      
      if (files.length > 0) {
        const timestamp = Date.now();
        for (const file of files) {
          const filePath = `anonymous/${timestamp}/${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('complaint-attachments')
            .upload(filePath, file);
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            // Continue without attachment if upload fails
          } else {
            const { data: urlData } = supabase.storage
              .from('complaint-attachments')
              .getPublicUrl(filePath);
            attachmentUrls.push(urlData.publicUrl);
          }
        }
      }

      // Insert complaint
      const { error } = await supabase.from('complaints').insert({
        subject: COMPLAINT_TYPES.find(t => t.value === formData.complaint_type)?.label || formData.complaint_type,
        complaint_type: formData.complaint_type,
        content: formData.content,
        company_name: formData.company_name || null,
        contact_name: formData.contact_name || null,
        contact_phone: formData.contact_phone || null,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        is_anonymous: true,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: '提交成功',
        description: '您的投诉建议已成功提交，我们会尽快处理',
      });

      // Reset form
      setFormData({
        complaint_type: '',
        content: '',
        company_name: '',
        contact_name: '',
        contact_phone: '',
      });
      setFiles([]);
      setOpen(false);
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: '提交失败',
        description: '请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles].slice(0, 5)); // Max 5 files
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
          <MessageSquareWarning className="h-4 w-4 mr-1" />
          投诉建议
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>投诉建议</DialogTitle>
          <DialogDescription>
            请填写以下信息，我们会认真对待您的反馈
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="complaint_type">投诉建议类型 <span className="text-destructive">*</span></Label>
            <Select
              value={formData.complaint_type}
              onValueChange={(v) => setFormData(prev => ({ ...prev, complaint_type: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择类型" />
              </SelectTrigger>
              <SelectContent>
                {COMPLAINT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">具体内容 <span className="text-destructive">*</span></Label>
            <Textarea
              id="content"
              placeholder="请详细描述您的投诉或建议内容"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">公司名称</Label>
            <Input
              id="company_name"
              placeholder="请输入公司名称（选填）"
              value={formData.company_name}
              onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_name">姓名</Label>
            <Input
              id="contact_name"
              placeholder="请输入姓名（选填）"
              value={formData.contact_name}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">联系方式</Label>
            <Input
              id="contact_phone"
              placeholder="请输入电话或邮箱（选填）"
              value={formData.contact_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>上传附件</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">点击上传附件（最多5个文件）</p>
              </label>
            </div>
            {files.length > 0 && (
              <div className="space-y-2 mt-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2 text-sm">
                    <span className="truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                提交中...
              </>
            ) : (
              '确认提交'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
