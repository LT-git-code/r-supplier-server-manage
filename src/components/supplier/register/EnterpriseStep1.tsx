import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormData {
  company_name: string;
  unified_social_credit_code: string;
  legal_representative: string;
  registered_capital: string;
  establishment_date: string;
  employee_count: string;
  annual_revenue: string;
  business_scope: string;
}

interface EnterpriseStep1Props {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
}

const employeeRanges = [
  { value: "10", label: "10人以下" },
  { value: "50", label: "10-50人" },
  { value: "100", label: "50-100人" },
  { value: "500", label: "100-500人" },
  { value: "1000", label: "500-1000人" },
  { value: "5000", label: "1000人以上" },
];

export function EnterpriseStep1({ formData, updateFormData }: EnterpriseStep1Props) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company_name">
            企业名称 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="company_name"
            placeholder="请输入企业全称"
            value={formData.company_name}
            onChange={(e) => updateFormData({ company_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unified_social_credit_code">
            统一社会信用代码 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="unified_social_credit_code"
            placeholder="18位统一社会信用代码"
            maxLength={18}
            value={formData.unified_social_credit_code}
            onChange={(e) =>
              updateFormData({ unified_social_credit_code: e.target.value.toUpperCase() })
            }
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="legal_representative">
            法定代表人 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="legal_representative"
            placeholder="请输入法定代表人姓名"
            value={formData.legal_representative}
            onChange={(e) => updateFormData({ legal_representative: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="registered_capital">注册资本（万元）</Label>
          <Input
            id="registered_capital"
            type="number"
            placeholder="请输入注册资本"
            value={formData.registered_capital}
            onChange={(e) => updateFormData({ registered_capital: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="establishment_date">成立日期</Label>
          <Input
            id="establishment_date"
            type="date"
            value={formData.establishment_date}
            onChange={(e) => updateFormData({ establishment_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee_count">员工人数</Label>
          <Select
            value={formData.employee_count}
            onValueChange={(value) => updateFormData({ employee_count: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择员工规模" />
            </SelectTrigger>
            <SelectContent>
              {employeeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="annual_revenue">年营业额（万元）</Label>
          <Input
            id="annual_revenue"
            type="number"
            placeholder="请输入年营业额"
            value={formData.annual_revenue}
            onChange={(e) => updateFormData({ annual_revenue: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_scope">经营范围</Label>
        <Textarea
          id="business_scope"
          placeholder="请输入经营范围"
          rows={3}
          value={formData.business_scope}
          onChange={(e) => updateFormData({ business_scope: e.target.value })}
        />
      </div>
    </div>
  );
}
