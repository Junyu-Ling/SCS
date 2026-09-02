import { useEffect, useState } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, RefreshCw, Clock, Trash2, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner';

import { CartItem } from '../contexts/CartContext';

interface Order {
  id: string;
  orderNumber?: string; // 新的预定号格式（YYYYMMDDXXX）
  userId: string;
  userEmail: string;
  items: CartItem[];
  total: number;
  status: string;
  createdAt: string;
  completed?: boolean; // 管理员标记为已完成
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;

export default function OrderHistory() {
  const { session, user, profile, loading } = useProfile();
  const { language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 翻译函数
  const t = (en: string, cn: string) => language === 'en' ? en : cn;

  useEffect(() => {
    if (!loading && user && session) {
      loadOrders();
    } else if (!loading && !user) {
      setFetching(false);
    }
  }, [loading, user, session]);

  /**
   * 从后端 API 加载订单（云端同步）
   */
  const loadOrders = async () => {
    if (!user || !session) {
      console.log('[OrderHistory] Cannot load - no user or session');
      setFetching(false);
      return;
    }

    try {
      setFetching(true);
      setError(null);
      
      console.log('[OrderHistory] Getting fresh session...');
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[OrderHistory] Session error:', sessionError);
        setError('Session expired, please log in again / 会话过期，请重新登录');
        setOrders([]);
        return;
      }
      
      console.log('[OrderHistory] Fetching orders from API...');
      
      // 使用 anon key 通过网关，token 通过查询参数传递
      const url = `${API_BASE}/orders?_auth_token=${encodeURIComponent(freshSession.access_token)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OrderHistory] Failed to fetch orders:', response.status, errorData);
        
        if (response.status === 401) {
          setError('Session expired, please log in again / 会话过期，请重新登录');
        } else {
          setError(errorData.error || 'Failed to load orders / 加载订单失败');
        }
        setOrders([]);
        return;
      }

      const data = await response.json();
      const fetchedOrders = data.orders || [];
      
      // 按创建时间降序排序
      const sorted = fetchedOrders.sort((a: Order, b: Order) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setOrders(sorted);
      console.log('[OrderHistory] Orders loaded from API:', sorted.length);
    } catch (error) {
      console.error('[OrderHistory] Failed to load orders:', error);
      setError(error instanceof Error ? error.message : 'Failed to load orders / 加载订单失败');
      setOrders([]);
    } finally {
      setFetching(false);
    }
  };

  /**
   * 清空已完成的订单
   */
  const clearCompletedOrders = async () => {
    if (!user || !session) {
      toast.error('Please log in / 请先登录');
      return;
    }

    // 统计已完成订单数量
    const completedCount = orders.filter(o => o.completed || o.status === 'completed').length;
    
    if (completedCount === 0) {
      toast.info(language === 'en' ? 'No completed orders to clear' : '没有已完成的订单可清空');
      return;
    }

    // 确认操作
    const confirmed = window.confirm(
      language === 'en' 
        ? `Delete ${completedCount} completed order(s)? This action cannot be undone.`
        : `确定删除 ${completedCount} 个已完成订单吗？此操作无法撤销。`
    );

    if (!confirmed) {
      return;
    }

    try {
      console.log('[OrderHistory] Clearing completed orders...');
      
      // 获取最新 session
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[OrderHistory] Session error:', sessionError);
        toast.error('Session expired, please log in again / 会话过期，请重新登录');
        return;
      }

      const response = await fetch(`${API_BASE}/orders/completed`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          _auth_token: freshSession.access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OrderHistory] Failed to clear completed orders:', response.status, errorData);
        toast.error(errorData.error || 'Failed to clear completed orders / 清空订单失败');
        return;
      }

      const data = await response.json();
      console.log('[OrderHistory] Completed orders cleared:', data.deletedCount);

      toast.success(language === 'en' 
        ? `Successfully deleted ${data.deletedCount} completed order(s)`
        : `成功删除 ${data.deletedCount} 个已完成订单`);

      // 重新加载订单列表
      loadOrders();
    } catch (error) {
      console.error('[OrderHistory] Error clearing completed orders:', error);
      toast.error('Error clearing completed orders / 清空订单错误');
    }
  };

  /**
   * 取消订单
   */
  const cancelOrder = async (orderId: string) => {
    if (!user || !session) {
      console.log('[OrderHistory] Cannot cancel - no user or session');
      return;
    }

    try {
      console.log('[OrderHistory] Getting fresh session for cancel...');
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[OrderHistory] Session error:', sessionError);
        toast.error('Session expired, please log in again / 会话过期，请重新登录');
        return;
      }

      const response = await fetch(`${API_BASE}/cancel-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          orderId,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OrderHistory] Failed to cancel order:', response.status, errorData);
        toast.error(errorData.error || 'Failed to cancel order / 取消订单失败');
        return;
      }

      const data = await response.json();
      console.log('[OrderHistory] Order cancelled:', data);

      toast.success(language === 'en' 
        ? 'Order cancelled successfully'
        : '订单已取消');

      // 重新加载订单列表
      loadOrders();
    } catch (error) {
      console.error('[OrderHistory] Error cancelling order:', error);
      toast.error('Error cancelling order / 取消订单错误');
    }
  };

  if (loading || (fetching && user)) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        Please log in to view orders.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="h-full flex flex-col shadow-md">
        <CardHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('My Reservations', '我的预定')}</CardTitle>
              <CardDescription>{t('View your reservation history', '查看预定历史')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearCompletedOrders}
                disabled={fetching || orders.filter(o => o.completed || o.status === 'completed').length === 0}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('Clear Completed', '清空已完成')}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadOrders}
                disabled={fetching}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? 'animate-spin' : ''}`} />
                {t('Refresh', '刷新')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {/* 移动端：卡片式布局 */}
          <div className="block lg:hidden space-y-4">
            {orders.map((order) => {
              const isCompleted = order.completed || order.status === 'completed';
              const isCancelled = order.status === 'cancelled';
              const isPending = !isCompleted && !isCancelled;
              
              return (
                <div 
                  key={order.id} 
                  className={`border rounded-xl p-4 space-y-3 shadow-sm transition-all ${
                    isCompleted ? 'bg-green-50/50 border-green-100' : 
                    isCancelled ? 'bg-gray-50/50 border-gray-100' :
                    'bg-white border-gray-200 hover:border-primary/30'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                          <p className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            #{order.orderNumber || order.id.slice(-8)}
                          </p>
                          <span className="text-xs text-gray-400">
                             {new Date(order.createdAt).toLocaleDateString('zh-CN', {
                               month: '2-digit',
                               day: '2-digit',
                               hour: '2-digit',
                               minute: '2-digit'
                             })}
                          </span>
                      </div>
                    </div>
                    <Badge variant={isCompleted ? "default" : isCancelled ? "secondary" : "outline"} className={
                        isCompleted ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : 
                        isCancelled ? "bg-gray-100 text-gray-600 hover:bg-gray-100 border-gray-200" :
                        "border-yellow-500 text-yellow-600 bg-yellow-50"
                      }>
                        {isCompleted ? t('Completed', '已完成') : isCancelled ? t('Cancelled', '已取消') : t('Pending', '未完成')}
                    </Badge>
                  </div>

                  <div className="py-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-0.5">
                          <span>{item.name} {item.option && item.option !== 'Default' && <span className="text-gray-400 text-xs">({item.option})</span>}</span>
                          <span className="font-medium text-gray-600">x{item.quantity}</span>
                        </div>
                      ))}
                  </div>

                  <div className="border-t border-dashed pt-3 flex justify-between items-center">
                    <div className="flex gap-2">
                        {isPending && (
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelOrder(order.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 text-xs"
                            >
                            {t('Cancel Order', '取消订单')}
                            </Button>
                        )}
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs text-gray-500">{t('Total', '总计')}</span>
                        <span className="font-bold text-lg text-gray-900">
                        ¥{order.total.toFixed(2)}
                        </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && !error && (
              <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-xl bg-gray-50/50">
                <p>{t("You haven't placed any orders yet.", '您还没有下过订单')}</p>
              </div>
            )}
            {error && (
              <div className="text-center py-12 text-red-500 border rounded-lg border-red-200 bg-red-50">
                {error}
              </div>
            )}
          </div>

          {/* 桌面端：表格布局 */}
          <div className="hidden lg:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="min-w-[120px]">{t('Reservation ID', '预定号')}</TableHead>
                  <TableHead className="min-w-[150px]">{t('Date', '日期')}</TableHead>
                  <TableHead className="min-w-[200px]">{t('Items', '商品')}</TableHead>
                  <TableHead className="text-right min-w-[100px]">{t('Total', '总价')}</TableHead>
                  <TableHead className="min-w-[100px]">{t('Status', '状态')}</TableHead>
                  <TableHead className="min-w-[80px] text-right">{t('Action', '操作')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const isCompleted = order.completed || order.status === 'completed';
                  const isCancelled = order.status === 'cancelled';
                  const isPending = !isCompleted && !isCancelled;
                  
                  return (
                    <TableRow key={order.id} className={`hover:bg-gray-50/50 transition-colors ${
                      isCompleted ? 'bg-green-50/10' : 
                      isCancelled ? 'bg-gray-50/30' :
                      ''
                    }`}>
                      <TableCell className="font-mono text-xs text-gray-500">#{order.orderNumber || order.id.slice(-8)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {order.items.map((item, idx) => (
                            <span key={idx} className="text-sm text-gray-700">
                              {item.name} <span className="text-gray-400 text-xs">x{item.quantity}</span>
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-900">¥{order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-normal ${
                          isCompleted ? "border-green-200 text-green-700 bg-green-50" : 
                          isCancelled ? "border-gray-200 text-gray-500 bg-gray-50" :
                          "border-yellow-200 text-yellow-700 bg-yellow-50"
                        }`}>
                          {isCompleted ? t('Completed', '已完成') : isCancelled ? t('Cancelled', '已取消') : t('Pending', '未完成')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelOrder(order.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                            title={t('Cancel Order', '取消订单')}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {orders.length === 0 && !error && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-muted-foreground border-none">
                      <div className="flex flex-col items-center gap-2">
                          <Clock className="w-8 h-8 text-gray-200" />
                          <p>{t("You haven't placed any orders yet.", '您还没有下过订单')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {error && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-red-500 bg-red-50/50">
                      {error}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
