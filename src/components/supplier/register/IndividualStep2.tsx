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
  contact_phone: string;
  contact_email: string;
  province: string;
  city: string;
  address: string;
  main_products: string;
  production_capacity: string;
}

interface IndividualStep2Props {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
}

const provinces = [
  "北京市", "天津市", "上海市", "重庆市",
  "河北省", "山西省", "辽宁省", "吉林省", "黑龙江省",
  "江苏省", "浙江省", "安徽省", "福建省", "江西省", "山东省",
  "河南省", "湖北省", "湖南省", "广东省", "海南省",
  "四川省", "贵州省", "云南省", "陕西省", "甘肃省",
  "青海省", "内蒙古自治区", "广西壮族自治区", "西藏自治区",
  "宁夏回族自治区", "新疆维吾尔自治区", "香港特别行政区", "澳门特别行政区", "台湾省",
];

export function IndividualStep2({ formData, updateFormData }: IndividualStep2Props) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact_phone">
            手机号码 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact_phone"
            placeholder="请输入手机号码"
            value={formData.contact_phone}
            onChange={(e) => updateFormData({ contact_phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">
            电子邮箱 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact_email"
            type="email"
            placeholder="请输入电子邮箱"
            value={formData.contact_email}
            onChange={(e) => updateFormData({ contact_email: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="province">
            省份 <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.province}
            onValueChange={(value) => updateFormData({ province: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择省份" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">城市</Label>
          <Input
            id="city"
            placeholder="请输入城市"
            value={formData.city}
            onChange={(e) => updateFormData({ city: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">详细地址</Label>
        <Input
          id="address"
          placeholder="请输入详细地址"
          value={formData.address}
          onChange={(e) => updateFormData({ address: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="main_products">主营产品/服务</Label>
        <Textarea
          id="main_products"
          placeholder="请描述您的主营产品或服务"
          rows={3}
          value={formData.main_products}
          onChange={(e) => updateFormData({ main_products: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="production_capacity">服务能力</Label>
        <Textarea
          id="production_capacity"
          placeholder="请描述您的主要服务项目、年接单量、设备情况、技术人员数量等"
          rows={4}
          value={formData.production_capacity}
          onChange={(e) => updateFormData({ production_capacity: e.target.value })}
        />
      </div>
    </div>
  );
}
