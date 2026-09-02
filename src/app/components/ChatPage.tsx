import React from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ChatInterface } from './ChatInterface';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2 } from 'lucide-react';

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
      <div className="flex justify-center items-center h-[50vh]">
        {t('Please log in to contact support.', '请登录后联系客服')}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 h-[calc(100vh-100px)]">
      <Card className="h-full flex flex-col shadow-md">
        <CardHeader className="shrink-0 border-b">
          <CardTitle>{t('Customer Service', '在线客服')}</CardTitle>
          <CardDescription>
            {t('Chat with our support team', '与我们的客服团队沟通')}
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
