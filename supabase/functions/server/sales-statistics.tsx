import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';

/**
 * 销售统计 API
 * 提供销售数据的统计和分析
 */

export async function getSalesStatistics(c: Context) {
  try {
    const range = c.req.query('range') || '30d';
    
    // 计算日期范围
    const now = new Date();
    let startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // 获取所有订单 - 使用正确的前缀 order:
    const orders = await kv.getByPrefix('order:');
    
    // 过滤日期范围内的订单
    // getByPrefix 返回的已经是对象数组，不需要 JSON.parse
    const filteredOrders = orders
      .filter(order => order && order.createdAt) // 过滤掉无效数据
      .filter(order => {
        const orderDate = new Date(order.createdAt || order.created_at);
        return orderDate >= startDate && orderDate <= now;
      });

    // 计算总收入
    const totalRevenue = filteredOrders.reduce((sum, order) => {
      if (order.status !== 'cancelled') {
        return sum + (order.total || order.total_price || 0);
      }
      return sum;
    }, 0);

    // 计算总订单数
    const totalOrders = filteredOrders.filter(o => o.status !== 'cancelled').length;

    // 获取所有商品
    const products = await kv.getByPrefix('product_');
    const totalProducts = products.length;

    // 获取所有用户
    const profiles = await kv.getByPrefix('profile_');
    const totalCustomers = profiles.length;

    // 计算增长率（对比前一个周期）
    let prevStartDate = new Date(startDate);
    let prevEndDate = new Date(startDate);
    
    const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff);
    
    // orders 已经是对象数组，不需要再次 JSON.parse
    const prevOrders = orders
      .filter(order => order && order.createdAt) // 过滤掉无效数据
      .filter(order => {
        const orderDate = new Date(order.createdAt || order.created_at);
        return orderDate >= prevStartDate && orderDate < startDate;
      });

    const prevRevenue = prevOrders.reduce((sum, order) => {
      if (order.status !== 'cancelled') {
        return sum + (order.total || order.total_price || 0);
      }
      return sum;
    }, 0);

    const prevOrderCount = prevOrders.filter(o => o.status !== 'cancelled').length;

    const revenueGrowth = prevRevenue > 0 
      ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 
      : 0;
    
    const ordersGrowth = prevOrderCount > 0 
      ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100 
      : 0;

    // 计算热销商品
    const productSales: { [key: string]: { sales: number; revenue: number; name: string } } = {};
    
    filteredOrders.forEach(order => {
      if (order.status !== 'cancelled' && order.items) {
        order.items.forEach((item: any) => {
          const key = `${item.product_id}_${item.name}`;
          if (!productSales[key]) {
            productSales[key] = {
              sales: 0,
              revenue: 0,
              name: item.name
            };
          }
          productSales[key].sales += item.quantity || 1;
          productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
        });
      }
    });

    const topProducts = Object.entries(productSales)
      .map(([key, data]) => ({
        id: parseInt(key.split('_')[0]) || 0,
        name: data.name,
        sales: data.sales,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // 按日期统计收入
    const revenueByDay: { [key: string]: { revenue: number; orders: number } } = {};
    
    filteredOrders.forEach(order => {
      if (order.status !== 'cancelled') {
        const date = new Date(order.createdAt || order.created_at).toISOString().split('T')[0];
        if (!revenueByDay[date]) {
          revenueByDay[date] = { revenue: 0, orders: 0 };
        }
        revenueByDay[date].revenue += order.total || order.total_price || 0;
        revenueByDay[date].orders += 1;
      }
    });

    const revenueByDayArray = Object.entries(revenueByDay)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 按分类统计
    const categoryRevenue: { [key: string]: number } = {};
    let totalCategoryRevenue = 0;
    
    filteredOrders.forEach(order => {
      if (order.status !== 'cancelled' && order.items) {
        order.items.forEach((item: any) => {
          const category = item.category || 'Other';
          if (!categoryRevenue[category]) {
            categoryRevenue[category] = 0;
          }
          const itemRevenue = (item.price || 0) * (item.quantity || 1);
          categoryRevenue[category] += itemRevenue;
          totalCategoryRevenue += itemRevenue;
        });
      }
    });

    const categoryDistribution = Object.entries(categoryRevenue)
      .map(([name, value]) => ({
        name,
        value: totalCategoryRevenue > 0 
          ? Math.round((value / totalCategoryRevenue) * 100 * 10) / 10
          : 0
      }))
      .sort((a, b) => b.value - a.value);

    return c.json({
      totalRevenue,
      totalOrders,
      totalProducts,
      totalCustomers,
      revenueGrowth,
      ordersGrowth,
      topProducts,
      revenueByDay: revenueByDayArray,
      categoryDistribution
    });

  } catch (error) {
    console.error('Error fetching sales statistics:', error);
    return c.json({ error: 'Failed to fetch sales statistics' }, 500);
  }
}