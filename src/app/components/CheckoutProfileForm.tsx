import { CHECKOUT_CLASSES, type CheckoutProfile } from '../contexts/CheckoutProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type CheckoutProfileFormProps = {
  value: CheckoutProfile;
  onChange: (next: CheckoutProfile) => void;
  showNote?: boolean;
};

export default function CheckoutProfileForm({
  value,
  onChange,
  showNote = true,
}: CheckoutProfileFormProps) {
  const { t } = useLanguage();

  const update = (patch: Partial<CheckoutProfile>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <Label htmlFor="checkout-name">{t('Real name', '真实姓名')}</Label>
        <Input
          id="checkout-name"
          value={value.realName}
          onChange={(e) => update({ realName: e.target.value })}
          placeholder={t('Your name', '请输入真实姓名')}
          className="h-10 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="checkout-email">{t('Email', '邮箱')}</Label>
        <Input
          id="checkout-email"
          type="email"
          value={value.email}
          onChange={(e) => update({ email: e.target.value })}
          placeholder="name@example.com"
          className="h-10 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="checkout-class">{t('Class', '班级')}</Label>
        <Select value={value.className || undefined} onValueChange={(className) => update({ className })}>
          <SelectTrigger id="checkout-class" className="h-10 rounded-xl">
            <SelectValue placeholder={t('Select class', '请选择班级')} />
          </SelectTrigger>
          <SelectContent>
            {CHECKOUT_CLASSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showNote ? (
        <div className="space-y-1.5">
          <Label htmlFor="checkout-note">
            {t('Note (optional)', '留言（可选）')}
          </Label>
          <Textarea
            id="checkout-note"
            value={value.note}
            onChange={(e) => update({ note: e.target.value })}
            placeholder={t('Anything we should know', '有需要说明的可以写在这里')}
            className="min-h-[88px] rounded-xl"
          />
        </div>
      ) : null}
    </div>
  );
}
