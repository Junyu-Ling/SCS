import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import { ADMIN_EMAILS } from '../contexts/ProfileContext';
import {
  isCheckoutProfileComplete,
  useCheckoutProfile,
  type CheckoutProfile,
} from '../contexts/CheckoutProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import CheckoutProfileForm from './CheckoutProfileForm';

type CheckoutProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CheckoutProfileDialog({
  open,
  onOpenChange,
}: CheckoutProfileDialogProps) {
  const { t } = useLanguage();
  const { checkoutProfile, saveCheckoutProfile } = useCheckoutProfile();
  const [draft, setDraft] = useState<CheckoutProfile>(checkoutProfile);

  useEffect(() => {
    if (open) setDraft(checkoutProfile);
  }, [open, checkoutProfile]);

  const handleSave = () => {
    if (!isCheckoutProfileComplete(draft)) {
      toast.error(t('Please fill in name, email, and class', '请填写真实姓名、邮箱和班级'));
      return;
    }
    saveCheckoutProfile(draft);
    toast.success(t('Saved for next checkout', '已保存，下次下单会自动填写'));
    onOpenChange(false);
  };

  const isAdminEmail = ADMIN_EMAILS.includes(draft.email.trim().toLowerCase());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t('Checkout details', '下单信息')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Saved on this device so the next reservation can be filled in automatically.',
              '保存在这台设备上，下次预定时会自动填入。'
            )}
          </DialogDescription>
        </DialogHeader>

        <CheckoutProfileForm value={draft} onChange={setDraft} />

        <Button onClick={handleSave} className="w-full h-11 rounded-xl">
          {t('Save', '保存')}
        </Button>

        {isAdminEmail ? (
          <button
            type="button"
            className="text-xs text-[#6B7280] hover:text-[#111111] transition-colors"
            onClick={() => {
              onOpenChange(false);
              window.location.hash = '/login';
            }}
          >
            {t('Admin sign in', '管理员登录')}
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
