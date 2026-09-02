import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { TrendingUp, DollarSign, Package, ShoppingBag, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface SalesData {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueGrowth: number;
  ordersGrowth: number;
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
  }>;
}

export default function SalesStatistics() {
  const { t, language } = useLanguage();
  const { user, isAdmin } = useProfile();
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (!user || !isAdmin) {
      window.location.href = '#/';
      return;
    }
    fetchSalesData();
  }, [user, isAdmin, timeRange]);

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4/sales-statistics?range=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }

      const data = await response.json();
      setSalesData(data);
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('Sales Statistics', '销售统计')}
          </h1>
          <p className="text-muted-foreground">
            {t('Overview of sales performance and trends', '销售业绩和趋势概览')}
          </p>
        </div>

        {/* Time Range Filter */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              timeRange === '7d'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground border border-border hover:bg-accent'
            }`}
          >
            {t('Last 7 Days', '最近7天')}
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              timeRange === '30d'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground border border-border hover:bg-accent'
            }`}
          >
            {t('Last 30 Days', '最近30天')}
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              timeRange === '90d'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-card-foreground border border-border hover:bg-accent'
            }`}
          >
            {t('Last 90 Days', '最近90天')}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : salesData ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total Revenue */}
              <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  {salesData.revenueGrowth !== 0 && (
                    <div className={`flex items-center gap-1 text-sm ${
                      salesData.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {salesData.revenueGrowth > 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>{Math.abs(salesData.revenueGrowth).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  ¥{salesData.totalRevenue.toFixed(2)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('Total Revenue', '总收入')}
                </p>
              </div>

              {/* Total Orders */}
              <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShoppingBag className="w-6 h-6 text-primary" />
                  </div>
                  {salesData.ordersGrowth !== 0 && (
                    <div className={`flex items-center gap-1 text-sm ${
                      salesData.ordersGrowth > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {salesData.ordersGrowth > 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>{Math.abs(salesData.ordersGrowth).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-foreground">{salesData.totalOrders}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('Total Reservations', '总预定数')}
                </p>
              </div>

              {/* Total Products */}
              <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{salesData.totalProducts}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('Total Products', '商品总数')}
                </p>
              </div>

              {/* Total Customers */}
              <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground">{salesData.totalCustomers}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('Total Customers', '客户总数')}
                </p>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-card rounded-lg p-6 border border-border shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                {t('Top Selling Products', '热销商品排行')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t('Rank', '排名')}
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t('Product', '商品')}
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t('Sales', '销量')}
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        {t('Revenue', '收入')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.topProducts.map((product, index) => (
                      <tr key={product.id} className="border-b border-border last:border-b-0">
                        <td className="py-3 px-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-600 text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-foreground">{product.name}</td>
                        <td className="py-3 px-4 text-right text-foreground font-medium">
                          {product.sales}
                        </td>
                        <td className="py-3 px-4 text-right text-primary font-semibold">
                          ¥{product.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('No data available', '暂无数据')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
