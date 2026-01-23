import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Clock, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { REPORT_TYPES } from './CreateReportDialog';

export interface PendingReport {
  id: string;
  reportType: string;
  reportTypeName: string;
  issuedAt: string;
  deadline: string;
  status: 'pending' | 'submitted';
  fileUrl?: string;
}

interface PendingReportCardProps {
  report: PendingReport;
  onUpload: (report: PendingReport) => void;
  onDownload: (report: PendingReport) => void;
  onDelete: (report: PendingReport) => void;
}

export default function PendingReportCard({
  report,
  onUpload,
  onDownload,
  onDelete,
}: PendingReportCardProps) {
  const reportType = REPORT_TYPES.find(t => t.id === report.reportType);

  const getDeadlineStatus = () => {
    if (!report.deadline) return null;
    const daysUntilDeadline = differenceInDays(parseISO(report.deadline), new Date());

    if (daysUntilDeadline < 0) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          已截止
        </Badge>
      );
    } else if (daysUntilDeadline <= 3) {
      return (
        <Badge variant="outline" className="text-red-600 border-red-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {daysUntilDeadline}天后截止
        </Badge>
      );
    } else if (daysUntilDeadline <= 7) {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-600">
          {daysUntilDeadline}天后截止
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-green-600 border-green-600">
        {daysUntilDeadline}天后截止
      </Badge>
    );
  };

  const getStatusBadge = () => {
    if (report.status === 'submitted') {
      return (
        <Badge className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          已提交
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
        <Clock className="h-3 w-3 mr-1" />
        待填写
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {reportType?.icon}
            <h4 className="font-medium">{report.reportTypeName}</h4>
            {getDeadlineStatus()}
            {getStatusBadge()}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">文件类型：</span>
              {reportType?.name || report.reportType}
            </div>
            <div>
              <span className="font-medium">下发时间：</span>
              {format(new Date(report.issuedAt), 'yyyy-MM-dd')}
            </div>
            <div>
              <span className="font-medium">截止时间：</span>
              {format(new Date(report.deadline), 'yyyy-MM-dd')}
            </div>
            <div>
              <span className="font-medium">当前状态：</span>
              {report.status === 'submitted' ? '已提交' : '待填写'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {report.fileUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(report)}
            >
              <Download className="h-4 w-4 mr-1" />
              下载
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => onUpload(report)}
            disabled={report.status === 'submitted'}
          >
            <Upload className="h-4 w-4 mr-1" />
            {report.status === 'submitted' ? '重新上传' : '上传'}
          </Button>
          {report.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(report)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
