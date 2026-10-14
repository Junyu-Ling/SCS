import { useProfile } from '../contexts/ProfileContext';
import { useCheckoutProfile, isCheckoutProfileComplete } from '../contexts/CheckoutProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ChatInterface } from './ChatInterface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Mail, User } from 'lucide-react';

export default function ChatPage() {
  const { user, profile, isAdmin } = useProfile();
  const { checkoutProfile } = useCheckoutProfile();
  const { t } = useLanguage();

  if (user && isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4 h-[calc(100vh-100px)]">
        <Card className="h-full flex flex-col shadow-md">
          <CardHeader className="shrink-0 border-b">
            <CardTitle>{t('Contact Us', '联系我们')}</CardTitle>
            <CardDescription>
              {t(
                `Messages are delivered to our team inbox from your bound address (${user.email}).`,
                `消息会从你的邮箱（${user.email}）送到团队收件箱。`
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ChatInterface
              customerId={user.id}
              customerName={profile?.real_name || user.email || 'Customer'}
              isAdminView={false}
              className="h-full border-0 rounded-none shadow-none"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const ready = isCheckoutProfileComplete(checkoutProfile);

  return (
    <div className="flex justify-center items-center min-h-[50vh] px-4">
      <Card className="w-full max-w-md text-center shadow-none border border-[#E5E7EB] rounded-xl">
        <CardHeader>
          <div className="mx-auto bg-[#F3F4F6] p-4 rounded-xl mb-2 w-fit">
            {ready ? <User className="w-10 h-10 text-primary" /> : <Mail className="w-10 h-10 text-primary" />}
          </div>
          <CardTitle>{t('Contact Us', '联系我们')}</CardTitle>
          <CardDescription>
            {ready
              ? t(
                  `Reservations from ${checkoutProfile.realName} (${checkoutProfile.email}) will email all admins. You can also leave a note at checkout.`,
                  `以 ${checkoutProfile.realName}（${checkoutProfile.email}）提交预定后，所有管理员都会收到邮件。也可以在下单时填写留言。`
                )
              : t(
                  'Tap the person icon in the top bar to save your email, name, and class. Then submit a reservation — admins are notified by email.',
                  '点击右上角小人图标填写邮箱、真实姓名和班级。提交预定后会邮件通知所有管理员。'
                )}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
