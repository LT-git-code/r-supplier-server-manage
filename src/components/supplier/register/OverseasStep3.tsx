import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface FormData {
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
}

interface OverseasStep3Props {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
}

export function OverseasStep3({ formData, updateFormData }: OverseasStep3Props) {
  return (
    <div className="grid gap-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Bank information is used for payment settlement. Please ensure accuracy. 
          If not available now, you can provide it after approval.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="bank_name">银行名称 / Bank Name</Label>
        <Input
          id="bank_name"
          placeholder="e.g., Bank of America, HSBC"
          value={formData.bank_name}
          onChange={(e) => updateFormData({ bank_name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_account_name">账户名称 / Account Name</Label>
        <Input
          id="bank_account_name"
          placeholder="Account holder name"
          value={formData.bank_account_name}
          onChange={(e) => updateFormData({ bank_account_name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bank_account">账号 / IBAN / SWIFT</Label>
        <Input
          id="bank_account"
          placeholder="Bank account number, IBAN, or SWIFT code"
          value={formData.bank_account}
          onChange={(e) => updateFormData({ bank_account: e.target.value })}
        />
      </div>

      <div className="bg-muted/50 rounded-lg p-4 mt-4">
        <h4 className="font-medium mb-2">Confirmation / 确认</h4>
        <p className="text-sm text-muted-foreground">
          After submission, your application will enter the review process. 
          Once approved, you will receive a notification and can start using supplier features.
          <br /><br />
          提交后，您的申请将进入审核流程。审核通过后，您将收到通知并可以开始使用供应商功能。
        </p>
      </div>
    </div>
  );
}
