import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
import { getSeedProductById, initializeProducts, ensureMissingSeedProducts } from "./init-products.tsx";
import { initializeBucket, uploadImageFromBase64, deleteMultipleImages } from "./storage-utils.tsx";
import { addUserManagementRoutes } from "./user-management.tsx";
import { getSalesStatistics } from "./sales-statistics.tsx";
import { cancelOrder } from "./cancel-order.tsx";

const app = new Hono();
const BASE_PATH = "/make-server-c4f5ade4";

// 服务器启动时初始化 Storage bucket
console.log('[SERVER] Initializing storage bucket...');
initializeBucket().catch(e => console.error('[SERVER] Failed to initialize bucket:', e));

// 服务器启动时初始化产品数据，然后自动清理 blob URLs
console.log('[SERVER] Initializing products...');
initializeProducts()
  .then(async () => {
    // 🔧 初始化完成后，自动清理 blob URLs 和 /_assets/ URLs
    console.log('[SERVER] Auto-cleaning invalid URLs from product:{id} keys...');
    try {
      const productIds = await kv.get('product:_all_ids') as number[] | null;
      if (!productIds || !Array.isArray(productIds)) {
        console.log('[SERVER] ✅ No product IDs found, skipping URL cleanup');
        return;
      }

      let fixedCount = 0;
      for (const id of productIds) {
        const product = await kv.get(`product:${id}`) as any;
        if (!product || !product.images || !Array.isArray(product.images)) continue;

        const hasInvalidUrls = product.images.some((url: string) =>
          typeof url === 'string' && (url.startsWith('blob:') || url.includes('/_assets/'))
        );

        if (hasInvalidUrls) {
          console.log(`[SERVER] 🔧 Auto-fixing product ${id} with invalid URLs...`);
          product.images = product.images.filter((url: string) =>
            typeof url === 'string' && !url.startsWith('blob:') && !url.includes('/_assets/')
          );
          await kv.set(`product:${id}`, product);
          fixedCount++;
        }
      }

      console.log(fixedCount > 0
        ? `[SERVER] ✅ Auto-fixed ${fixedCount} products with invalid URLs`
        : '[SERVER] ✅ All products are clean, no invalid URLs found');

      // 🔧 一次性修复：将 hooded sweatshirt (product:2) 强制归类到 apparel
      const product2 = await kv.get('product:2') as any;
      if (product2 && product2.category !== 'apparel') {
        console.log(`[SERVER] 🔧 Fixing product:2 category from "${product2.category}" to "apparel"...`);
        product2.category = 'apparel';
        if (product2.tags && Array.isArray(product2.tags)) {
          product2.tags = product2.tags.filter((t: string) => t !== 'stationery');
          if (!product2.tags.includes('apparel')) product2.tags.push('apparel');
        }
        await kv.set('product:2', product2);
        console.log('[SERVER] ✅ Product:2 (Hooded Sweatshirt) moved to apparel');
      }

      // 🔧 连帽卫衣 (product:2)：仅存 Default 一栏时拆成 S/M/L/XL，前台才能选尺码
      const hoodedForSizes = await kv.get('product:2') as any;
      const seedHooded = getSeedProductById(2);
      if (hoodedForSizes && seedHooded?.options && hoodedForSizes.category === 'apparel') {
        const opts = hoodedForSizes.options as Record<string, number>;
        const optKeys = opts && typeof opts === 'object' ? Object.keys(opts) : [];
        if (optKeys.length === 1 && optKeys[0] === 'Default') {
          const total = Math.max(0, Math.round(Number(opts.Default) || 0));
          hoodedForSizes.options = distributeApparelSizesFromSeed(total, seedHooded.options as Record<string, number>);
          if (!hoodedForSizes.sizeGuide && seedHooded.sizeGuide) {
            hoodedForSizes.sizeGuide = JSON.parse(JSON.stringify(seedHooded.sizeGuide));
          }
          await kv.set('product:2', hoodedForSizes);
          console.log('[SERVER] ✅ Product:2 migrated Default-only options to S/M/L/XL');
        }
      }

      // 🔧 全局补丁：确保所有商品的 category 都出现在 tags 中
      // 修复因旧版前端只写 category 而不写对应 tag 导致分类页漏显的问题
      const allProductIds2 = await kv.get('product:_all_ids') as number[] | null;
      if (allProductIds2 && Array.isArray(allProductIds2)) {
        let patchedCount = 0;
        for (const pid of allProductIds2) {
          const p = await kv.get(`product:${pid}`) as any;
          if (!p || !p.category) continue;
          if (!Array.isArray(p.tags)) p.tags = [];
          if (!p.tags.includes(p.category)) {
            p.tags = [p.category, ...p.tags];
            await kv.set(`product:${pid}`, p);
            patchedCount++;
          }
        }
        if (patchedCount > 0) {
          console.log(`[SERVER] ✅ Patched ${patchedCount} products: synced category into tags`);
        }
      }
    } catch (error) {
      console.error('[SERVER] ❌ Failed to auto-clean URLs:', error);
    }
  })
  .catch(e => console.error('[SERVER] Failed to initialize products:', e));

// 管理员邮箱列表 - 只有这些邮箱可以访问管理功能
const ADMIN_EMAILS = [
  '202760149@stu.scls-sh.org',
  '202760107@stu.scls-sh.org',
  '202760102@stu.scls-sh.org',
];

/** 按比例把 apparel 库存 total 摊到尺码；seed 模板全 0 时平均分配 */
function distributeApparelSizesFromSeed(total: number, seedOptions: Record<string, number>): Record<string, number> {
  const keys = Object.keys(seedOptions || {}).filter((k) => k !== 'Default');
  if (keys.length === 0) return total > 0 ? { Default: total } : { Default: 0 };
  let weights = keys.map((k) => Math.max(0, Math.round(Number(seedOptions[k]) || 0)));
  const sumW = weights.reduce((a, b) => a + b, 0);
  const t = Math.max(0, Math.round(Number(total) || 0));
  if (sumW <= 0) {
    const each = Math.floor(t / keys.length);
    let rem = t - each * keys.length;
    return Object.fromEntries(keys.map((k, i) => [k, each + (i < rem ? 1 : 0)]));
  }
  const raw = weights.map((w) => t * (w / sumW));
  const floors = raw.map(Math.floor);
  let rem = t - floors.reduce((a, b) => a + b, 0);
  const fracOrder = keys.map((_, i) => i).sort((a, b) => (raw[b] - Math.floor(raw[b])) - (raw[a] - Math.floor(raw[a])));
  const vals = [...floors];
  for (let j = 0; j < rem; j++) vals[fracOrder[j % fracOrder.length]]++;
  return Object.fromEntries(keys.map((k, i) => [k, vals[i]]));
}

async function getAboutEditorAllowlist(): Promise<string[] | null> {
  const v = await kv.get('aboutus:editor_allowlist');
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v)) return null;
  const emails = v.map((x: unknown) => String(x).trim().toLowerCase()).filter(Boolean);
  return [...new Set(emails)];
}

function adminCanEditAboutContent(email: string | undefined | null, allowlist: string[] | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (!ADMIN_EMAILS.includes(e)) return false;
  if (allowlist === null) return true;
  return allowlist.includes(e);
}

// ⚠️ Resend 测试模式允许的接收邮箱
const ALLOWED_TEST_EMAIL = 'lingjunyu20081201@gmail.com';

/**
 * 认证辅助函数
 * 从请求头或请求体提取并验证用户 token
 * @param request - HTTP 请求对象
 * @param body - 可选的请求体（可能包含 _auth_token）
 * @returns 验证成功返回 User 对象，失败返回 null
 */
async function getUser(request: Request, body?: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // 先尝试从请求体获取 token（优先级更高）
  let token: string | null = null;
  
  if (body?._auth_token) {
    token = body._auth_token;
  } else {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return null;
    token = authHeader.replace("Bearer ", "");
  }
  
  if (!token) return null;
  
  // 检查 token 是否只是 anon key（而不是用户 token）
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (token === anonKey) return null;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error("[AUTH] ❌ Token validation error:", error.message);
      return null;
    }
    
    if (!user) return null;
    
    console.log('[AUTH] ✅ Authenticated:', user.email);
    return user;
  } catch (err) {
    console.error('[AUTH] ❌ Exception:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * 邮件发送辅助函数
 * 向所有管理员发送新订单通知邮件
 * @param order - 订单对象
 */
async function sendEmailToAdmins(order: any) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.log('[EMAIL] RESEND_API_KEY not set, skipping email');
    return;
  }

  console.log('[EMAIL] Preparing to send email for order:', order.id);
  console.log('[EMAIL] Contact info:', order.contactInfo);
  
  // ⚠️ 检测 Resend 是否处于测试模式
  // 在测试模式下，只能发送到已验证的邮箱，所以跳过发送
  // 如果使用 onboarding@resend.dev 作为发件地址，说明未配置自定义域名
  const isTestMode = true; // Resend 默认是测试模式，除非配置了自定义域名
  
  // 确定接收者：测试模式下只能发给允许的邮箱
  const recipients = isTestMode ? [ALLOWED_TEST_EMAIL] : ADMIN_EMAILS;
  
  if (isTestMode) {
    console.log('[EMAIL] ⚠️ Resend is in test mode (using onboarding@resend.dev)');
    console.log(`[EMAIL] Redirecting email to allowed test address: ${ALLOWED_TEST_EMAIL}`);
  }

  // 构建邮件 HTML 内容
  const emailBody = `
    <h1>New Order Received</h1>
    <p><strong>Order ID:</strong> ${order.id}</p>
    <p><strong>User:</strong> ${order.contactInfo?.real_name || 'N/A'} (${order.userEmail})</p>
    <p><strong>Class:</strong> ${order.contactInfo?.class_name || 'Teacher'}</p>
    <p><strong>Total:</strong> ¥${order.total.toFixed(2)}</p>
    <h2>Items:</h2>
    <ul>
      ${order.items.map((item: any) => `<li>${item.quantity}x ${item.name?.cn || item.name}</li>`).join('')}
    </ul>
    <p>Please check the Admin Dashboard to manage this order.</p>
    ${isTestMode ? `<p style="color:red;font-size:12px;">[TEST MODE] Original Recipients: ${ADMIN_EMAILS.join(', ')}</p>` : ''}
  `;

  try {
    console.log('[EMAIL] Sending email to:', recipients);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SCLS Shop <onboarding@resend.dev>',
        to: recipients,
        subject: `New Order: ${order.contactInfo?.real_name || 'Customer'}`,
        html: emailBody
      })
    });
    
    if (!res.ok) {
        const err = await res.text();
        console.error('[EMAIL] Resend API error:', res.status, err);
    } else {
        const result = await res.json();
        console.log('[EMAIL] Email sent successfully:', result);
    }
  } catch (e) {
    console.error('[EMAIL] Failed to send email:', e);
  }
}

/**
 * 邮件发送辅助函数：发送新消息通知给管理员
 * @param message - 消息对象
 * @param senderEmail - 发送者邮箱
 */
async function sendChatMessageNotification(message: any, senderEmail: string) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    console.log('[EMAIL] RESEND_API_KEY not set, skipping chat notification');
    return;
  }

  // ⚠️ 检测 Resend 是否处于测试模式
  const isTestMode = true; // Resend 默认是测试模式
  
  // 确定接收者：测试模式下只能发给允许的邮箱
  const recipients = isTestMode ? [ALLOWED_TEST_EMAIL] : ADMIN_EMAILS;

  // 构建邮件 HTML 内容
  const emailBody = `
    <h1>New Message from Customer</h1>
    <p><strong>Customer:</strong> ${message.senderName} (${senderEmail})</p>
    <p><strong>Time:</strong> ${new Date(message.timestamp).toLocaleString()}</p>
    <p><strong>Message:</strong></p>
    <blockquote style="background-color: #f9f9f9; border-left: 4px solid #ccc; padding: 10px;">
      ${message.content}
    </blockquote>
    <p>Please log in to the Admin Dashboard to reply.</p>
    ${isTestMode ? `<p style="color:red;font-size:12px;">[TEST MODE] Original Recipients: ${ADMIN_EMAILS.join(', ')}</p>` : ''}
  `;

  try {
    console.log('[EMAIL] Sending chat notification to:', recipients);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SCLS Shop <onboarding@resend.dev>',
        to: recipients,
        subject: `New Message from ${message.senderName}`,
        html: emailBody
      })
    });
    
    if (!res.ok) {
        const err = await res.text();
        console.error('[EMAIL] Resend API error (Chat Notification):', res.status, err);
    } else {
        const result = await res.json();
        console.log('[EMAIL] Chat notification sent successfully:', result);
    }
  } catch (e) {
    console.error('[EMAIL] Failed to send chat notification:', e);
  }
}

// 启用日志记录
app.use('*', logger(console.log));

// 启用 CORS（允许所有来源访问）
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'X-Requested-With'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  })
);

// ======================
// 健康检查路由
// ======================
app.get(`${BASE_PATH}/health`, (c) => {
  return c.json({ status: "ok" });
});

/**
 * GET /debug/products - 调试端点：显示所有产品数据
 * 临时调试路由，用于检查 KV Store 中的商品数据
 */
app.get(`${BASE_PATH}/debug/products`, async (c) => {
  try {
    console.log('[DEBUG] Fetching all products from KV Store...');
    
    // 获取所有以 product: 开头的键
    const allData = await kv.getByPrefix('product:');
    
    console.log('[DEBUG] Total items with "product:" prefix:', allData.length);
    
    // 分类数据
    const validProducts = allData.filter((p: any) => typeof p?.id === 'number');
    const metadata = allData.filter((p: any) => typeof p?.id !== 'number');
    
    console.log('[DEBUG] Valid products:', validProducts.length);
    console.log('[DEBUG] Metadata items:', metadata.length);
    
    // 按分类统计
    const byCategory: Record<string, any[]> = {};
    validProducts.forEach((p: any) => {
      const cat = p.category || 'unknown';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ id: p.id, name: p.name.en });
    });
    
    return c.json({
      total: allData.length,
      validProducts: validProducts.length,
      metadata: metadata.length,
      byCategory,
      allProductIds: validProducts.map((p: any) => p.id).sort((a: number, b: number) => a - b),
      stationeryDetails: validProducts.filter((p: any) => p.category === 'stationery').map((p: any) => ({
        id: p.id,
        nameEn: p.name.en,
        nameCn: p.name.cn,
        tags: p.tags,
        category: p.category
      }))
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * POST /debug/init-products - 手动触发商品初始化
 * 临时调试路由，用于手动触发商品初始化
 */
app.post(`${BASE_PATH}/debug/init-products`, async (c) => {
  try {
    console.log('[DEBUG] Manually triggering product initialization...');
    await initializeProducts();
    
    // 获取更新后的商品列表
    const allData = await kv.getByPrefix('product:');
    const validProducts = allData.filter((p: any) => typeof p?.id === 'number');
    
    return c.json({
      success: true,
      message: 'Products initialized successfully',
      totalProducts: validProducts.length,
      productIds: validProducts.map((p: any) => p.id).sort((a: number, b: number) => a - b)
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * POST /debug/fix-stationery - 修复 stationery 分类商品
 * 强制更新所有 stationery 商品的分类
 */
app.post(`${BASE_PATH}/debug/fix-stationery`, async (c) => {
  try {
    console.log('[DEBUG] Fixing all stationery products...');
    
    // 定义所有 stationery 商品的完整数据
    const stationeryProducts = [
      {
        id: 3,
        name: {
          en: 'SCLS Notebook',
          cn: 'SCLS笔记本',
        },
        description: {
          en: 'High-quality notebook with SCLS branding, perfect for taking notes in class.',
          cn: '高品质SCLS品牌笔记本，适合课堂记笔记。',
        },
        price: 25.0,
        images: [],
        category: 'stationery',
        tags: ['stationery', 'new'],
      },
      {
        id: 4,
        name: {
          en: 'B5 Lined Notebook',
          cn: 'B5横线笔记本',
        },
        description: {
          en: 'Set of premium pens with SCLS logo, smooth writing experience.',
          cn: '高级SCLS标志笔套装，书写流畅。',
        },
        price: 15.0,
        images: [],
        category: 'stationery',
        tags: ['stationery'],
      },
      {
        id: 5,
        name: {
          en: 'SCLS Premium Notebook',
          cn: 'SCLS高级笔记本',
        },
        description: {
          en: 'Premium quality notebook with SCLS school landmark design, available in multiple colors.',
          cn: '高级品质笔记本，带有SCLS学校地标设计，多种颜色可选。',
        },
        price: 30.0,
        images: [],
        category: 'stationery',
        tags: ['stationery', 'new'],
      },
      {
        id: 9,
        name: {
          en: 'SCLS Pencils',
          cn: 'SCLS铅笔',
        },
        description: {
          en: 'Pack of premium pencils with SCLS logo.',
          cn: '高级SCLS标志铅笔套装。',
        },
        price: 10.0,
        images: [],
        category: 'stationery',
        tags: ['stationery'],
      },
      {
        id: 10,
        name: {
          en: 'SCLS Loose Leaf Paper',
          cn: 'SCLS活页纸',
        },
        description: {
          en: 'High-quality loose leaf paper pack for refilling notebooks.',
          cn: '高品质活页纸，用于补充笔记本。',
        },
        price: 8.0,
        images: [],
        category: 'stationery',
        tags: ['stationery'],
      }
    ];
    
    const results: any = {};
    
    // 修复或创建每个 stationery 商品
    for (const productData of stationeryProducts) {
      const key = `product:${productData.id}`;
      const existing = await kv.get(key);
      
      if (existing) {
        // 存在，更新分类
        existing.category = 'stationery';
        existing.tags = productData.tags;
        await kv.set(key, existing);
        results[`product${productData.id}`] = {
          status: 'updated',
          action: `Fixed category for ${productData.name.en}`,
          oldCategory: existing.category
        };
        console.log(`[DEBUG] ✅ Updated product ${productData.id}: ${productData.name.en}`);
      } else {
        // 不存在，创建新商品
        await kv.set(key, productData);
        results[`product${productData.id}`] = {
          status: 'created',
          action: `Created ${productData.name.en}`
        };
        console.log(`[DEBUG] ✅ Created product ${productData.id}: ${productData.name.en}`);
      }
    }
    
    // 更新商品ID列表（基于现有列表去重，避免 getByPrefix 引入脏数据）
    const currentIds = (await kv.get('product:_all_ids') as number[]) || [];
    const idSet = new Set(currentIds);
    stationeryProducts.forEach(p => idSet.add(p.id));
    const allIds = [...idSet].sort((a: number, b: number) => a - b);
    await kv.set('product:_all_ids', allIds);
    console.log('[DEBUG] Updated product IDs list:', allIds);
    
    return c.json({
      success: true,
      message: `Fixed ${Object.keys(results).length} stationery products`,
      results,
      totalProducts: allIds.length,
      expectedIds: [3, 4, 5, 9, 10],
      allProductIds: allIds
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return c.json({ 
      success: false,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// ======================
// 认证路由
// ======================

/**
 * POST /send-verification-code - 发送邮箱验证码
 * 公开路由，用于用户注册
 * 使用 Supabase Auth 的 Email OTP 功能
 */
app.post(`${BASE_PATH}/send-verification-code`, async (c) => {
  console.log('[SEND_CODE] Received verification code request');
  
  try {
    const { email, metadata } = await c.req.json();
    
    console.log('[SEND_CODE] Email:', email);
    console.log('[SEND_CODE] Metadata:', metadata);
    
    if (!email) {
      console.error('[SEND_CODE] Missing email');
      return c.json({ error: "Email is required" }, 400);
    }
    
    // 检查用户是否已存在
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // 尝试获取用户信息
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email);
    
    if (userExists) {
      console.log('[SEND_CODE] User already exists');
      return c.json({ error: "该邮箱已被注册，请直接登录" }, 409);
    }
    
    // 将用户元数据临时保存到 KV Store
    // 因为 Supabase OTP 验证后我们需要手动创建用户并设置密码
    const metadataKey = `signup_metadata:${email}`;
    const metadataData = {
      metadata: metadata,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10分钟后过期
    };
    
    await kv.set(metadataKey, metadataData);
    console.log('[SEND_CODE] Metadata saved to KV Store');
    
    // 使用 Supabase Auth 发送 Email OTP
    // Supabase 会自动生成 8 位验证码并使用您配置的邮件模板发送
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    
    console.log('[SEND_CODE] Sending OTP via Supabase Auth...');
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true, // ✅ 允许为新用户创建账号
        data: metadata || {}, // 传递用户元数据
      }
    });
    
    if (error) {
      console.error('[SEND_CODE] Supabase OTP error:', error);
      console.error('[SEND_CODE] Error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      
      return c.json({ 
        error: error.message || "Failed to send verification code",
        details: error.status ? `Status: ${error.status}` : undefined
      }, 400);
    }
    
    console.log('[SEND_CODE] ✅ OTP sent successfully via Supabase');
    console.log('[SEND_CODE] Check your email for the verification code!');
    
    return c.json({ 
      success: true,
      message: "Verification code sent to your email"
    });
    
  } catch (error) {
    console.error('[SEND_CODE] Unexpected error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * POST /verify-code - 验证验证码并登录/创建用户
 * 公开路由，用于完成注册
 * 使用 Supabase OTP 验证
 */
app.post(`${BASE_PATH}/verify-code`, async (c) => {
  console.log('[VERIFY_CODE] Received verification request');
  
  try {
    const { email, code, password } = await c.req.json();
    
    console.log('[VERIFY_CODE] Email:', email);
    console.log('[VERIFY_CODE] Code:', code);
    
    if (!email || !code) {
      console.error('[VERIFY_CODE] Missing required fields');
      return c.json({ error: "Email and code are required" }, 400);
    }
    
    // 使用 Supabase Auth 验证 OTP
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    
    console.log('[VERIFY_CODE] Verifying OTP with Supabase...');
    
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: code,
      type: 'email', // 验证类型为邮箱 OTP
    });
    
    if (error) {
      console.error('[VERIFY_CODE] OTP verification failed:', error);
      console.error('[VERIFY_CODE] Error status:', error.status);
      console.error('[VERIFY_CODE] Error message:', error.message);
      console.error('[VERIFY_CODE] Error code:', error.code);
      
      // 根据错误类型提供精确的用户友好消息
      let errorMessage = 'Verification code error / 验证码错误';
      
      // 检查错误消息内容
      const errorMsg = error.message?.toLowerCase() || '';
      const errorCode = error.code || '';
      
      if (errorMsg.includes('expired') || errorCode === 'otp_expired') {
        errorMessage = 'Verification code expired, please request a new one / 验证码已过期，请重新获取';
      } else if (errorMsg.includes('invalid') || errorMsg.includes('not found') || errorCode === 'otp_disabled') {
        errorMessage = 'Invalid verification code, please check and try again / 验证码错误，请检查后重试';
      } else if (errorMsg.includes('too many')) {
        errorMessage = 'Too many attempts, please try again later / 尝试次数过多，请稍后重试';
      }
      
      console.error('[VERIFY_CODE] Returning error:', errorMessage);
      return c.json({ error: errorMessage }, 400);
    }
    
    if (!data.user || !data.session) {
      console.error('[VERIFY_CODE] No user or session returned');
      return c.json({ error: "验证失败，请重试" }, 400);
    }
    
    console.log('[VERIFY_CODE] ✅ OTP verified successfully');
    console.log('[VERIFY_CODE] User:', data.user.email);
    
    // 检查是否需要设置密码（新用户）
    if (password) {
      console.log('[VERIFY_CODE] Setting password for user...');
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      
      // 使用 Admin API 更新用户密码
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        data.user.id,
        { password: password }
      );
      
      if (passwordError) {
        console.error('[VERIFY_CODE] Failed to set password:', passwordError);
        // 不返回错误，因为用户已经创建成功
      } else {
        console.log('[VERIFY_CODE] ✅ Password set successfully');
      }
      
      // 获取并更新用户的 metadata（如果有保存）
      const metadataKey = `signup_metadata:${email}`;
      const metadataData = await kv.get(metadataKey);
      
      if (metadataData?.metadata) {
        console.log('[VERIFY_CODE] Updating user metadata...');
        const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
          data.user.id,
          { user_metadata: metadataData.metadata }
        );
        
        if (metadataError) {
          console.error('[VERIFY_CODE] Failed to update metadata:', metadataError);
        } else {
          console.log('[VERIFY_CODE] ✅ Metadata updated successfully');
        }
        
        // 删除临时保存的 metadata
        await kv.del(metadataKey);
      }
    }
    
    console.log('[VERIFY_CODE] Registration/login successful');
    
    return c.json({ 
      success: true,
      session: data.session,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      message: "Registration successful"
    });
    
  } catch (error) {
    console.error('[VERIFY_CODE] Unexpected error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * POST /signup - 用户注册
 * 公开路由，无需登录
 * 创建新用户并发送邮箱验证邮件
 */
app.post(`${BASE_PATH}/signup`, async (c) => {
  console.log('[SIGNUP] Received signup request');
  
  try {
    const { email, password, metadata } = await c.req.json();
    
    console.log('[SIGNUP] Email:', email);
    console.log('[SIGNUP] Metadata:', metadata);
    
    if (!email || !password) {
      console.error('[SIGNUP] Missing email or password');
      return c.json({ error: "Email and password are required" }, 400);
    }
    
    // 使用普通的 Supabase 客户端（不是 Service Role）来注册用户
    // 这样会触发邮件验证流程
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    
    console.log('[SIGNUP] Creating user with email verification...');
    
    // 使用 signUp 方法，会自动发送验证邮件
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: metadata || {},
        // 邮件确认后重定向到应用根路径（不能使用 hash）
        // Supabase 会自动在 URL 后添加 token 参数
        emailRedirectTo: 'https://scs.figma.site',
      }
    });
    
    if (error) {
      console.error('[SIGNUP] Supabase error object:', JSON.stringify(error, null, 2));
      console.error('[SIGNUP] Error message:', error.message);
      console.error('[SIGNUP] Error status:', error.status);
      console.error('[SIGNUP] Error code:', error.code);
      console.error('[SIGNUP] Error name:', error.name);
      
      // 处理不同类型的错误
      let errorMessage = error.message || error.msg || error.name || 'Unknown error';
      let statusCode = error.status || 400;
      
      // 处理 AuthRetryableFetchError (504 网关超时)
      if (error.name === 'AuthRetryableFetchError' || statusCode === 504) {
        errorMessage = 'Supabase 邮件服务暂时不可用，请稍后重试或联系管理员';
        console.error('[SIGNUP] AuthRetryableFetchError - Supabase mail service timeout');
      }
      // 检查是否是邮箱已存在错误
      else if (error.message?.includes('already') || error.message?.includes('registered') || error.code === 'user_already_exists') {
        errorMessage = '该邮箱已被注册，请直接登录';
        statusCode = 409; // Conflict
      } else if (error.message?.includes('password')) {
        errorMessage = '密码不符合要求（至少6位）';
      } else if (error.message?.includes('email') || error.message?.includes('invalid')) {
        errorMessage = '邮箱格式不正确';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = '操作过于频繁，请稍后再试';
        statusCode = 429;
      }
      
      console.error('[SIGNUP] Returning error message:', errorMessage);
      console.error('[SIGNUP] Returning status code:', statusCode);
      return c.json({ error: errorMessage }, statusCode);
    }
    
    if (!data.user) {
      console.error('[SIGNUP] No user data returned');
      return c.json({ error: "Failed to create user" }, 500);
    }
    
    console.log('[SIGNUP] User created successfully:', data.user.email);
    console.log('[SIGNUP] Email confirmed:', !!data.user.email_confirmed_at);
    console.log('[SIGNUP] Confirmation sent:', !data.user.email_confirmed_at);
    
    return c.json({ 
      success: true, 
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed: !!data.user.email_confirmed_at
      },
      message: data.user.email_confirmed_at 
        ? 'Registration successful' 
        : 'Please check your email to confirm your account'
    });
    
  } catch (error) {
    console.error('[SIGNUP] Unexpected error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * POST /check-user - 检查用户是否存在
 * 公开路由，用于登录时区分"用户不存在"和"密码错误"
 */
app.post(`${BASE_PATH}/check-user`, async (c) => {
  console.log('[CHECK-USER] Received check user request');
  
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      console.error('[CHECK-USER] Missing email');
      return c.json({ error: "Email is required" }, 400);
    }
    
    console.log('[CHECK-USER] Checking email:', email);
    
    // 使用 Service Role Key 来查询用户
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    
    // 使用 listUsers 查找用户（通过 Service Role）
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('[CHECK-USER] Error listing users:', error);
      return c.json({ error: 'Failed to check user' }, 500);
    }
    
    // 查找匹配的用户
    const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.log('[CHECK-USER] User not found');
      return c.json({ 
        exists: false,
        message: 'User not found'
      });
    }
    
    // 用户存在，检查邮箱验证状态
    const emailConfirmed = !!user.email_confirmed_at;
    
    console.log('[CHECK-USER] User found:', {
      email: user.email,
      emailConfirmed,
      created: user.created_at
    });
    
    return c.json({
      exists: true,
      emailConfirmed,
      email: user.email,
      message: emailConfirmed ? 'User exists and confirmed' : 'User exists but email not confirmed'
    });
    
  } catch (error) {
    console.error('[CHECK-USER] Unexpected error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ======================
// 购物车路由
// ======================

/**
 * GET /cart - 获取用户购物车
 * 需要登录
 * 返回用户的购物车商品列表
 */
app.get(`${BASE_PATH}/cart`, async (c) => {
  const user = await getUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const cart = await kv.get(`cart:${user.id}`);
  return c.json({ items: cart || [] });
});

/**
 * POST /cart - 保存用户购物车
 * 需要登录
 * 将购物车数据保存到服务器
 */
app.post(`${BASE_PATH}/cart`, async (c) => {
  const user = await getUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const { items } = await c.req.json();
  await kv.set(`cart:${user.id}`, items);
  return c.json({ success: true });
});

// ======================
// 订单路由
// ======================

/**
 * POST /orders - 提交新预定
 * 需要登录
 * 创建新预定，清空购物车，发送邮件通知管理员
 */
app.post(`${BASE_PATH}/orders`, async (c) => {
  console.log('[ORDER] Received order submission request');
  
  // 先解析请求体
  const body = await c.req.json();
  console.log('[ORDER] Request body received');
  
  // 传递 body 给 getUser 以获取 _auth_token
  const user = await getUser(c.req.raw, body);
  if (!user) {
    console.error('[ORDER] Unauthorized: No valid user token');
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log('[ORDER] User authenticated:', user.email);

  const { items, total, contactInfo } = body;
  
  console.log('[ORDER] Order details:', {
    itemCount: items?.length,
    total,
    contactInfo
  });

  if (!items || items.length === 0) {
    console.error('[ORDER] No items in order');
    return c.json({ error: "No items in order" }, 400);
  }

  // 生成预定号：YYYYMMDDXXX 格式
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  // 获取今天的所有预定，计算今天的预定序号
  const allOrders = await kv.getByPrefix('order:');
  const todayOrders = allOrders.filter((order: any) => {
    if (!order || !order.orderNumber) return false;
    return order.orderNumber.startsWith(datePrefix);
  });
  
  const todayOrderCount = todayOrders.length + 1;
  const orderNumber = `${datePrefix}${String(todayOrderCount).padStart(3, '0')}`;
  
  console.log('[ORDER] Generated reservation number:', orderNumber, 'for date:', datePrefix);
  
  // 创建预定对象
  const timestamp = Date.now();
  const orderId = `${user.id}:${timestamp}`;
  const orderKey = `order:${orderId}`;
  
  const order = {
    id: orderId,
    orderNumber, // 新增：用于显示的预定号
    userId: user.id,
    userEmail: user.email,
    items,
    total,
    status: 'pending', // 默认状态为待处理
    createdAt: new Date().toISOString(),
    contactInfo // 联系信息（姓名、班级等）
  };

  console.log('[ORDER] Saving order to KV store:', orderKey);

  // 保存订单到 KV 存储
  await kv.set(orderKey, order);
  
  console.log('[ORDER] Order saved successfully');
  
  // 清空用户购物车
  await kv.del(`cart:${user.id}`);
  console.log('[ORDER] Cart cleared');

  // 异��发送邮件通知管理员（不阻塞响应）
  sendEmailToAdmins(order).catch(e => console.error('[ORDER] Email send failed:', e));

  console.log('[ORDER] Returning success response');
  return c.json({ success: true, orderId, orderNumber });
});

/**
 * GET /orders - 获取用户预定列表
 * 需要登录
 * 返回当前用户的所有预定
 */
app.get(`${BASE_PATH}/orders`, async (c) => {
  console.log('[ORDER] Received get orders request');
  
  // 从查询参数获取 token
  const queryToken = c.req.query('_auth_token');
  const mockBody = queryToken ? { _auth_token: queryToken } : undefined;
  
  const user = await getUser(c.req.raw, mockBody);
  if (!user) {
    console.error('[ORDER] Unauthorized: No valid user token');
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log('[ORDER] User authenticated:', user.email);
  console.log('[ORDER] Fetching orders for user:', user.id);

  const orders = await kv.getByPrefix(`order:${user.id}`);
  
  console.log('[ORDER] Found', orders.length, 'orders');
  return c.json({ orders });
});

// ======================
// 商品管理路由
// ======================

/**
 * GET /products - 获取所有商品
 * 公开接口，不需要登录
 * 返回所有商品列表
 * ✅ 优化：使用 ID 列表而非全量查询，避免超时
 */
app.get(`${BASE_PATH}/products`, async (c) => {
  try {
    console.log('[PRODUCTS] Fetching all products...');
    
    // ✅ 新策略：先获取 ID 列表，然后按需获取商品
    const productIds = await kv.get('product:_all_ids') as number[] | null;
    
    if (!productIds || !Array.isArray(productIds)) {
      console.log('[PRODUCTS] No product IDs found, returning empty array');
      return c.json({ products: [] });
    }
    
    // ✅ 去重 ID 列表，防止重复商品显示
    const uniqueIds = [...new Set(productIds)];
    console.log(`[PRODUCTS] Found ${uniqueIds.length} unique product IDs (raw: ${productIds.length})`);
    
    // 如果有重复，自动修复 ID 列表
    if (uniqueIds.length !== productIds.length) {
      console.log('[PRODUCTS] ⚠️ Duplicate IDs detected, auto-fixing...');
      await kv.set('product:_all_ids', uniqueIds);
    }
    
    // 批量获取商品数据
    const productKeys = uniqueIds.map(id => `product:${id}`);
    const products = await kv.mget(productKeys);
    
    // 过滤掉 null 值和无效商品
    const validProducts = products.filter((p: any) => p !== null && typeof p?.id === 'number');
    
    console.log(`[PRODUCTS] Successfully fetched ${validProducts.length} valid products`);
    
    // ✅ 禁用缓存，确保管理员修改价格后能实时同步
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    
    return c.json({ products: validProducts });
  } catch (error) {
    console.error('[PRODUCTS] Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

/**
 * GET /products/:id - 获取单个商品
 * 公开接口，不需要登录
 * 返回指定ID的商品详情
 */
app.get(`${BASE_PATH}/products/:id`, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    
    if (isNaN(id)) {
      return c.json({ error: 'Invalid product ID' }, 400);
    }
    
    console.log(`[PRODUCTS] Fetching product ID: ${id}`);
    
    const product = await kv.get(`product:${id}`);
    
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    // ✅ 禁用缓存，确保管理员修改价格后能实时同步
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    
    return c.json({ product });
  } catch (error) {
    console.error('[PRODUCTS] Error fetching product:', error);
    return c.json({ error: 'Failed to fetch product' }, 500);
  }
});

/**
 * GET /products/category/:category - 按分类获取商品
 * 公开接口，不需要登录
 * 返回指定分类的商品列表
 */
app.get(`${BASE_PATH}/products/category/:category`, async (c) => {
  try {
    const category = c.req.param('category');
    console.log(`[PRODUCTS] Fetching products in category: ${category}`);
    
    const allProducts = await kv.getByPrefix('product:');
    const categoryProducts = allProducts.filter((p: any) => 
      typeof p?.id === 'number' && p.category === category
    );
    
    console.log(`[PRODUCTS] Found ${categoryProducts.length} products in category ${category}`);
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return c.json({ products: categoryProducts });
  } catch (error) {
    console.error('[PRODUCTS] Error fetching category products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

/**
 * GET /products/tag/:tag - 按标签获取商品
 * 公开接口，不需要登录
 * 返回包含指定标签的商品列表
 */
app.get(`${BASE_PATH}/products/tag/:tag`, async (c) => {
  try {
    const tag = c.req.param('tag');
    console.log(`[PRODUCTS] Fetching products with tag: ${tag}`);
    
    const allProducts = await kv.getByPrefix('product:');
    const tagProducts = allProducts.filter((p: any) => 
      typeof p?.id === 'number' && Array.isArray(p.tags) && p.tags.includes(tag)
    );
    
    console.log(`[PRODUCTS] Found ${tagProducts.length} products with tag ${tag}`);
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return c.json({ products: tagProducts });
  } catch (error) {
    console.error('[PRODUCTS] Error fetching tag products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

// ======================
// 管理员路由（需要管理员权限）
// ======================

/**
 * 辅助函数：刷新单个文件的签名 URL
 * @param filePath - 文件在 Storage 中的路径（例如 "products/abc123.png"）
 * @returns 新的签名 URL（有效期 1 年），如果文件不存在则返回 null
 */
async function refreshSignedUrl(filePath: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const bucketName = 'make-c4f5ade4-images';
  
  console.log(`[STORAGE] Refreshing signed URL for file: ${filePath}`);
  
  // 首先检查文件是否存在
  const { data: fileExists, error: checkError } = await supabase
    .storage
    .from(bucketName)
    .list(filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '', {
      search: filePath.includes('/') ? filePath.substring(filePath.lastIndexOf('/') + 1) : filePath
    });
    
  if (checkError || !fileExists || fileExists.length === 0) {
    console.warn(`[STORAGE] ⚠️ File not found, skipping: ${filePath}`);
    return null; // ✅ 返回 null 而不是抛出错误
  }
  
  // 生成新的签名 URL（有效期 1 年 = 31536000 秒）
  const { data, error } = await supabase
    .storage
    .from(bucketName)
    .createSignedUrl(filePath, 31536000);
    
  if (error || !data?.signedUrl) {
    console.error(`[STORAGE] Failed to create signed URL for ${filePath}:`, error);
    return null; // ✅ 返回 null 而不是抛出错误
  }
  
  console.log(`[STORAGE] ✅ Successfully created signed URL for ${filePath}`);
  return data.signedUrl;
}

/**
 * POST /admin/refresh-image-urls - 刷新所有商品的图片签名 URL
 * 需要管理员权限
 * 重新生成所有商品图片的签名 URL（有效期 1 年）
 */
app.post(`${BASE_PATH}/admin/refresh-image-urls`, async (c) => {
  console.log('[ADMIN] Received refresh image URLs request');
  
  const queryToken = c.req.query('_auth_token');
  const mockBody = queryToken ? { _auth_token: queryToken } : undefined;
  
  const user = await getUser(c.req.raw, mockBody);
  if (!user) {
    console.error('[ADMIN] Unauthorized: No valid user token');
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log('[ADMIN] User authenticated:', user.email);

  // 验证管理员权限
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    console.error('[ADMIN] Forbidden: User is not an admin');
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    console.log('[ADMIN] Starting to refresh all image URLs...');
    
    // 获取所有商品 ID
    const productIds = await kv.get('product:_all_ids') as number[] | null;
    
    if (!productIds || !Array.isArray(productIds)) {
      return c.json({ 
        success: true, 
        message: 'No products found',
        updated: 0 
      });
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // 逐个处理商品
    for (const id of productIds) {
      try {
        const product = await kv.get(`product:${id}`) as any;
        
        if (!product || !product.images || !Array.isArray(product.images)) {
          continue;
        }
        
        let needsUpdate = false;
        const newImages: string[] = [];
        
        // 检查每个图片 URL
        for (const imageUrl of product.images) {
          // 跳过 data:image 类型的 Base64 URL（本地图片）
          if (imageUrl.startsWith('data:image')) {
            newImages.push(imageUrl);
            continue;
          }
          
          // ✅ 过滤无效的 blob URL（这些是临时 URL，应该被移除）
          if (imageUrl.startsWith('blob:')) {
            console.log(`[ADMIN] Filtering out invalid blob URL from product ${id}`);
            // 不添加到 newImages，从而删除这些无效的 blob URL
            needsUpdate = true;
            continue;
          }
          
          // 如果是 Storage URL，尝试刷新
          if (imageUrl.includes('supabase.co/storage')) {
            try {
              // 从 URL 中提取文件路径
              const urlObj = new URL(imageUrl);
              const pathMatch = urlObj.pathname.match(/\/object\/sign\/[^/]+\/(.+)$/);
              
              if (pathMatch && pathMatch[1]) {
                const filePath = decodeURIComponent(pathMatch[1]);
                console.log(`[ADMIN] Refreshing URL for file: ${filePath}`);
                
                // 生成新的签名 URL
                const newUrl = await refreshSignedUrl(filePath);
                if (newUrl) {
                  newImages.push(newUrl);
                  needsUpdate = true;
                } else {
                  // 文件不存在，跳过此图片
                  console.warn(`[ADMIN] ⚠️ File not found in Storage, skipping: ${filePath}`);
                  needsUpdate = true;
                }
              } else {
                // 无法解析路径，保留原 URL
                newImages.push(imageUrl);
              }
            } catch (err) {
              console.error(`[ADMIN] Error refreshing URL for product ${id}:`, err);
              newImages.push(imageUrl); // 保留原 URL
              errors.push(`Product ${id}: ${err instanceof Error ? err.message : String(err)}`);
            }
          } else {
            // 其他类型的 URL，直接保留
            newImages.push(imageUrl);
          }
        }
        
        // 如果有更新，保存商品
        if (needsUpdate) {
          product.images = newImages;
          await kv.set(`product:${id}`, product);
          updatedCount++;
          console.log(`[ADMIN] Updated product ${id} with ${newImages.length} images`);
        }
        
      } catch (err) {
        console.error(`[ADMIN] Error processing product ${id}:`, err);
        errorCount++;
        errors.push(`Product ${id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    console.log(`[ADMIN] Refresh complete. Updated: ${updatedCount}, Errors: ${errorCount}`);
    
    return c.json({
      success: true,
      message: `Refreshed image URLs for ${updatedCount} products`,
      updated: updatedCount,
      errors: errorCount > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('[ADMIN] Error refreshing image URLs:', error);
    return c.json({ 
      error: 'Failed to refresh image URLs',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

/**
 * GET /admin/orders - 获取所有预定
 * 需要管理员权限
 * 返回系统中的所有预定
 */
app.get(`${BASE_PATH}/admin/orders`, async (c) => {
  console.log('[ADMIN] Received get all orders request');
  
  // 从查询参数获取 token
  const queryToken = c.req.query('_auth_token');
  const mockBody = queryToken ? { _auth_token: queryToken } : undefined;
  
  const user = await getUser(c.req.raw, mockBody);
  if (!user) {
    console.error('[ADMIN] Unauthorized: No valid user token');
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log('[ADMIN] User authenticated:', user.email);

  // 验证管理员权限
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    console.error('[ADMIN] Forbidden: User is not an admin');
    return c.json({ error: "Forbidden" }, 403);
  }

  console.log('[ADMIN] Admin access granted, fetching all orders...');

  // 获取所有订单
  const orders = await kv.getByPrefix("order:");
  
  console.log('[ADMIN] Found', orders.length, 'orders');
  return c.json({ orders });
});

/**
 * PATCH /admin/orders - 更新预定状态
 * 需要管理员权限
 * 允许管理员修改预定状态（pending、completed、cancelled 等）
 */
app.patch(`${BASE_PATH}/admin/orders`, async (c) => {
    console.log('[ADMIN] Received update order status request');
    
    // 先解析请求体
    const body = await c.req.json();
    console.log('[ADMIN] Request body received');
    
    // 传递 body 给 getUser 以获取 _auth_token
    const user = await getUser(c.req.raw, body);
    if (!user) {
      console.error('[ADMIN] Unauthorized: No valid user token');
      return c.json({ error: "Unauthorized" }, 401);
    }
  
    console.log('[ADMIN] User authenticated:', user.email);
    
    // 验证管理员权限
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.error('[ADMIN] Forbidden: User is not an admin');
      return c.json({ error: "Forbidden" }, 403);
    }

    const { orderId, status } = body;
    if (!orderId || !status) {
        console.error('[ADMIN] Missing required fields');
        return c.json({ error: "Missing required fields" }, 400);
    }

    console.log('[ADMIN] Updating order:', orderId, 'to status:', status);

    const orderKey = `order:${orderId}`;
    const order = await kv.get(orderKey);

    if (!order) {
        console.error('[ADMIN] Order not found:', orderId);
        return c.json({ error: "Order not found" }, 404);
    }

    // 更新订单状态和完成标记
    order.status = status;
    order.completed = (status === 'completed');
    order.updatedAt = new Date().toISOString();
    order.updatedBy = user.email;
    
    await kv.set(orderKey, order);

    console.log(`[ADMIN] Order ${orderId} status updated to ${status} by ${user.email}`);
    return c.json({ success: true, order });
});

/**
 * POST /admin/orders/offline - 手动添加线下预定
 * 需要管理员权限
 * 用于录入线下交易，与线上预定一起统计
 */
app.post(`${BASE_PATH}/admin/orders/offline`, async (c) => {
  console.log('[ADMIN] Received create offline order request');
  
  // 先解析请求体
  const body = await c.req.json();
  console.log('[ADMIN] Request body received');
  
  // 传递 body 给 getUser 以获取 _auth_token
  const user = await getUser(c.req.raw, body);
  if (!user) {
    console.error('[ADMIN] Unauthorized: No valid user token');
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log('[ADMIN] User authenticated:', user.email);
  
  // 验证管理员权限
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    console.error('[ADMIN] Forbidden: User is not an admin');
    return c.json({ error: "Forbidden" }, 403);
  }

  const { productId, productName, option, quantity, unitPrice, amount } = body;
  
  if (!productName || !quantity || !amount) {
    console.error('[ADMIN] Missing required fields');
    return c.json({ error: "Missing required fields: productName, quantity, amount" }, 400);
  }

  // 生成预定号：YYYYMMDDXXX 格式
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;
  
  // 获取今天的所有预定（包括线上和线下），计算今天的预定序号
  const allOrders = await kv.getByPrefix('order:');
  const todayOrders = allOrders.filter((order: any) => {
    if (!order || !order.orderNumber) return false;
    return order.orderNumber.startsWith(datePrefix);
  });
  
  const todayOrderCount = todayOrders.length + 1;
  const orderNumber = `${datePrefix}${String(todayOrderCount).padStart(3, '0')}`;
  
  console.log('[ADMIN] Generated offline reservation number:', orderNumber);
  
  // 创建线下预定对象
  const timestamp = Date.now();
  const orderId = `offline:${timestamp}`;
  const orderKey = `order:${orderId}`;
  
  const offlineOrder = {
    id: orderId,
    orderNumber,
    userId: 'offline', // 标记为线下预定
    userEmail: 'offline@store.com',
    items: [{
      id: productId || 0, // 商品 ID（如果有）
      name: productName,
      option: option || '', // 型号/尺码（可选）
      quantity: parseInt(quantity),
      price: unitPrice ? parseFloat(unitPrice) : parseFloat(amount) / parseInt(quantity), // 使用单价或计算单价
    }],
    total: parseFloat(amount),
    status: 'completed', // 线下订单默认已完成
    completed: true,
    createdAt: new Date().toISOString(),
    createdBy: user.email,
    contactInfo: {
      real_name: 'Offline Customer',
      class_name: 'N/A',
      role: 'offline'
    },
    isOffline: true // 标记为线下订单
  };

  console.log('[ADMIN] Saving offline order to KV store:', orderKey);

  // 保存订单到 KV 存储
  await kv.set(orderKey, offlineOrder);
  
  console.log('[ADMIN] Offline order saved successfully by', user.email);

  return c.json({ success: true, orderId, orderNumber, order: offlineOrder });
});

/**
 * DELETE /admin/orders/all - 清空所有订单记录（管理员面板独立功能）
 * 需要管理员权限
 * 删除所有订单记录（不影响用户端）
 */
app.delete(`${BASE_PATH}/admin/orders/all`, async (c) => {
  console.log('[ADMIN] Received clear all orders request');
  
  // 先解析请求体以获取 _auth_token
  const body = await c.req.json().catch(() => ({}));
  
  // 传递 body 给 getUser 以获取 _auth_token
  const user = await getUser(c.req.raw, body);
  if (!user) {
    console.error('[ADMIN] Unauthorized: No valid user token');
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log('[ADMIN] User authenticated:', user.email);
  
  // 验证管理员权限
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    console.error('[ADMIN] Forbidden: User is not an admin');
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    // 获取所有订单
    const allOrders = await kv.getByPrefix('order:');
    console.log(`[ADMIN] Found ${allOrders.length} total orders to delete`);
    
    // 删除所有订单
    let deletedCount = 0;
    for (const order of allOrders) {
      if (order && order.id) {
        await kv.del(`order:${order.id}`);
        deletedCount++;
      }
    }
    
    console.log(`[ADMIN] Successfully deleted ${deletedCount} orders from admin panel by ${user.email}`);
    return c.json({ 
      success: true, 
      deletedCount,
      message: `Successfully deleted ${deletedCount} order records from admin panel`
    });
  } catch (error) {
    console.error('[ADMIN] Error clearing all orders:', error);
    return c.json({ 
      error: 'Failed to clear order records',
      details: String(error)
    }, 500);
  }
});

/**
 * DELETE /admin/orders/completed - 清空已完成的订单
 * 需要管理员权限
 * 删除所有状态为 completed 的订单
 */
app.delete(`${BASE_PATH}/admin/orders/completed`, async (c) => {
  console.log('[ADMIN] Received clear completed orders request');
  
  // 先解析请求体以获取 _auth_token
  const body = await c.req.json().catch(() => ({}));
  
  // 传递 body 给 getUser 以获取 _auth_token
  const user = await getUser(c.req.raw, body);
  if (!user) {
    console.error('[ADMIN] Unauthorized: No valid user token');
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log('[ADMIN] User authenticated:', user.email);
  
  // 验证管理员权限
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    console.error('[ADMIN] Forbidden: User is not an admin');
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    // 获取所有订单
    const allOrders = await kv.getByPrefix('order:');
    console.log(`[ADMIN] Found ${allOrders.length} total orders`);
    
    // 筛选出已完成的订单
    const completedOrders = allOrders.filter((order: any) => 
      order && (order.status === 'completed' || order.completed === true)
    );
    
    console.log(`[ADMIN] Found ${completedOrders.length} completed orders to delete`);
    
    // 删除已完成的订单
    let deletedCount = 0;
    for (const order of completedOrders) {
      if (order && order.id) {
        await kv.del(`order:${order.id}`);
        deletedCount++;
      }
    }
    
    console.log(`[ADMIN] Successfully deleted ${deletedCount} completed orders by ${user.email}`);
    return c.json({ 
      success: true, 
      deletedCount,
      message: `Successfully deleted ${deletedCount} completed orders`
    });
  } catch (error) {
    console.error('[ADMIN] Error clearing completed orders:', error);
    return c.json({ 
      error: 'Failed to clear completed orders',
      details: String(error)
    }, 500);
  }
});

/**
 * DELETE /orders/completed - 用户清空自己的已完成订单
 * 需要登录
 * 删除当前用户所有状态为 completed 的订单
 */
app.delete(`${BASE_PATH}/orders/completed`, async (c) => {
  console.log('[ORDER] Received user clear completed orders request');
  
  // 先解析请求体以获取 _auth_token
  const body = await c.req.json().catch(() => ({}));
  
  // 传递 body 给 getUser 以获取 _auth_token
  const user = await getUser(c.req.raw, body);
  if (!user) {
    console.error('[ORDER] Unauthorized: No valid user token');
    return c.json({ error: "Unauthorized" }, 401);
  }

  console.log('[ORDER] User authenticated:', user.email);
  
  try {
    // 获取用户的所有订单
    const allOrders = await kv.getByPrefix(`order:${user.id}`);
    console.log(`[ORDER] Found ${allOrders.length} total orders for user`);
    
    // 筛选出已完成的订单
    const completedOrders = allOrders.filter((order: any) => 
      order && (order.status === 'completed' || order.completed === true)
    );
    
    console.log(`[ORDER] Found ${completedOrders.length} completed orders to delete`);
    
    // 删除已完成的订单
    let deletedCount = 0;
    for (const order of completedOrders) {
      if (order && order.id) {
        await kv.del(`order:${order.id}`);
        deletedCount++;
      }
    }
    
    console.log(`[ORDER] Successfully deleted ${deletedCount} completed orders for user ${user.email}`);
    return c.json({ 
      success: true, 
      deletedCount,
      message: `Successfully deleted ${deletedCount} completed orders`
    });
  } catch (error) {
    console.error('[ORDER] Error clearing completed orders:', error);
    return c.json({ 
      error: 'Failed to clear completed orders',
      details: String(error)
    }, 500);
  }
});

/**
 * GET /admin/products - 获取商品列表（管理员）
 * 需要管理员权限
 * 返回所有商品（用于管理界面）
 */
app.get(`${BASE_PATH}/admin/products`, async (c) => {
  const queryToken = c.req.query('_auth_token');
  const mockBody = queryToken ? { _auth_token: queryToken } : undefined;
  
  const user = await getUser(c.req.raw, mockBody);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  // 验证管理员权限
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // ✅ 修复：从 product:{id} 个体键读取，与公开接口一致
  try {
    const productIds = await kv.get('product:_all_ids') as number[] | null;
    if (!productIds || !Array.isArray(productIds)) {
      return c.json({ products: [] });
    }
    const productKeys = productIds.map(id => `product:${id}`);
    const products = await kv.mget(productKeys);
    const validProducts = products.filter((p: any) => p !== null && typeof p?.id === 'number');
    
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return c.json({ products: validProducts });
  } catch (error) {
    console.error('[ADMIN] Error fetching products:', error);
    return c.json({ error: 'Failed to fetch products' }, 500);
  }
});

/**
 * PATCH /admin/products/price - 更新商品价格
 * 需要管理员权限
 * 允许管理员修改商品价格
 */
app.patch(`${BASE_PATH}/admin/products/price`, async (c) => {
  const body = await c.req.json();
  const user = await getUser(c.req.raw, body);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  // 验证管理员权限
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { productId, price } = body;
  if (!productId || price === undefined) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  // ✅ 修复：从 product:{id} 读取并更新，与其他路由一致
  const product = await kv.get(`product:${productId}`) as any;
  if (!product) {
    return c.json({ error: "Product not found" }, 404);
  }

  product.price = parseFloat(price);
  product.updatedAt = new Date().toISOString();
  product.updatedBy = user.email;
  await kv.set(`product:${productId}`, product);

  console.log(`[ADMIN] Product ${productId} price updated to ${price} by ${user.email}`);
  return c.json({ success: true, product });
});

/**
 * PATCH /admin/products/:id - 更新商品信息（仅管理员）
 * 支持更新商品名称、价格、描述、分类、图片等信息
 */
app.patch(`${BASE_PATH}/admin/products/:id`, async (c) => {
  try {
    const productId = c.req.param('id');
    const body = await c.req.json();
    const authToken = body._auth_token;

    console.log(`[ADMIN] Updating product ${productId}...`);

    // 验证管理员权限
    if (!authToken) {
      return c.json({ error: 'Missing auth token' }, 401);
    }

    // 使用 SERVICE_ROLE_KEY 验证用户 token（与 DELETE 路由一致）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('[ADMIN] Verifying user with token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      console.error('[ADMIN] Auth error:', authError);
      return c.json({ error: 'Unauthorized', code: 401, message: authError?.message || 'Invalid token' }, 401);
    }

    // 检查管理员权限（使用邮箱列表验证）
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.error('[ADMIN] User is not admin:', user.email);
      return c.json({ error: 'Admin access required' }, 403);
    }

    // 获取现有商品
    const product = await kv.get(`product:${productId}`);
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    console.log(`[ADMIN] Current product data:`, {
      id: product.id,
      name: product.name,
      hasImages: !!product.images,
      imageCount: product.images?.length || 0
    });

    // ✅ 修复：使用 !== undefined 检查，避免 falsy 值（空字符串、0等）被跳过
    // 过滤掉 blob URL 和 /_assets/ 路径
    let validImages: string[] | undefined = undefined;
    if (body.images !== undefined && Array.isArray(body.images)) {
      validImages = body.images.filter((url: string) => 
        typeof url === 'string' && !url.startsWith('blob:') && !url.includes('/_assets/')
      );
    }

    const updatedProduct = { ...product }; // 先保留所有原有字段
    
    // 逐个字段更新，只在请求中明确提供了该字段时才更新
    if (body.name !== undefined) updatedProduct.name = body.name;
    if (body.category !== undefined) updatedProduct.category = body.category;
    if (body.categoryCn !== undefined) updatedProduct.categoryCn = body.categoryCn;
    if (body.description !== undefined) updatedProduct.description = body.description;
    if (body.price !== undefined) updatedProduct.price = parseFloat(body.price);
    if (body.tags !== undefined) updatedProduct.tags = body.tags;
    if (body.available !== undefined) updatedProduct.available = body.available;
    if (body.options !== undefined) updatedProduct.options = body.options;
    if (body.sizeGuide !== undefined) updatedProduct.sizeGuide = body.sizeGuide;
    if (body.colorImages !== undefined) updatedProduct.colorImages = body.colorImages;
    if (body.colorLabels !== undefined) updatedProduct.colorLabels = body.colorLabels;
    
    // ✅ 图片处理：只在明确提供了 images 字段时才更新
    if (validImages !== undefined) {
      // 如果过滤后为空但原来有图片，保留原有图片（防止误清空）
      if (validImages.length === 0 && product.images && product.images.length > 0) {
        console.log(`[ADMIN] ⚠️ Filtered images empty, keeping original ${product.images.length} images`);
      } else {
        updatedProduct.images = validImages;
      }
    }

    // colorImages 内无效 URL 过滤
    if (updatedProduct.colorImages && typeof updatedProduct.colorImages === 'object') {
      const cleaned: Record<string, string[]> = {};
      for (const [colorKey, urls] of Object.entries(updatedProduct.colorImages as Record<string, string[]>)) {
        if (!Array.isArray(urls)) continue;
        cleaned[colorKey] = urls.filter((url: string) =>
          typeof url === 'string' && !url.startsWith('blob:') && !url.includes('/_assets/')
        );
      }
      updatedProduct.colorImages = cleaned;
    }

    // 添加更新时间戳
    updatedProduct.updatedAt = new Date().toISOString();
    updatedProduct.updatedBy = user.email;

    // ✅ 安全兜底
    if (!updatedProduct.images) updatedProduct.images = [];
    if (!updatedProduct.tags) updatedProduct.tags = [];

    // ✅ 确保 category 始终出现在 tags 中，防止分类页漏显商品
    if (updatedProduct.category && !updatedProduct.tags.includes(updatedProduct.category)) {
      updatedProduct.tags = [updatedProduct.category, ...updatedProduct.tags];
      console.log(`[ADMIN] Auto-added category "${updatedProduct.category}" to tags`);
    }

    console.log(`[ADMIN] Updated product data:`, {
      id: updatedProduct.id,
      name: updatedProduct.name,
      category: updatedProduct.category,
      price: updatedProduct.price,
      hasImages: !!updatedProduct.images,
      imageCount: updatedProduct.images?.length || 0
    });

    await kv.set(`product:${productId}`, updatedProduct);
    console.log(`[ADMIN] ✅ Product ${productId} updated successfully`);

    return c.json({ 
      success: true, 
      product: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Error updating product:', error);
    return c.json({ 
      error: 'Failed to update product',
      details: String(error)
    }, 500);
  }
});

/**
 * DELETE /admin/products/:id - 删除商品（仅管理员）
 */
app.delete(`${BASE_PATH}/admin/products/:id`, async (c) => {
  try {
    const productId = c.req.param('id');
    
    // 尝试多种方式获取 token：
    // 1. 从查询参数获取 _auth_token（优先）
    // 2. 从 Authorization header 获取
    let authToken = c.req.query('_auth_token');
    
    if (!authToken) {
      const authHeader = c.req.header('Authorization');
      authToken = authHeader?.replace('Bearer ', '');
    }

    console.log(`[ADMIN] Deleting product ${productId}...`);
    console.log('[ADMIN] Auth token source:', c.req.query('_auth_token') ? 'Query parameter' : 'Authorization header');
    console.log('[ADMIN] Auth token length:', authToken?.length || 0);

    // 验证管理员权限
    if (!authToken) {
      return c.json({ error: 'Missing auth token' }, 401);
    }

    // 使用 SERVICE_ROLE_KEY 验证用户 token（与 PATCH 路由一致）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('[ADMIN] Verifying user with token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    
    if (authError) {
      console.error('[ADMIN] Auth error details:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      return c.json({ 
        error: 'Unauthorized', 
        code: 401, 
        message: authError?.message || 'Invalid token' 
      }, 401);
    }
    
    if (!user) {
      console.error('[ADMIN] No user returned from getUser');
      return c.json({ error: 'Unauthorized', code: 401, message: 'No user found' }, 401);
    }

    console.log('[ADMIN] User verified:', user.email);

    // 检查管理员权限（使用邮箱列表验证）
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.error('[ADMIN] User is not admin:', user.email);
      return c.json({ error: 'Admin access required' }, 403);
    }

    // 检查商品是否存在
    const product = await kv.get(`product:${productId}`);
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    // 删除商品
    await kv.del(`product:${productId}`);
    console.log(`[ADMIN] ✅ Deleted product ${productId}`);

    // ✅ 更新商品ID列表：基于现有列表移除，避免 getByPrefix 引入脏数据
    const currentIds = (await kv.get('product:_all_ids') as number[]) || [];
    const updatedIds = [...new Set(currentIds)].filter(id => id !== parseInt(productId));
    await kv.set('product:_all_ids', updatedIds);
    console.log(`[ADMIN] Updated product IDs list:`, updatedIds);

    return c.json({ 
      success: true,
      message: `Product ${product.name.en} deleted successfully`,
      productId,
      remainingProducts: updatedIds.length
    });
  } catch (error) {
    console.error('[ADMIN] Error deleting product:', error);
    return c.json({ 
      error: 'Failed to delete product',
      details: String(error)
    }, 500);
  }
});

/**
 * POST /admin/products - 添加新商品
 * 需要管理员权限
 * 允许管理员添加新商品到系统
 */
app.post(`${BASE_PATH}/admin/products`, async (c) => {
  const productData = await c.req.json();
  
  // 传递 body 给 getUser 以获取 _auth_token
  const user = await getUser(c.req.raw, productData);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  // 验证管理员权限
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return c.json({ error: "Forbidden" }, 403);
  }

  if (!productData || !productData.name || !productData.price) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  try {
    // 从 KV Store 获取所有商品以计算新 ID
    const allProducts = await kv.getByPrefix('product:');
    const validProducts = allProducts.filter((p: any) => typeof p?.id === 'number');
    
    // 生成新的商品 ID（取当前最大 ID + 1）
    const maxId = validProducts.reduce((max: number, p: any) => Math.max(max, p.id || 0), 0);
    const newProductId = maxId + 1;
    
    // 删除 _auth_token，不保存到商品数据中
    const { _auth_token, ...product } = productData;
    
    // 过滤掉无效的图片 URL
    if (product.images && Array.isArray(product.images)) {
      product.images = product.images.filter((url: string) => 
        typeof url === 'string' && !url.startsWith('blob:') && !url.includes('/_assets/')
      );
    }
    
    // 确保价格是数字
    if (product.price !== undefined) {
      product.price = parseFloat(product.price);
    }

    // ✅ 确保 category 始终出现在 tags 中，防止分类页漏显商品
    if (!product.tags || !Array.isArray(product.tags)) product.tags = [];
    if (product.category && !product.tags.includes(product.category)) {
      product.tags = [product.category, ...product.tags];
    }

    product.id = newProductId;
    product.createdAt = new Date().toISOString();
    product.createdBy = user.email;

    // 保存新商品到 KV Store
    await kv.set(`product:${newProductId}`, product);

    // ✅ 更新商品ID列表：基于现有列表追加，避免 getByPrefix 引入脏数据
    const currentIds = (await kv.get('product:_all_ids') as number[]) || [];
    const idSet = new Set(currentIds);
    idSet.add(newProductId);
    const updatedAllIds = [...idSet].sort((a: number, b: number) => a - b);
    await kv.set('product:_all_ids', updatedAllIds);
    console.log(`[ADMIN] Updated product IDs list:`, updatedAllIds);

    console.log(`[ADMIN] Product ${product.id} added by ${user.email}`);
    return c.json({ success: true, product });
  } catch (error) {
    console.error('[ADMIN] Error adding product:', error);
    return c.json({ error: 'Failed to add product' }, 500);
  }
});

/**
 * POST /admin/products/ensure-seeds - 补齐缺失的新种子商品（不覆盖已有商品）
 */
app.post(`${BASE_PATH}/admin/products/ensure-seeds`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const user = await getUser(c.req.raw, body);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const result = await ensureMissingSeedProducts();
    console.log(`[ADMIN] ensure-seeds by ${user.email}:`, result);
    return c.json({ success: true, ...result });
  } catch (error) {
    console.error('[ADMIN] Error ensuring seed products:', error);
    return c.json({ error: 'Failed to ensure seed products', details: String(error) }, 500);
  }
});

/**
 * POST /admin/products/reinit - 重新初始化商品数据
 * 需要管理员权限
 * 清空现有品并重新加载初始数据
 */
app.post(`${BASE_PATH}/admin/products/reinit`, async (c) => {
  const user = await getUser(c.req.raw);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  // 验证管理员权限
  if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return c.json({ error: "Forbidden" }, 403);
  }

  try {
    console.log(`[ADMIN] Reinitializing products by ${user.email}...`);
    
    // 删除所有现有商品
    const existingProducts = await kv.getByPrefix('product:');
    for (const product of existingProducts) {
      if (product && typeof product.id === 'number') {
        await kv.del(`product:${product.id}`);
      }
    }
    
    // 删除商品ID列表
    await kv.del('product:_all_ids');
    
    // 重新初始化商品
    await initializeProducts();
    
    console.log(`[ADMIN] Products reinitialized successfully by ${user.email}`);
    return c.json({ success: true, message: 'Products reinitialized successfully' });
  } catch (error) {
    console.error('[ADMIN] Error reinitializing products:', error);
    return c.json({ error: 'Failed to reinitialize products' }, 500);
  }
});

/**
 * POST /admin/products/fix-blob-urls - 清理所有商品中的 blob URLs
 * 需要管理员权限
 * 将所有包含 blob: 前缀的无效图片URL清空
 */
app.post(`${BASE_PATH}/admin/products/fix-blob-urls`, async (c) => {
  try {
    const body = await c.req.json();
    const user = await getUser(c.req.raw, body);
    
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 验证管理员权限
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return c.json({ error: 'Admin access required' }, 403);
    }

    console.log(`[ADMIN] Fixing blob URLs in all products by ${user.email}...`);

    // ✅ 修复：从 product:{id} 个体键读取，而非 config:products
    const productIds = await kv.get('product:_all_ids') as number[] | null;
    if (!productIds || !Array.isArray(productIds)) {
      return c.json({ success: true, fixedCount: 0, message: 'No products found' });
    }

    let fixedCount = 0;
    let affectedProducts: number[] = [];

    for (const id of productIds) {
      const product = await kv.get(`product:${id}`) as any;
      if (!product || !product.images || !Array.isArray(product.images)) continue;

      const hasInvalidUrls = product.images.some((url: string) => 
        typeof url === 'string' && (url.startsWith('blob:') || url.includes('/_assets/'))
      );

      if (hasInvalidUrls) {
        console.log(`[ADMIN] Product ${id} has invalid URLs, removing them...`);
        product.images = product.images.filter((url: string) => 
          typeof url === 'string' && !url.startsWith('blob:') && !url.includes('/_assets/')
        );
        await kv.set(`product:${id}`, product);
        affectedProducts.push(id);
        fixedCount++;
      }
    }

    console.log(fixedCount > 0
      ? `[ADMIN] Fixed ${fixedCount} products: ${affectedProducts.join(', ')}`
      : '[ADMIN] No invalid URLs found');
    
    return c.json({ 
      success: true, 
      fixedCount,
      affectedProducts: fixedCount > 0 ? affectedProducts : undefined,
      message: fixedCount > 0 ? `Fixed ${fixedCount} products` : 'No invalid URLs found'
    });
  } catch (error) {
    console.error('[ADMIN] Error fixing blob URLs:', error);
    return c.json({ 
      error: 'Failed to fix blob URLs',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ======================
// 图片上传路由
// ======================

/**
 * POST /upload/image - 上传单张图片
 * 需要管理员权限
 * 支持 Base64 或二进制文件上传
 */
app.post(`${BASE_PATH}/upload/image`, async (c) => {
  try {
    const body = await c.req.json();

    console.log('[UPLOAD] Received image upload request');

    // ✅ 使用统一的 getUser 函数（支持 header 和 body 两种认证方式）
    const user = await getUser(c.req.raw, body);
    if (!user) {
      console.error('[UPLOAD] Auth failed');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 获取图片数据
    const { image, fileName, folder } = body;

    // 检查管理员权限（头像上传不需要管理员权限，商品图片才需要）
    if (folder !== 'avatars' && (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase()))) {
      console.error('[UPLOAD] User is not admin:', user.email);
      return c.json({ error: 'Admin access required' }, 403);
    }

    if (!image) {
      return c.json({ error: 'Missing image data' }, 400);
    }

    // 支持 Base64 或原始数据
    const result = await uploadImageFromBase64(
      image,
      fileName || `upload-${Date.now()}.jpg`,
      folder || 'products'
    );

    console.log('[UPLOAD] ✅ Image uploaded successfully:', result.path);

    return c.json({
      success: true,
      url: result.url,
      path: result.path,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('[UPLOAD] Error uploading image:', error);
    return c.json({
      error: 'Failed to upload image',
      details: String(error)
    }, 500);
  }
});

/**
 * POST /upload/images - 批量上传图片
 * 需要管理员权限
 * 支持一次上传多张图片
 */
app.post(`${BASE_PATH}/upload/images`, async (c) => {
  try {
    const body = await c.req.json();

    console.log('[UPLOAD] Received batch image upload request');

    // ✅ 使用统一的 getUser 函数（支持 header 和 body 两种认证方式）
    const user = await getUser(c.req.raw, body);
    if (!user) {
      console.error('[UPLOAD] Auth failed');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 检查管理员权限
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.error('[UPLOAD] User is not admin:', user.email);
      return c.json({ error: 'Admin access required' }, 403);
    }

    // 获取图片数据数组
    const { images, folder } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return c.json({ error: 'Missing or empty images array' }, 400);
    }

    console.log(`[UPLOAD] Uploading ${images.length} images...`);

    // 批量上传图片
    const results = [];
    for (let i = 0; i < images.length; i++) {
      const { image, fileName } = images[i];
      
      if (!image) {
        console.error(`[UPLOAD] Image ${i} is missing data`);
        continue;
      }

      try {
        const result = await uploadImageFromBase64(
          image,
          fileName || `upload-${Date.now()}-${i}.jpg`,
          folder || 'products'
        );
        results.push(result);
        console.log(`[UPLOAD] ✅ Image ${i + 1}/${images.length} uploaded:`, result.path);
      } catch (error) {
        console.error(`[UPLOAD] Failed to upload image ${i}:`, error);
        results.push({ error: String(error), index: i });
      }
    }

    const successCount = results.filter(r => !r.error).length;
    console.log(`[UPLOAD] ✅ Batch upload complete: ${successCount}/${images.length} successful`);

    return c.json({
      success: true,
      results,
      successCount,
      totalCount: images.length,
      message: `${successCount} of ${images.length} images uploaded successfully`
    });
  } catch (error) {
    console.error('[UPLOAD] Error in batch upload:', error);
    return c.json({
      error: 'Failed to upload images',
      details: String(error)
    }, 500);
  }
});

/**
 * POST /upload/avatar - 上传用户头像
 * 需要登录（普通用户即可）
 */
app.post(`${BASE_PATH}/upload/avatar`, async (c) => {
  try {
    const body = await c.req.json();
    
    // 传递 body 给 getUser 以获取 _auth_token
    const user = await getUser(c.req.raw, body);
    if (!user) {
      console.error('[UPLOAD] Unauthorized: No valid user token');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('[UPLOAD] User authenticated:', user.email);

    // 获取头像数据
    const { image, fileName } = body;

    if (!image) {
      return c.json({ error: 'Missing image data' }, 400);
    }

    // 上传头像到用户文件夹
    const result = await uploadImageFromBase64(
      image,
      fileName || `avatar-${user.id}.jpg`,
      `avatars/${user.id}`
    );

    console.log('[UPLOAD] ✅ Avatar uploaded successfully:', result.path);

    // 更新用户元数据中的头像 URL
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        user_metadata: { 
          ...user.user_metadata,
          avatar_url: result.url,
          avatar_path: result.path
        } 
      }
    );

    if (updateError) {
      console.error('[UPLOAD] Failed to update user metadata:', updateError);
      // 头像已上传，但元数据更新失败，仍返回成功
    }

    return c.json({
      success: true,
      url: result.url,
      path: result.path,
      message: 'Avatar uploaded successfully'
    });
  } catch (error) {
    console.error('[UPLOAD] Error uploading avatar:', error);
    return c.json({
      error: 'Failed to upload avatar',
      details: String(error)
    }, 500);
  }
});

/**
 * GET /storage/list-files - 列出 Storage 中的所有文件
 * 公开路由（用于图片选择器）
 */
app.get(`${BASE_PATH}/storage/list-files`, async (c) => {
  try {
    console.log('[STORAGE] Listing all files...');
    
    // 导入必要的函数
    const { listFiles, getSignedUrl } = await import('./storage-utils.tsx');
    
    // 检查 bucket 是否为公开访问
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const BUCKET_NAME = 'make-c4f5ade4-images';
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucket = buckets?.find((b: any) => b.name === BUCKET_NAME);
    const isPublic = bucket?.public ?? false;
    
    console.log(`[STORAGE] Bucket is ${isPublic ? 'PUBLIC' : 'PRIVATE'}`);
    
    // 列出所有文件（递归获取所有文件夹）
    const allFiles: any[] = [];
    
    // 获取根目录文件
    const rootFiles = await listFiles();
    
    // 处理每个文件/文件夹
    for (const item of rootFiles) {
      if (item.id) {
        // 这是一个文件
        let url: string;
        if (isPublic) {
          // 公开 bucket - 使用公开 URL
          url = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${item.name}`;
        } else {
          // 私有 bucket - 使用签名 URL
          try {
            url = await getSignedUrl(item.name);
          } catch (error) {
            console.error(`[STORAGE] Error getting signed URL for ${item.name}:`, error);
            // 跳过无法���取 URL 的文件
            continue;
          }
        }
        
        allFiles.push({
          name: item.name,
          path: item.name,
          url,
          size: item.metadata?.size,
          created_at: item.created_at,
        });
      } else {
        // 这是一个文件夹，递归获取文件
        try {
          const folderFiles = await listFiles(item.name);
          for (const file of folderFiles) {
            if (file.id) {
              const filePath = `${item.name}/${file.name}`;
              let url: string;
              
              if (isPublic) {
                // 公开 bucket - 使用公开 URL
                url = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
              } else {
                // 私有 bucket - 使用签名 URL
                try {
                  url = await getSignedUrl(filePath);
                } catch (error) {
                  console.error(`[STORAGE] Error getting signed URL for ${filePath}:`, error);
                  // 跳过无法获取 URL 的文件
                  continue;
                }
              }
              
              allFiles.push({
                name: file.name,
                path: filePath,
                url,
                size: file.metadata?.size,
                created_at: file.created_at,
              });
            }
          }
        } catch (error) {
          console.error(`[STORAGE] Error listing folder ${item.name}:`, error);
        }
      }
    }
    
    console.log(`[STORAGE] ✅ Found ${allFiles.length} files`);
    
    return c.json({
      success: true,
      files: allFiles,
      count: allFiles.length,
      isPublic,
    });
  } catch (error) {
    console.error('[STORAGE] Error listing files:', error);
    return c.json({
      error: 'Failed to list files',
      details: String(error),
    }, 500);
  }
});

/**
 * DELETE /upload/image - 删除图片
 * 需要管理员权限
 */
app.delete(`${BASE_PATH}/upload/image`, async (c) => {
  try {
    const body = await c.req.json();

    console.log('[UPLOAD] Received delete image request');

    // ✅ 使用统一的 getUser 函数（支持 header 和 body 两种认证方式）
    const user = await getUser(c.req.raw, body);
    if (!user) {
      console.error('[UPLOAD] Auth failed');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 检查管理员权限
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      console.error('[UPLOAD] User is not admin:', user.email);
      return c.json({ error: 'Admin access required' }, 403);
    }

    const { path } = body;

    if (!path) {
      return c.json({ error: 'Missing image path' }, 400);
    }

    const success = await deleteMultipleImages([path]);

    if (!success) {
      return c.json({ error: 'Failed to delete image' }, 500);
    }

    console.log('[UPLOAD] ✅ Image deleted successfully:', path);

    return c.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('[UPLOAD] Error deleting image:', error);
    return c.json({
      error: 'Failed to delete image',
      details: String(error)
    }, 500);
  }
});

// ======================
// 用户管理路由
// ======================
addUserManagementRoutes(app, BASE_PATH, getUser);

// ======================
// 销售统计路由
// ======================
app.get(`${BASE_PATH}/sales-statistics`, getSalesStatistics);

// ======================
// 订单取消路由
// ======================
app.post(`${BASE_PATH}/cancel-order`, cancelOrder);

// ======================
// 聊天/消息系统路由
// ======================

/**
 * POST /chat/send - 发送消息
 * 支持客户和管理员发送消息
 */
app.post(`${BASE_PATH}/chat/send`, async (c) => {
  try {
    const body = await c.req.json();
    const user = await getUser(c.req.raw, body);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { content, customerId, role, senderName } = body;
    
    if (!content) {
      return c.json({ error: "Content is required" }, 400);
    }

    // 确定消息的归属客户ID
    // 如果是管理员发送，必须提供 customerId
    // 如果是客户发送，customerId 就是自己的 ID
    let targetCustomerId = user.id;
    let senderRole = 'customer';
    
    // 检查是否是管理员
    const isAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
    
    if (role === 'admin') {
      if (!isAdmin) {
        return c.json({ error: "Forbidden: Not an admin" }, 403);
      }
      if (!customerId) {
        return c.json({ error: "Customer ID is required for admin messages" }, 400);
      }
      targetCustomerId = customerId;
      senderRole = 'admin';
    }

    const timestamp = Date.now();
    const messageId = crypto.randomUUID();
    
    const message = {
      id: messageId,
      customerId: targetCustomerId,
      senderId: user.id,
      senderName: senderName || (senderRole === 'admin' ? 'Admin' : 'Customer'),
      senderRole,
      content,
      timestamp,
      read: false
    };

    // 1. 保存消息
    // 使用复合键支持按时间排序: chat:msg:{customerId}:{timestamp}
    await kv.set(`chat:msg:${targetCustomerId}:${timestamp}`, message);

    // 2. 更新会话元数据
    const sessionKey = `chat:session:${targetCustomerId}`;
    const sessionData = await kv.get(sessionKey) || {
      customerId: targetCustomerId,
      customerName: senderRole === 'customer' ? senderName : 'Unknown',
      customerEmail: senderRole === 'customer' ? user.email : '',
      unreadCount: 0,
      createdAt: timestamp
    };

    // 更新最后消息
    sessionData.lastMessage = content;
    sessionData.lastTimestamp = timestamp;
    
    // 如果是客户发送的，增加未读计数（给管理员看）
    if (senderRole === 'customer') {
      sessionData.unreadCount = (sessionData.unreadCount || 0) + 1;
      // 同时也更新客户信息，以防之前是空的
      sessionData.customerName = senderName || sessionData.customerName;
      sessionData.customerEmail = user.email || sessionData.customerEmail;

      // 发送邮件通知管理员（异步）
      sendChatMessageNotification(message, user.email).catch(e => console.error('[CHAT] Failed to send email notification:', e));
    }

    await kv.set(sessionKey, sessionData);

    return c.json({ success: true, message });
  } catch (error) {
    console.error('[CHAT] Error sending message:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * GET /chat/messages - 获取消息列表
 * 获取指定客户的聊天记录
 */
app.get(`${BASE_PATH}/chat/messages`, async (c) => {
  try {
    const queryToken = c.req.query('_auth_token');
    const mockBody = queryToken ? { _auth_token: queryToken } : undefined;
    const user = await getUser(c.req.raw, mockBody);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    let targetCustomerId = c.req.query('customerId') || user.id;
    const isAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

    // 如果查询其他人的消息，必须是管理员
    if (targetCustomerId !== user.id && !isAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // 获取该客户的所有消息
    const messages = await kv.getByPrefix(`chat:msg:${targetCustomerId}:`);
    
    // 如果是管理员查看，或者是客户查看，都可以在这里处理"已读"逻辑
    // 但为了简单，我们单独提供一个 mark-read 接口，或者在前端调用
    
    return c.json({ messages });
  } catch (error) {
    console.error('[CHAT] Error fetching messages:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * GET /chat/sessions - 获取会话列表 (管理员)
 */
app.get(`${BASE_PATH}/chat/sessions`, async (c) => {
  try {
    const queryToken = c.req.query('_auth_token');
    const mockBody = queryToken ? { _auth_token: queryToken } : undefined;
    const user = await getUser(c.req.raw, mockBody);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // 验证管理员权限
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // 获取所有会话元数据
    const sessions = await kv.getByPrefix(`chat:session:`);
    
    // 按最后消息时间倒序排序
    sessions.sort((a: any, b: any) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

    return c.json({ sessions });
  } catch (error) {
    console.error('[CHAT] Error fetching sessions:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * POST /chat/read - 标记会话已读
 */
app.post(`${BASE_PATH}/chat/read`, async (c) => {
  try {
    const body = await c.req.json();
    const user = await getUser(c.req.raw, body);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { customerId } = body;
    
    // 如果是管理员，标记该客户的会话为已读（清空 unreadCount）
    // 如果是客户，目前不需要标记什么，因为我们只统计客户发给管理员的未读
    
    const isAdmin = user.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
    
    if (isAdmin && customerId) {
      const sessionKey = `chat:session:${customerId}`;
      const sessionData = await kv.get(sessionKey);
      
      if (sessionData) {
        sessionData.unreadCount = 0;
        await kv.set(sessionKey, sessionData);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('[CHAT] Error marking read:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// ======================
// About Us 内容管理路由
// ======================

/**
 * GET /aboutus/can-edit - 当前登录用户是否可以编辑 About（管理员 + 可选白名单）
 */
app.get(`${BASE_PATH}/aboutus/can-edit`, async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return c.json({ canEdit: false });
    }
    const allowlist = await getAboutEditorAllowlist();
    const canEdit = adminCanEditAboutContent(user.email, allowlist);
    return c.json({ canEdit });
  } catch (error) {
    console.error('[ABOUTUS] can-edit error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * GET /admin/aboutus-editors - 查看 About 编辑白名单（不设 key 或未设置 = 全体管理员）
 */
app.get(`${BASE_PATH}/admin/aboutus-editors`, async (c) => {
  try {
    const user = await getUser(c.req.raw);
    if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const v = await kv.get('aboutus:editor_allowlist');
    if (v === undefined || v === null) {
      return c.json({ emails: null as string[] | null });
    }
    if (!Array.isArray(v)) {
      return c.json({ emails: null as string[] | null });
    }
    const normalized = [...new Set(v.map((x: unknown) => String(x).trim().toLowerCase()).filter(Boolean))];
    return c.json({ emails: normalized });
  } catch (error) {
    console.error('[ABOUTUS] admin get editors:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * PUT /admin/aboutus-editors - 设置 About 编辑白名单。emails:null 或未传则清空限制（全员可编辑）；emails:[] 则无人可编辑
 */
app.put(`${BASE_PATH}/admin/aboutus-editors`, async (c) => {
  try {
    const body = await c.req.json();
    const user = await getUser(c.req.raw, body);

    if (!user?.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    let { emails } = body as { emails?: unknown; _auth_token?: string };
    if (emails !== null && emails !== undefined && !Array.isArray(emails)) {
      return c.json({ error: 'emails must be null or string[]' }, 400);
    }

    if (emails === null || emails === undefined) {
      await kv.del('aboutus:editor_allowlist');
      console.log('[ABOUTUS] ✅ Editor allowlist cleared (all admins may edit)');
      return c.json({ success: true, emails: null });
    }

    const normalized = [...new Set(
      (emails as unknown[]).map((x) => String(x).trim().toLowerCase()).filter(Boolean),
    )];
    for (const em of normalized) {
      if (!ADMIN_EMAILS.includes(em)) {
        return c.json({ error: `Invalid admin email not in roster: ${em}` }, 400);
      }
    }

    await kv.set('aboutus:editor_allowlist', normalized);
    console.log('[ABOUTUS] ✅ Editor allowlist updated by', user.email);
    return c.json({ success: true, emails: normalized });
  } catch (error) {
    console.error('[ABOUTUS] admin put editors:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * GET /aboutus-content - 获取 About Us 页面内容
 */
app.get(`${BASE_PATH}/aboutus-content`, async (c) => {
  try {
    const content = await kv.get('aboutus:content');
    return c.json({ content: content || null });
  } catch (error) {
    console.error('[ABOUTUS] Error fetching content:', error);
    return c.json({ error: String(error) }, 500);
  }
});

/**
 * PUT /aboutus-content - 更新 About Us 页面内容（管理员专用）
 */
app.put(`${BASE_PATH}/aboutus-content`, async (c) => {
  try {
    const body = await c.req.json();
    const user = await getUser(c.req.raw, body);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const allowlist = await getAboutEditorAllowlist();
    if (!adminCanEditAboutContent(user.email, allowlist)) {
      return c.json({ error: 'Forbidden — About Us editing is restricted for your account' }, 403);
    }

    const { content } = body;

    if (content === undefined || content === null) {
      return c.json({ error: 'Content is required' }, 400);
    }
    if (typeof content !== 'object' || Array.isArray(content)) {
      return c.json({ error: 'Content must be a JSON object' }, 400);
    }

    await kv.set('aboutus:content', content);
    console.log('[ABOUTUS] ✅ Content updated by admin:', user.email);
    return c.json({ success: true });
  } catch (error) {
    console.error('[ABOUTUS] Error updating content:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// 启动 Deno 服务器
Deno.serve(app.fetch);