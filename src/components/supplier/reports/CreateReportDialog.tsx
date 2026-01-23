import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Shield, Lock, Users, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export interface ReportType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

export const REPORT_TYPES: ReportType[] = [
  {
    id: 'integrity_agreement',
    name: '供应商廉洁协议',
    icon: <Shield className="h-5 w-5 text-blue-500" />,
    description: '供应商廉洁自律承诺协议',
  },
  {
    id: 'confidentiality_agreement',
    name: '供应商保密协议',
    icon: <Lock className="h-5 w-5 text-green-500" />,
    description: '供应商保密责任协议',
  },
  {
    id: 'related_party_declaration',
    name: '关联关系申报表',
    icon: <Users className="h-5 w-5 text-orange-500" />,
    description: '供应商关联关系申报',
  },
  {
    id: 'periodic_report',
    name: '年度/季度报表',
    icon: <Calendar className="h-5 w-5 text-purple-500" />,
    description: '定期经营数据报表',
  },
];

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    reportType: string;
    reportTypeName: string;
    deadline: string;
  }) => Promise<void>;
  loading?: boolean;
}

export default function CreateReportDialog({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: CreateReportDialogProps) {
  const [selectedType, setSelectedType] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = async () => {
    if (!selectedType || !deadline) return;
    
    const reportType = REPORT_TYPES.find(t => t.id === selectedType);
    if (!reportType) return;

    await onSubmit({
      reportType: selectedType,
      reportTypeName: reportType.name,
      deadline,
    });

    // Reset form
    setSelectedType('');
    setDeadline('');
  };

  const handleClose = () => {
    setSelectedType('');
    setDeadline('');
    onOpenChange(false);
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            新建报表
          </DialogTitle>
          <DialogDescription>
            选择报表类型并设置截止时间
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label>报表类型</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="请选择报表类型" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      {type.icon}
                      <span>{type.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedType && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  {REPORT_TYPES.find(t => t.id === selectedType)?.icon}
                  <div>
                    <p className="font-medium">
                      {REPORT_TYPES.find(t => t.id === selectedType)?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {REPORT_TYPES.find(t => t.id === selectedType)?.description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label>截止时间</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={today}
            />
            <p className="text-xs text-muted-foreground">
              请在截止时间前完成报表提交
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !selectedType || !deadline}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            确认创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
