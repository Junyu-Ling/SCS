import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ChatInterface } from './ChatInterface';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2, Mail } from 'lucide-react';

export default function ChatPage() {
  const { user, profile, loading } = useProfile();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] px-4">
        <Card className="w-full max-w-md text-center shadow-md">
          <CardHeader>
            <div className="mx-auto bg-primary/10 p-4 rounded-full mb-2 w-fit">
              <Mail className="w-10 h-10 text-primary" />
            </div>
            <CardTitle>{t('Contact Us', '联系我们')}</CardTitle>
            <CardDescription>
              {t(
                'Bind your school email first, then you can message us straight from the site.',
                '请先绑定学校邮箱，之后即可直接在站内联系我们。'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => { window.location.hash = '/login'; }}>
              {t('Bind Email', '绑定邮箱')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-100px)]">
      <Card className="h-full flex flex-col shadow-md">
        <CardHeader className="shrink-0 border-b">
          <CardTitle>{t('Contact Us', '联系我们')}</CardTitle>
          <CardDescription>
            {t(
              `Messages are delivered to our team inbox from your bound address (${user.email}), and replies come back here and to your email.`,
              `消息会以你绑定的邮箱（${user.email}）送到我们团队的邮箱，我们的回复会出现在这里。`
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
