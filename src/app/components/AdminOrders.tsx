import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  CheckCircle,
  Clock,
  DollarSign,
  FileDown,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Undo2,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { applyProductState, useProducts, type Product } from '../hooks/useProducts';
import { EditStockModal } from './EditStockModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

/**
 * 管理员后台（需要管理员 Cookie；未登录会跳转到 /login）
 * - 订单：查看 / 标记完成 / 取消 / 清空已完成 / 清空全部 / 录入线下订单 / 导出 Excel
 * - 商品：售罄开关、尺码 / 颜色库存（价格只在代码里改，这里只读）
 * - 管理员：添加 / 撤销（初始管理员不可撤销）
 * 数据全部来自 Vercel Functions（/api/*）+ Upstash Redis。
 */

interface OrderItem {
  id: number;
  name: string;
  nameCn?: string;
  option?: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  orderNumber?: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled' | string;
  completed?: boolean;
  createdAt: string;
  isOffline?: boolean;
  contactInfo?: { real_name?: string; class_name?: string; note?: string };
}

interface AdminEntry {
  email: string;
  initial: boolean;
}

type OrderFilter = 'all' | 'pending' | 'completed' | 'cancelled';

const statusOf = (order: Order): 'pending' | 'completed' | 'cancelled' =>
  order.status === 'cancelled' ? 'cancelled' : order.completed || order.status === 'completed' ? 'completed' : 'pending';

const itemLabel = (item: OrderItem, language: 'en' | 'cn') => {
  const name = language === 'cn' ? item.nameCn || item.name : item.name;
  return `${name}${item.option ? ` (${item.option})` : ''} x${item.quantity}`;
};

export default function AdminOrders() {
  const { t, language } = useLanguage();
  const { user, isAdmin, loading: sessionLoading } = useProfile();
  const { products } = useProducts();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [stockProduct, setStockProduct] = useState<Product | null>(null);

  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [newAdmin, setNewAdmin] = useState('');

  const [offlineOpen, setOfflineOpen] = useState(false);
  const [offlineProductId, setOfflineProductId] = useState('');
  const [offlineOption, setOfflineOption] = useState('');
  const [offlineQty, setOfflineQty] = useState('1');
  const [offlineAmount, setOfflineAmount] = useState('');
  const [offlineBusy, setOfflineBusy] = useState(false);

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof ApiError && err.status === 401) {
        toast.error(t('Session expired, please sign in again', '登录已过期，请重新登录'));
        window.location.hash = '/login';
        return;
      }
      toast.error(err instanceof Error ? err.message : fallback);
    },
    [t],
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ orders: Order[] }>('/api/admin-orders');
      setOrders(data.orders || []);
    } catch (err) {
      handleError(err, t('Failed to load orders', '加载订单失败'));
    } finally {
      setLoading(false);
    }
  }, [handleError, t]);

  const loadAdmins = useCallback(async () => {
    try {
      const data = await api<{ admins: AdminEntry[] }>('/api/admin-users');
      setAdmins(data.admins || []);
    } catch (err) {
      handleError(err, t('Failed to load admins', '加载管理员失败'));
    }
  }, [handleError, t]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !isAdmin) {
      window.location.hash = '/login';
      return;
    }
    void loadOrders();
    void loadAdmins();
  }, [sessionLoading, user, isAdmin, loadOrders, loadAdmins]);

  const visibleOrders = useMemo(
    () => (filter === 'all' ? orders : orders.filter((o) => statusOf(o) === filter)),
    [orders, filter],
  );

  const counts = useMemo(() => {
    const c = { pending: 0, completed: 0, cancelled: 0, revenue: 0 };
    for (const o of orders) {
      const s = statusOf(o);
      c[s] += 1;
      if (s !== 'cancelled') c.revenue += o.total || 0;
    }
    return c;
  }, [orders]);

  const setStatus = async (order: Order, status: 'pending' | 'completed' | 'cancelled') => {
    setBusyId(order.id);
    try {
      const data = await api<{ order: Order }>('/api/admin-orders', {
        method: 'PATCH',
        body: { orderId: order.id, status },
      });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? data.order : o)));
    } catch (err) {
      handleError(err, t('Failed to update order', '更新订单失败'));
    } finally {
      setBusyId(null);
    }
  };

  const clearOrders = async (scope: 'completed' | 'all') => {
    const count = scope === 'all' ? orders.length : counts.completed;
    if (count === 0) {
      toast.info(t('Nothing to clear', '没有可清空的订单'));
      return;
    }
    const ok = window.confirm(
      scope === 'all'
        ? t(`Delete ALL ${count} orders? This cannot be undone.`, `确定删除全部 ${count} 个订单吗？此操作无法撤销。`)
        : t(`Delete ${count} completed orders? This cannot be undone.`, `确定删除 ${count} 个已完成订单吗？此操作无法撤销。`),
    );
    if (!ok) return;
    try {
      const data = await api<{ deletedCount: number }>(`/api/admin-orders?scope=${scope}`, { method: 'DELETE' });
      toast.success(t(`Deleted ${data.deletedCount} order(s)`, `已删除 ${data.deletedCount} 个订单`));
      void loadOrders();
    } catch (err) {
      handleError(err, t('Failed to clear orders', '清空订单失败'));
    }
  };

  const exportToExcel = () => {
    if (orders.length === 0) {
      toast.info(t('No orders to export', '没有可导出的订单'));
      return;
    }
    const rows = orders.map((o, i) => ({
      '#': i + 1,
      [t('Reservation ID', '预定号')]: o.orderNumber || o.id,
      [t('Date', '日期')]: new Date(o.createdAt).toLocaleString('zh-CN'),
      [t('Name', '姓名')]: o.contactInfo?.real_name ?? '',
      [t('Class', '班级')]: o.contactInfo?.class_name ?? '',
      [t('Email', '邮箱')]: o.isOffline ? '' : o.userEmail,
      [t('Items', '商品')]: o.items.map((item) => itemLabel(item, language)).join('; '),
      [t('Total', '总价')]: o.total,
      [t('Status', '状态')]: statusOf(o),
      [t('Note', '留言')]: o.contactInfo?.note ?? '',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, t('Reservations', '预定列表'));
    XLSX.writeFile(book, `${t('Reservations', '预定列表')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ---------------------------------------------------------------- 商品

  const toggleAvailable = async (product: Product, available: boolean) => {
    try {
      await api('/api/products', { method: 'PATCH', body: { id: product.id, available } });
      applyProductState(product.id, { available });
      toast.success(available ? t('Marked as in stock', '已标记为有货') : t('Marked as sold out', '已标记为售罄'));
    } catch (err) {
      handleError(err, t('Failed to update product', '更新商品失败'));
    }
  };

  // ---------------------------------------------------------------- 管理员

  const addAdmin = async () => {
    const email = newAdmin.trim().toLowerCase();
    if (!/^[^\s@]+@(stu\.)?scls-sh\.org$/.test(email)) {
      toast.error(t('Please enter a school email', '请输入学校邮箱'));
      return;
    }
    try {
      await api('/api/admin-users', { method: 'POST', body: { email } });
      setNewAdmin('');
      toast.success(t('Admin added', '已添加管理员'));
      void loadAdmins();
    } catch (err) {
      handleError(err, t('Failed to add admin', '添加管理员失败'));
    }
  };

  const removeAdmin = async (email: string) => {
    if (!window.confirm(t(`Revoke admin access for ${email}?`, `确定撤销 ${email} 的管理员权限吗？`))) return;
    try {
      await api('/api/admin-users', { method: 'DELETE', body: { email } });
      toast.success(t('Admin revoked', '已撤销管理员'));
      void loadAdmins();
    } catch (err) {
      handleError(err, t('Failed to revoke admin', '撤销管理员失败'));
    }
  };

  // ---------------------------------------------------------------- 线下订单

  const offlineProduct = products.find((p) => String(p.id) === offlineProductId) ?? null;
  const offlineOptions = offlineProduct?.options ? Object.keys(offlineProduct.options) : [];

  const defaultAmount = (productId: string, qty: string) => {
    const p = products.find((x) => String(x.id) === productId);
    const n = parseInt(qty, 10);
    return p && n > 0 ? String(Math.round(p.price * n * 100) / 100) : '';
  };

  const submitOffline = async () => {
    const quantity = parseInt(offlineQty, 10);
    const amount = Number(offlineAmount);
    if (!offlineProduct) return toast.error(t('Please select a product', '请选择商品'));
    if (!Number.isInteger(quantity) || quantity < 1) return toast.error(t('Please enter valid quantity', '请输入有效数量'));
    if (offlineOptions.length > 0 && !offlineOption) return toast.error(t('Please select size/option', '请选择尺码/规格'));
    if (!(amount >= 0)) return toast.error(t('Please enter a valid amount', '请输入有效金额'));

    setOfflineBusy(true);
    try {
      await api('/api/admin-orders', {
        method: 'POST',
        body: {
          productId: offlineProduct.id,
          productName: offlineProduct.name.en,
          option: offlineOption,
          quantity,
          amount,
        },
      });
      toast.success(t('Offline order recorded', '线下订单已录入'));
      setOfflineOpen(false);
      setOfflineProductId('');
      setOfflineOption('');
      setOfflineQty('1');
      setOfflineAmount('');
      void loadOrders();
    } catch (err) {
      handleError(err, t('Failed to record order', '录入订单失败'));
    } finally {
      setOfflineBusy(false);
    }
  };

  // ---------------------------------------------------------------- 渲染

  if (sessionLoading || !isAdmin) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusBadge = (order: Order) => {
    const s = statusOf(order);
    const cls =
      s === 'completed'
        ? 'border-green-200 bg-green-50 text-green-700'
        : s === 'cancelled'
          ? 'border-gray-200 bg-gray-50 text-gray-500'
          : 'border-yellow-200 bg-yellow-50 text-yellow-700';
    const label = s === 'completed' ? t('Completed', '已完成') : s === 'cancelled' ? t('Cancelled', '已取消') : t('Pending', '未完成');
    return (
      <Badge variant="outline" className={`font-normal ${cls}`}>
        {label}
      </Badge>
    );
  };

  const rowActions = (order: Order) => {
    const s = statusOf(order);
    const busy = busyId === order.id;
    return (
      <div className="flex justify-end gap-1">
        {s !== 'completed' ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus(order, 'completed')} className="h-8 px-2 text-green-700 hover:bg-green-50">
            <CheckCircle className="mr-1 h-4 w-4" />
            {t('Complete', '完成')}
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus(order, 'pending')} className="h-8 px-2">
            <Undo2 className="mr-1 h-4 w-4" />
            {t('Reopen', '恢复')}
          </Button>
        )}
        {s === 'pending' ? (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setStatus(order, 'cancelled')} className="h-8 px-2 text-red-600 hover:bg-red-50">
            <XCircle className="mr-1 h-4 w-4" />
            {t('Cancel', '取消')}
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('Admin Dashboard', '管理员后台')}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
        <Button variant="outline" onClick={() => (window.location.hash = '/sales')}>
          <DollarSign className="mr-2 h-4 w-4" />
          {t('Sales statistics', '销售统计')}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t('Pending', '未完成'), value: counts.pending, icon: Clock },
          { label: t('Completed', '已完成'), value: counts.completed, icon: CheckCircle },
          { label: t('Cancelled', '已取消'), value: counts.cancelled, icon: XCircle },
          { label: t('Revenue', '总金额'), value: `¥${counts.revenue.toFixed(2)}`, icon: DollarSign },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-xl shadow-none">
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className="h-5 w-5 text-[#174D3D]" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="orders" className="w-full space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
          <TabsTrigger value="orders">{t('Orders', '订单管理')}</TabsTrigger>
          <TabsTrigger value="products">{t('Products', '商品管理')}</TabsTrigger>
          <TabsTrigger value="admins">{t('Admins', '管理员')}</TabsTrigger>
        </TabsList>

        {/* ---------------- 订单 ---------------- */}
        <TabsContent value="orders">
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{t('Reservations', '预定列表')}</CardTitle>
                  <CardDescription>{t('Online and offline reservations', '线上与线下预定')}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={filter} onValueChange={(v) => setFilter(v as OrderFilter)}>
                    <SelectTrigger className="h-9 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('All', '全部')}</SelectItem>
                      <SelectItem value="pending">{t('Pending', '未完成')}</SelectItem>
                      <SelectItem value="completed">{t('Completed', '已完成')}</SelectItem>
                      <SelectItem value="cancelled">{t('Cancelled', '已取消')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => void loadOrders()} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('Refresh', '刷新')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setOfflineOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('Offline order', '录入线下订单')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToExcel}>
                    <FileDown className="mr-2 h-4 w-4" />
                    {t('Export', '导出')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void clearOrders('completed')}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('Clear completed', '清空已完成')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void clearOrders('all')}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('Clear all', '清空全部')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>{t('Reservation ID', '预定号')}</TableHead>
                        <TableHead>{t('Date', '日期')}</TableHead>
                        <TableHead>{t('Customer', '客户')}</TableHead>
                        <TableHead>{t('Items', '商品')}</TableHead>
                        <TableHead className="text-right">{t('Total', '总价')}</TableHead>
                        <TableHead>{t('Status', '状态')}</TableHead>
                        <TableHead className="text-right">{t('Action', '操作')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">#{order.orderNumber || order.id.slice(-8)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell className="text-sm">
                            {order.isOffline ? (
                              <span className="text-gray-500">{t('Offline', '线下')}</span>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-medium">{order.contactInfo?.real_name}</span>
                                <span className="text-xs text-gray-500">
                                  {order.contactInfo?.class_name} · {order.userEmail}
                                </span>
                                {order.contactInfo?.note ? (
                                  <span className="text-xs text-gray-500">“{order.contactInfo.note}”</span>
                                ) : null}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5 text-sm">
                              {order.items.map((item, idx) => (
                                <span key={idx}>{itemLabel(item, language)}</span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">¥{Number(order.total).toFixed(2)}</TableCell>
                          <TableCell>{statusBadge(order)}</TableCell>
                          <TableCell>{rowActions(order)}</TableCell>
                        </TableRow>
                      ))}
                      {visibleOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-14 text-center text-muted-foreground">
                            <ShoppingBag className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                            {t('No reservations', '暂无预定')}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- 商品 ---------------- */}
        <TabsContent value="products">
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle>{t('Products', '商品管理')}</CardTitle>
              <CardDescription>
                {t(
                  'Prices are defined in code (src/app/data/catalog.ts) and cannot be edited here. You can toggle sold-out and edit stock.',
                  '价格写在代码里（src/app/data/catalog.ts），这里不能修改。可以切换售罄状态、编辑库存。',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>{t('Product', '商品')}</TableHead>
                      <TableHead>{t('Category', '分类')}</TableHead>
                      <TableHead className="text-right">{t('Price', '价格')}</TableHead>
                      <TableHead>{t('Stock', '库存')}</TableHead>
                      <TableHead>{t('In stock', '有货')}</TableHead>
                      <TableHead className="text-right">{t('Action', '操作')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...products]
                      .sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id)
                      .map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {language === 'en' ? product.name.en : product.name.cn}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{product.category}</TableCell>
                          <TableCell className="text-right">¥{product.price.toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {product.options
                              ? Object.entries(product.options)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(' · ')
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={product.available !== false}
                              onCheckedChange={(checked) => void toggleAvailable(product, checked)}
                              aria-label={t('In stock', '有货')}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {product.options ? (
                              <Button size="sm" variant="outline" onClick={() => setStockProduct(product)}>
                                <Package className="mr-1 h-4 w-4" />
                                {t('Edit stock', '编辑库存')}
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- 管理员 ---------------- */}
        <TabsContent value="admins">
          <Card className="rounded-xl shadow-none">
            <CardHeader>
              <CardTitle>{t('Admins', '管理员')}</CardTitle>
              <CardDescription>
                {t(
                  'Admins sign in with an emailed code. Initial admins (defined in code) cannot be revoked.',
                  '管理员通过邮箱验证码登录。初始管理员（写在代码里）不能被撤销。',
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Input
                  value={newAdmin}
                  onChange={(e) => setNewAdmin(e.target.value)}
                  placeholder="name@stu.scls-sh.org"
                  className="max-w-sm"
                  onKeyDown={(e) => e.key === 'Enter' && void addAdmin()}
                />
                <Button onClick={() => void addAdmin()}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('Add admin', '添加管理员')}
                </Button>
              </div>
              <ul className="divide-y rounded-md border">
                {admins.map((admin) => (
                  <li key={admin.email} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>
                      {admin.email}
                      {admin.initial ? (
                        <Badge variant="outline" className="ml-2 font-normal">
                          {t('Initial', '初始')}
                        </Badge>
                      ) : null}
                    </span>
                    {!admin.initial ? (
                      <Button size="sm" variant="ghost" onClick={() => void removeAdmin(admin.email)} className="text-red-600 hover:bg-red-50">
                        {t('Revoke', '撤销')}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EditStockModal
        product={stockProduct}
        isOpen={stockProduct !== null}
        onClose={() => setStockProduct(null)}
        onUpdate={() => undefined}
      />

      {/* ---------------- 线下订单对话框 ---------------- */}
      <Dialog open={offlineOpen} onOpenChange={setOfflineOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{t('Record offline order', '录入线下订单')}</DialogTitle>
            <DialogDescription>
              {t('Offline sales are marked completed and counted in the statistics.', '线下订单会直接标记为已完成，并计入销售统计。')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t('Product', '商品')}</Label>
              <Select
                value={offlineProductId}
                onValueChange={(v) => {
                  setOfflineProductId(v);
                  setOfflineOption('');
                  setOfflineAmount(defaultAmount(v, offlineQty));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Select a product', '请选择商品')} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {language === 'en' ? p.name.en : p.name.cn} · ¥{p.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {offlineOptions.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <Label>{t('Size / option', '尺码 / 规格')}</Label>
                <Select value={offlineOption} onValueChange={setOfflineOption}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select', '请选择')} />
                  </SelectTrigger>
                  <SelectContent>
                    {offlineOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t('Quantity', '数量')}</Label>
                <Input
                  inputMode="numeric"
                  value={offlineQty}
                  onChange={(e) => {
                    setOfflineQty(e.target.value);
                    setOfflineAmount(defaultAmount(offlineProductId, e.target.value));
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('Total amount (¥)', '总金额（¥）')}</Label>
                <Input inputMode="decimal" value={offlineAmount} onChange={(e) => setOfflineAmount(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfflineOpen(false)} disabled={offlineBusy}>
              {t('Cancel', '取消')}
            </Button>
            <Button onClick={() => void submitOffline()} disabled={offlineBusy}>
              {offlineBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Save', '保存')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
