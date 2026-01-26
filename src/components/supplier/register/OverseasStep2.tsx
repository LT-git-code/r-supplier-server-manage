import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FormData {
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  city: string;
  address: string;
  main_products: string;
  production_capacity: string;
}

interface OverseasStep2Props {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
}

export function OverseasStep2({ formData, updateFormData }: OverseasStep2Props) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="contact_name">
            联系人 / Contact Person <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact_name"
            placeholder="Please enter contact name"
            value={formData.contact_name}
            onChange={(e) => updateFormData({ contact_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_phone">
            联系电话 / Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact_phone"
            placeholder="+1 xxx-xxx-xxxx"
            value={formData.contact_phone}
            onChange={(e) => updateFormData({ contact_phone: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">
            联系邮箱 / Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact_email"
            type="email"
            placeholder="email@example.com"
            value={formData.contact_email}
            onChange={(e) => updateFormData({ contact_email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">城市 / City</Label>
        <Input
          id="city"
          placeholder="Please enter city"
          value={formData.city}
          onChange={(e) => updateFormData({ city: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">详细地址 / Address</Label>
        <Input
          id="address"
          placeholder="Please enter full address"
          value={formData.address}
          onChange={(e) => updateFormData({ address: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="main_products">主营产品 / Main Products</Label>
        <Textarea
          id="main_products"
          placeholder="Please describe your main products or services"
          rows={3}
          value={formData.main_products}
          onChange={(e) => updateFormData({ main_products: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="production_capacity">生产能力 / Production Capacity</Label>
        <Textarea
          id="production_capacity"
          placeholder="Please describe your main production lines, annual capacity, equipment, technical personnel, etc."
          rows={4}
          value={formData.production_capacity}
          onChange={(e) => updateFormData({ production_capacity: e.target.value })}
        />
      </div>
    </div>
  );
}
