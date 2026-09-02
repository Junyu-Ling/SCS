import type { Context } from 'npm:hono';
import * as kv from './kv_store.tsx';

/**
 * 订单取消 API
 * 允许用户取消待处理的订单
 */

export async function cancelOrder(c: Context) {
  try {
    const { orderId, userId } = await c.req.json();

    if (!orderId || !userId) {
      return c.json({ error: 'Order ID and User ID are required' }, 400);
    }

    // 获取订单 - 使用正确的键名格式 order:xxx
    const orderKey = `order:${orderId}`;
    const orderData = await kv.get(orderKey);

    if (!orderData) {
      return c.json({ error: 'Order not found' }, 404);
    }

    // orderData 已经是对象，不需要 JSON.parse
    const order = orderData;

    // 验证订单所有者 - 订单中使用的是 userId 而不是 user_id
    if (order.userId !== userId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // 只允许取消待处理的订单
    if (order.status !== 'pending') {
      return c.json({ 
        error: 'Only pending orders can be cancelled',
        currentStatus: order.status 
      }, 400);
    }

    // 更新订单状态为已取消
    const updatedOrder = {
      ...order,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    };

    // kv.set 接受对象，不需要 JSON.stringify
    await kv.set(orderKey, updatedOrder);

    console.log(`[CANCEL_ORDER] Order ${orderId} cancelled by user ${userId}`);

    return c.json({
      success: true,
      message: 'Order cancelled successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    return c.json({ error: 'Failed to cancel order' }, 500);
  }
}