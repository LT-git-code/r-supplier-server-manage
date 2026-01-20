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
  registration_number: string;
  country: string;
  legal_representative: string;
  establishment_date: string;
  employee_count: string;
  annual_revenue: string;
  business_scope: string;
}

interface OverseasStep1Props {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
}

const countries = [
  "美国", "英国", "德国", "法国", "日本", "韩国", "新加坡",
  "澳大利亚", "加拿大", "意大利", "西班牙", "荷兰", "瑞士",
  "瑞典", "挪威", "丹麦", "芬兰", "比利时", "奥地利",
  "新西兰", "爱尔兰", "马来西亚", "泰国", "印度", "越南",
  "印度尼西亚", "菲律宾", "巴西", "墨西哥", "阿根廷", "其他",
];

const employeeRanges = [
  { value: "10", label: "10人以下" },
  { value: "50", label: "10-50人" },
  { value: "100", label: "50-100人" },
  { value: "500", label: "100-500人" },
  { value: "1000", label: "500-1000人" },
  { value: "5000", label: "1000人以上" },
];

export function OverseasStep1({ formData, updateFormData }: OverseasStep1Props) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company_name">
            公司名称 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="company_name"
            placeholder="Please enter company name"
            value={formData.company_name}
            onChange={(e) => updateFormData({ company_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="registration_number">
            注册号 / Registration Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="registration_number"
            placeholder="Please enter registration number"
            value={formData.registration_number}
            onChange={(e) => updateFormData({ registration_number: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="country">
            注册国家/地区 <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.country}
            onValueChange={(value) => updateFormData({ country: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择国家/地区" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="legal_representative">法定代表人 / Legal Representative</Label>
          <Input
            id="legal_representative"
            placeholder="Please enter legal representative name"
            value={formData.legal_representative}
            onChange={(e) => updateFormData({ legal_representative: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="establishment_date">成立日期 / Establishment Date</Label>
          <Input
            id="establishment_date"
            type="date"
            value={formData.establishment_date}
            onChange={(e) => updateFormData({ establishment_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="employee_count">员工人数 / Employee Count</Label>
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

      <div className="space-y-2">
        <Label htmlFor="annual_revenue">年营业额（USD）/ Annual Revenue</Label>
        <Input
          id="annual_revenue"
          type="number"
          placeholder="Please enter annual revenue in USD"
          value={formData.annual_revenue}
          onChange={(e) => updateFormData({ annual_revenue: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_scope">经营范围 / Business Scope</Label>
        <Textarea
          id="business_scope"
          placeholder="Please describe your business scope"
          rows={3}
          value={formData.business_scope}
          onChange={(e) => updateFormData({ business_scope: e.target.value })}
        />
      </div>
    </div>
  );
}
