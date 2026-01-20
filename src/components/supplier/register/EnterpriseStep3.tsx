import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface FormData {
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
}

interface EnterpriseStep3Props {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
}

export function EnterpriseStep3({ formData, updateFormData }: EnterpriseStep3Props) {
  return (
    <div className="grid gap-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          银行信息用于后续付款结算，请确保填写准确。如暂时无法提供，可在审核通过后补充。
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="bank_name">开户银行</Label>
        <Input
          id="bank_name"
          placeholder="请输入开户银行名称，如：中国工商银行北京分行"
          value={formData.bank_name}
          onChange={(e) => updateFormData({ bank_name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_account_name">账户名称</Label>
        <Input
          id="bank_account_name"
          placeholder="请输入账户名称（应与企业名称一致）"
          value={formData.bank_account_name}
          onChange={(e) => updateFormData({ bank_account_name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_account">银行账号</Label>
        <Input
          id="bank_account"
          placeholder="请输入银行账号"
          value={formData.bank_account}
          onChange={(e) => updateFormData({ bank_account: e.target.value })}
        />
      </div>

      <div className="bg-muted/50 rounded-lg p-4 mt-4">
        <h4 className="font-medium mb-2">信息确认</h4>
        <p className="text-sm text-muted-foreground">
          提交后，您的申请将进入审核流程。审核通过后，您将收到通知并可以开始使用供应商功能。
          如有问题，请联系管理员。
        </p>
      </div>
    </div>
  );
}
