import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';

export default function DeptProjects() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">历史工程</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            工程项目列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-4" />
            <p className="text-lg">功能开发中</p>
            <p className="text-sm">历史工程管理功能即将上线</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
