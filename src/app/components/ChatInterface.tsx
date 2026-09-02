import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Loader2, User, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

interface Message {
  id: string;
  senderId: string;
  senderRole: 'customer' | 'admin';
  senderName: string;
  content: string;
  timestamp: number;
}

interface ChatInterfaceProps {
  customerId: string;
  customerName?: string;
  isAdminView: boolean;
  className?: string;
}

export function ChatInterface({ customerId, customerName, isAdminView, className = '' }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { user, session } = useProfile();
  const { t } = useLanguage();

  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;

  // Fetch messages
  const fetchMessages = async () => {
    if (!session?.access_token || !customerId) return;

    try {
      const response = await fetch(`${API_BASE}/chat/messages?customerId=${customerId}&_auth_token=${encodeURIComponent(session.access_token)}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages) {
          // Sort by timestamp
          const sorted = data.messages.sort((a: Message, b: Message) => a.timestamp - b.timestamp);
          setMessages(prev => {
            // Only update if different
            if (JSON.stringify(prev) !== JSON.stringify(sorted)) {
              return sorted;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [customerId, session?.access_token]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Mark as read when opening (for admin)
  useEffect(() => {
    if (isAdminView && customerId && session?.access_token) {
      const markRead = async () => {
        try {
          await fetch(`${API_BASE}/chat/read`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              customerId,
              _auth_token: session.access_token
            }),
          });
        } catch (e) {
          console.error('Error marking read:', e);
        }
      };
      markRead();
    }
  }, [customerId, isAdminView, session?.access_token, messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !session?.access_token) return;

    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          content: newMessage,
          customerId,
          role: isAdminView ? 'admin' : 'customer',
          senderName: isAdminView ? 'Admin' : (user?.user_metadata?.real_name || user?.email || 'Customer'),
          _auth_token: session.access_token
        }),
      });

      if (!response.ok) throw new Error('Failed to send');

      const data = await response.json();
      setMessages(prev => [...prev, data.message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(t('Failed to send message', '发送失败'));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`flex flex-col h-[600px] border rounded-xl bg-white shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isAdminView ? 'bg-gray-200' : 'bg-primary/10'}`}>
            {isAdminView ? <User className="w-5 h-5 text-gray-600" /> : <UserCog className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <h3 className="font-semibold text-sm md:text-base leading-tight">
                {isAdminView ? (customerName || t('Customer', '客户')) : t('Support Chat', '客服咨询')}
            </h3>
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                {t('Online', '在线')}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50" ref={scrollContainerRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <UserCog className="w-8 h-8 text-gray-300" />
            </div>
            <div className="text-center">
                <p className="font-medium">{t('No messages yet', '暂无消息')}</p>
                <p className="text-sm mt-1">{t('Start a conversation...', '开始对话...')}</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            // Check if message is from "me"
            // If admin view: "me" is admin role.
            // If customer view: "me" is customer role.
            const isMe = isAdminView ? msg.senderRole === 'admin' : msg.senderRole === 'customer';
            
            // Check if previous message was from same sender to group them
            const isSequence = index > 0 && messages[index - 1].senderRole === msg.senderRole;

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && !isSequence && (
                    <span className="text-xs text-gray-500 ml-1 mb-1">
                      {msg.senderName}
                    </span>
                  )}
                  <div 
                    className={`px-4 py-2.5 shadow-sm text-sm md:text-base break-words
                    ${isMe 
                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm' 
                        : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                    } ${isSequence ? (isMe ? 'mt-1' : 'mt-1') : ''}`}
                  >
                    {msg.content}
                  </div>
                  <span className={`text-[10px] mt-1 px-1 ${isMe ? 'text-gray-400' : 'text-gray-400'}`}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t shrink-0">
        <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('Type a message...', '输入消息...')}
                  className="pr-4 py-6 bg-gray-50 border-gray-200 focus-visible:ring-primary/20 focus-visible:border-primary transition-all rounded-xl resize-none"
                  disabled={isSending}
                  autoComplete="off"
                />
            </div>
            <Button 
                type="submit" 
                size="icon" 
                disabled={isSending || !newMessage.trim()}
                className={`h-[50px] w-[50px] rounded-xl transition-all shadow-sm ${
                    !newMessage.trim() && !isSending ? 'opacity-50 grayscale' : 'hover:scale-105 active:scale-95'
                }`}
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
        </div>
      </form>
    </div>
  );
}