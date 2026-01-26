import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  AlertTriangle,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImportResult {
  success: ImportedSupplier[];
  failed: FailedImport[];
  total: number;
}

interface ImportedSupplier {
  company_name: string;
  supplier_type: string;
  contact_name: string;
  contact_phone: string;
  buyer_name: string;
  cooperation_tag: string;
}

interface FailedImport {
  row: number;
  company_name: string;
  reason: string;
  data: Record<string, string>;
}

interface SupplierImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const TEMPLATE_HEADERS = [
  '供应商名称',
  '供应商类别',
  '联系人',
  '联系方式',
  '当前采购员',
  '合作情况标签',
];

const SUPPLIER_TYPES = {
  '国内公司': 'enterprise',
  '海外公司': 'overseas',
  '个人': 'individual',
};

const COOPERATION_TAGS = [
  '推荐供应商',
  '良好供应商',
  '异议供应商',
  '拉黑供应商',
];

export default function SupplierImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: SupplierImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'processing' | 'result'>('upload');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [noDepartmentError, setNoDepartmentError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    // 创建Excel模板
    const templateData = [
      TEMPLATE_HEADERS,
      ['示例公司A', '国内公司', '张三', '13800138000', '李四', '推荐供应商'],
      ['示例公司B', '海外公司', 'John', '+1-555-1234', '王五', '良好供应商'],
      ['示例个人C', '个人', '赵六', '13900139000', '李四', '良好供应商'],
    ];
    
    // 创建工作簿和工作表
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 供应商名称
      { wch: 12 }, // 供应商类别
      { wch: 10 }, // 联系人
      { wch: 15 }, // 联系方式
      { wch: 12 }, // 当前采购员
      { wch: 14 }, // 合作情况标签
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '供应商导入模板');
    
    // 导出Excel文件
    XLSX.writeFile(wb, '供应商导入模板.xlsx');
    
    toast.success('模板下载成功');
  };

  const parseExcelFile = (file: File): Promise<string[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // 读取第一个工作表
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // 转换为二维数组
          const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { 
            header: 1,
            defval: '',
          });
          
          resolve(jsonData as string[][]);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('请上传CSV或Excel文件');
      return;
    }

    setStep('processing');
    setImporting(true);
    setProgress(10);

    try {
      let rows: string[][];
      
      // 根据文件类型选择解析方式
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        rows = await parseExcelFile(file);
      } else if (file.name.endsWith('.csv')) {
        const text = await file.text();
        rows = parseCSV(text);
      } else {
        throw new Error('不支持的文件格式');
      }
      
      // 过滤空行
      rows = rows.filter(row => row.some(cell => cell && String(cell).trim()));
      if (rows.length < 2) {
        throw new Error('文件内容为空或格式不正确');
      }

      setProgress(30);

      // 验证表头
      const headers = rows[0].map(h => String(h).trim());
      const missingHeaders = TEMPLATE_HEADERS.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`缺少必要列: ${missingHeaders.join(', ')}`);
      }

      // 获取列索引
      const colIndex: Record<string, number> = {};
      TEMPLATE_HEADERS.forEach(h => {
        colIndex[h] = headers.indexOf(h);
      });

      setProgress(50);

      // 解析数据
      const suppliers: ImportedSupplier[] = [];
      const dataRows = rows.slice(1);
      
      for (const row of dataRows) {
        const rowStr = row.map(cell => String(cell || '').trim());
        if (rowStr.every(cell => !cell)) continue; // 跳过空行
        
        suppliers.push({
          company_name: rowStr[colIndex['供应商名称']] || '',
          supplier_type: rowStr[colIndex['供应商类别']] || '',
          contact_name: rowStr[colIndex['联系人']] || '',
          contact_phone: rowStr[colIndex['联系方式']] || '',
          buyer_name: rowStr[colIndex['当前采购员']] || '',
          cooperation_tag: rowStr[colIndex['合作情况标签']] || '',
        });
      }

      setProgress(70);

      // 调用后端API进行导入
      const { data, error } = await supabase.functions.invoke('dept-api', {
        body: { 
          action: 'import_suppliers',
          suppliers,
        },
      });

      if (error) {
        // 检查是否是未绑定部门的错误
        const errorMessage = error.message || (error as any)?.context?.body?.error || '';
        if (errorMessage.includes('未绑定部门')) {
          setNoDepartmentError(true);
          setStep('upload');
          return;
        }
        throw error;
      }

      // 检查返回数据中是否有错误信息
      if (data?.error) {
        if (data.error.includes('未绑定部门')) {
          setNoDepartmentError(true);
          setStep('upload');
          return;
        }
        throw new Error(data.error);
      }

      setProgress(100);
      setResult(data);
      setStep('result');
      
      if (data.success.length > 0) {
        toast.success(`成功导入 ${data.success.length} 个供应商`);
        onImportComplete();
      }
      
      if (data.failed.length > 0) {
        toast.warning(`${data.failed.length} 个供应商导入失败`);
      }

    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : '导入失败';
      
      // 再次检查错误消息
      if (errorMessage.includes('未绑定部门')) {
        setNoDepartmentError(true);
        setStep('upload');
      } else {
        toast.error(errorMessage);
        setStep('upload');
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setStep('upload');
    setProgress(0);
    setResult(null);
    setNoDepartmentError(false);
    onOpenChange(false);
  };

  const getSupplierTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      enterprise: '国内公司',
      overseas: '海外公司',
      individual: '个人',
    };
    return types[type] || type;
  };

  const getCooperationTagBadge = (tag: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      '推荐供应商': 'default',
      '良好供应商': 'secondary',
      '异议供应商': 'outline',
      '拉黑供应商': 'destructive',
    };
    return <Badge variant={variants[tag] || 'secondary'}>{tag}</Badge>;
  };

  return (
    <>
      {/* 未绑定部门错误弹窗 */}
      <AlertDialog open={noDepartmentError} onOpenChange={setNoDepartmentError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              无法导入供应商
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              <div className="space-y-3 pt-2">
                <p className="font-medium text-foreground">该用户未绑定部门</p>
                <p className="text-muted-foreground">
                  您的账号尚未分配到任何部门，无法执行供应商导入操作。
                </p>
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium mb-1">解决方法：</p>
                  <p>请联系系统管理员将您的账号分配到相应的部门后再进行导入操作。</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setNoDepartmentError(false);
              handleClose();
            }}>
              我知道了
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            供应商批量导入
          </DialogTitle>
          <DialogDescription>
            下载模板填写供应商信息，然后上传文件进行批量导入
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6 py-4">
            {/* 模板说明 */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium">模板字段说明</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">供应商名称:</span> 公司或个人名称 (必填)</div>
                <div><span className="text-muted-foreground">供应商类别:</span> 国内公司/海外公司/个人</div>
                <div><span className="text-muted-foreground">联系人:</span> 主要联系人姓名</div>
                <div><span className="text-muted-foreground">联系方式:</span> 电话或手机号码</div>
                <div><span className="text-muted-foreground">当前采购员:</span> 负责该供应商的采购员</div>
                <div><span className="text-muted-foreground">合作情况标签:</span> 推荐/良好/异议/拉黑</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span>预留第三方接口校验位置（企查查/天眼查），后续将验证公司真实性</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col items-center gap-4 py-6">
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-64">
                <Download className="h-4 w-4 mr-2" />
                下载导入模板
              </Button>
              
              <div className="text-muted-foreground text-sm">或</div>
              
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button className="w-64">
                  <Upload className="h-4 w-4 mr-2" />
                  上传供应商文件
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                支持 CSV、Excel 格式文件
              </p>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h4 className="font-medium">正在导入供应商...</h4>
              <Progress value={progress} className="w-64" />
              <p className="text-sm text-muted-foreground">请稍候，正在处理数据</p>
            </div>
          </div>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            {/* 统计概览 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">{result.total}</div>
                <div className="text-sm text-muted-foreground">总计</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{result.success.length}</div>
                <div className="text-sm text-muted-foreground">导入成功</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{result.failed.length}</div>
                <div className="text-sm text-muted-foreground">导入失败</div>
              </div>
            </div>

            {/* 详细结果 */}
            <Tabs defaultValue={result.failed.length > 0 ? 'failed' : 'success'} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="success" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  成功 ({result.success.length})
                </TabsTrigger>
                <TabsTrigger value="failed" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  失败 ({result.failed.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="success">
                <ScrollArea className="h-[300px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>供应商名称</TableHead>
                        <TableHead>类别</TableHead>
                        <TableHead>联系人</TableHead>
                        <TableHead>联系方式</TableHead>
                        <TableHead>采购员</TableHead>
                        <TableHead>合作标签</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.success.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            无成功导入的供应商
                          </TableCell>
                        </TableRow>
                      ) : (
                        result.success.map((s, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{s.company_name}</TableCell>
                            <TableCell>{getSupplierTypeLabel(s.supplier_type)}</TableCell>
                            <TableCell>{s.contact_name || '-'}</TableCell>
                            <TableCell>{s.contact_phone || '-'}</TableCell>
                            <TableCell>{s.buyer_name || '-'}</TableCell>
                            <TableCell>
                              {s.cooperation_tag ? getCooperationTagBadge(s.cooperation_tag) : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="failed">
                <ScrollArea className="h-[300px] rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">行号</TableHead>
                        <TableHead>供应商名称</TableHead>
                        <TableHead>失败原因</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.failed.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            无失败记录
                          </TableCell>
                        </TableRow>
                      ) : (
                        result.failed.map((f, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{f.row}</TableCell>
                            <TableCell className="font-medium">{f.company_name || '未知'}</TableCell>
                            <TableCell className="text-red-600">{f.reason}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                继续导入
              </Button>
              <Button onClick={handleClose}>
                完成
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
