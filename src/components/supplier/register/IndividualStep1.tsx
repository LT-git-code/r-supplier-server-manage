import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FormData {
  contact_name: string;
  id_card_number: string;
  business_scope: string;
}

interface IndividualStep1Props {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
}

export function IndividualStep1({ formData, updateFormData }: IndividualStep1Props) {
  return (
    <div className="grid gap-6">
      <div className="space-y-2">
        <Label htmlFor="contact_name">
          姓名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="contact_name"
          placeholder="请输入您的真实姓名"
          value={formData.contact_name}
          onChange={(e) => updateFormData({ contact_name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="id_card_number">
          身份证号 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="id_card_number"
          placeholder="请输入18位身份证号码"
          maxLength={18}
          value={formData.id_card_number}
          onChange={(e) => updateFormData({ id_card_number: e.target.value.toUpperCase() })}
        />
        <p className="text-xs text-muted-foreground">
          身份证信息用于实名认证，我们将严格保护您的隐私
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_scope">经营范围/服务描述</Label>
        <Textarea
          id="business_scope"
          placeholder="请描述您能提供的产品或服务"
          rows={4}
          value={formData.business_scope}
          onChange={(e) => updateFormData({ business_scope: e.target.value })}
        />
      </div>
    </div>
  );
}
