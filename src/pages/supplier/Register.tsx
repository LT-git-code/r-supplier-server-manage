import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Building2, Globe, User, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { EnterpriseStep1 } from "@/components/supplier/register/EnterpriseStep1";
import { EnterpriseStep2 } from "@/components/supplier/register/EnterpriseStep2";
import { EnterpriseStep3 } from "@/components/supplier/register/EnterpriseStep3";
import { OverseasStep1 } from "@/components/supplier/register/OverseasStep1";
import { OverseasStep2 } from "@/components/supplier/register/OverseasStep2";
import { OverseasStep3 } from "@/components/supplier/register/OverseasStep3";
import { IndividualStep1 } from "@/components/supplier/register/IndividualStep1";
import { IndividualStep2 } from "@/components/supplier/register/IndividualStep2";
import { IndividualStep3 } from "@/components/supplier/register/IndividualStep3";
import type { Database } from "@/integrations/supabase/types";

type SupplierType = Database["public"]["Enums"]["supplier_type"];

interface SupplierFormData {
  // 通用字段
  supplier_type: SupplierType;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  province: string;
  city: string;
  main_products: string;
  production_capacity: string;
  
  // 企业字段
  company_name: string;
  unified_social_credit_code: string;
  legal_representative: string;
  registered_capital: string;
  establishment_date: string;
  employee_count: string;
  annual_revenue: string;
  business_scope: string;
  
  // 海外字段
  country: string;
  registration_number: string;
  
  // 个人字段
  id_card_number: string;
  
  // 银行信息
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
}

const initialFormData: SupplierFormData = {
  supplier_type: "enterprise",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  address: "",
  province: "",
  city: "",
  main_products: "",
  production_capacity: "",
  company_name: "",
  unified_social_credit_code: "",
  legal_representative: "",
  registered_capital: "",
  establishment_date: "",
  employee_count: "",
  annual_revenue: "",
  business_scope: "",
  country: "",
  registration_number: "",
  id_card_number: "",
  bank_name: "",
  bank_account: "",
  bank_account_name: "",
};

const supplierTypes = [
  {
    type: "enterprise" as SupplierType,
    title: "企业供应商",
    description: "境内注册的企业法人",
    icon: Building2,
    steps: ["企业信息", "联系信息", "银行信息"],
  },
  {
    type: "overseas" as SupplierType,
    title: "海外供应商",
    description: "境外注册的企业或个人",
    icon: Globe,
    steps: ["企业信息", "联系信息", "银行信息"],
  },
  {
    type: "individual" as SupplierType,
    title: "个人供应商",
    description: "个人独立经营者",
    icon: User,
    steps: ["个人信息", "联系信息", "银行信息"],
  },
];

export default function SupplierRegister() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<SupplierType | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (data: Partial<SupplierFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleTypeSelect = (type: SupplierType) => {
    setSelectedType(type);
    setFormData({ ...initialFormData, supplier_type: type });
    setCurrentStep(1);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      setSelectedType(null);
      setCurrentStep(0);
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "请先登录", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const supplierData = {
        user_id: user.id,
        supplier_type: formData.supplier_type,
        status: "pending" as const,
        contact_name: formData.contact_name || null,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        address: formData.address || null,
        province: formData.province || null,
        city: formData.city || null,
        main_products: formData.main_products || null,
        production_capacity: formData.production_capacity || null,
        company_name: formData.company_name || null,
        unified_social_credit_code: formData.unified_social_credit_code || null,
        legal_representative: formData.legal_representative || null,
        registered_capital: formData.registered_capital ? parseFloat(formData.registered_capital) : null,
        establishment_date: formData.establishment_date || null,
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null,
        business_scope: formData.business_scope || null,
        country: formData.country || null,
        registration_number: formData.registration_number || null,
        id_card_number: formData.id_card_number || null,
        bank_name: formData.bank_name || null,
        bank_account: formData.bank_account || null,
        bank_account_name: formData.bank_account_name || null,
      };

      const { error } = await supabase.from("suppliers").insert(supplierData);

      if (error) throw error;

      toast({
        title: "注册成功",
        description: "您的供应商申请已提交，请等待审核",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "注册失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTypeConfig = supplierTypes.find((t) => t.type === selectedType);
  const totalSteps = selectedTypeConfig?.steps.length || 3;
  const progress = selectedType ? (currentStep / totalSteps) * 100 : 0;

  const renderStepContent = () => {
    if (!selectedType) return null;

    switch (selectedType) {
      case "enterprise":
        switch (currentStep) {
          case 1:
            return <EnterpriseStep1 formData={formData} updateFormData={updateFormData} />;
          case 2:
            return <EnterpriseStep2 formData={formData} updateFormData={updateFormData} />;
          case 3:
            return <EnterpriseStep3 formData={formData} updateFormData={updateFormData} />;
        }
        break;
      case "overseas":
        switch (currentStep) {
          case 1:
            return <OverseasStep1 formData={formData} updateFormData={updateFormData} />;
          case 2:
            return <OverseasStep2 formData={formData} updateFormData={updateFormData} />;
          case 3:
            return <OverseasStep3 formData={formData} updateFormData={updateFormData} />;
        }
        break;
      case "individual":
        switch (currentStep) {
          case 1:
            return <IndividualStep1 formData={formData} updateFormData={updateFormData} />;
          case 2:
            return <IndividualStep2 formData={formData} updateFormData={updateFormData} />;
          case 3:
            return <IndividualStep3 formData={formData} updateFormData={updateFormData} />;
        }
        break;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>请先登录</CardTitle>
            <CardDescription>您需要登录后才能注册成为供应商</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">供应商注册</h1>
          <p className="text-muted-foreground mt-2">
            请选择您的供应商类型并填写相关信息
          </p>
        </div>

        {/* Progress */}
        {selectedType && (
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {selectedTypeConfig?.steps.map((step, index) => (
                <div
                  key={step}
                  className={`flex items-center gap-2 text-sm ${
                    index + 1 <= currentStep
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      index + 1 < currentStep
                        ? "bg-primary text-primary-foreground"
                        : index + 1 === currentStep
                        ? "border-2 border-primary text-primary"
                        : "border border-muted-foreground"
                    }`}
                  >
                    {index + 1 < currentStep ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="hidden sm:inline">{step}</span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Type Selection */}
        {!selectedType && (
          <div className="grid gap-4 md:grid-cols-3">
            {supplierTypes.map((type) => (
              <Card
                key={type.type}
                className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                onClick={() => handleTypeSelect(type.type)}
              >
                <CardHeader className="text-center pb-2">
                  <type.icon className="w-12 h-12 mx-auto text-primary mb-2" />
                  <CardTitle className="text-lg">{type.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {type.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Step Content */}
        {selectedType && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedTypeConfig?.steps[currentStep - 1]}
              </CardTitle>
              <CardDescription>
                第 {currentStep} 步，共 {totalSteps} 步
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  上一步
                </Button>

                {currentStep < totalSteps ? (
                  <Button onClick={handleNext}>
                    下一步
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "提交中..." : "提交申请"}
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
