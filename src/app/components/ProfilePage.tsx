import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  isCheckoutProfileComplete,
  useCheckoutProfile,
  type CheckoutProfile,
} from '../contexts/CheckoutProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import CheckoutProfileForm from './CheckoutProfileForm';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

export default function ProfilePage() {
  const { t } = useLanguage();
  const { checkoutProfile, saveCheckoutProfile } = useCheckoutProfile();
  const [draft, setDraft] = useState<CheckoutProfile>(checkoutProfile);

  useEffect(() => {
    setDraft(checkoutProfile);
  }, [checkoutProfile]);

  const handleSave = () => {
    if (!isCheckoutProfileComplete(draft)) {
      toast.error(t('Please complete your details and verify your email', '请填写完整信息并完成邮箱验证'));
      return;
    }
    saveCheckoutProfile(draft);
    toast.success(t('Saved for next checkout', '已保存，下次下单会自动填写'));
  };

  return (
    <div className="container max-w-md mx-auto py-8 px-4">
      <Card className="shadow-none border border-[#D6E2DC] rounded-xl">
        <CardHeader>
          <CardTitle>{t('Checkout details', '下单信息')}</CardTitle>
          <CardDescription>
            {t(
              'Saved on this device so the next reservation can be filled in automatically.',
              '保存在这台设备上，下次预定时会自动填入。'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CheckoutProfileForm value={draft} onChange={setDraft} />
          <Button onClick={handleSave} className="w-full h-11 rounded-xl">
            {t('Save', '保存')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
