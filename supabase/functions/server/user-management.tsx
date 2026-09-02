/**
 * 用户管理辅助函数
 * 用于创建用户管理相关的路由
 */

import { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

// 初始管理员邮箱列表
const INITIAL_ADMIN_EMAILS = [
  '202760149@stu.scls-sh.org',
  '202760107@stu.scls-sh.org',
  '202760102@stu.scls-sh.org',
];

/**
 * 获取所有管理员邮箱（包括初始和动态添加的）
 */
export async function getAllAdminEmails(): Promise<string[]> {
  const dynamicAdminEmails = await kv.get('config:admin_emails') as string[] || [];
  return [...new Set([...INITIAL_ADMIN_EMAILS, ...dynamicAdminEmails])];
}

/**
 * 检查用户是否为管理员
 */
export async function isAdmin(email: string): Promise<boolean> {
  const allAdmins = await getAllAdminEmails();
  return allAdmins.includes(email.toLowerCase());
}

/**
 * 添加用户管理路由到 app
 */
export function addUserManagementRoutes(app: Hono, basePath: string, getUser: Function) {
  /**
   * GET /admin/users - 获取所有用户列表
   */
  app.get(`${basePath}/admin/users`, async (c) => {
    console.log('[ADMIN] Received get all users request');
    
    const queryToken = c.req.query('_auth_token');
    const mockBody = queryToken ? { _auth_token: queryToken } : undefined;
    
    const user = await getUser(c.req.raw, mockBody);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // 验证管理员权限
    if (!user.email || !await isAdmin(user.email)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      const { data: { users }, error } = await supabase.auth.admin.listUsers();

      if (error) {
        console.error('[ADMIN] Error fetching users:', error);
        return c.json({ error: 'Failed to fetch users' }, 500);
      }

      const allAdminEmails = await getAllAdminEmails();

      const formattedUsers = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        user_metadata: u.user_metadata,
        isAdmin: u.email && allAdminEmails.includes(u.email.toLowerCase()),
        isInitialAdmin: u.email && INITIAL_ADMIN_EMAILS.includes(u.email.toLowerCase()),
      }));

      console.log(`[ADMIN] Found ${formattedUsers.length} users`);
      return c.json({ users: formattedUsers });
    } catch (error) {
      console.error('[ADMIN] Error in get users:', error);
      return c.json({ error: String(error) }, 500);
    }
  });

  /**
   * POST /admin/users/grant-admin - 赋予用户管理员权限
   */
  app.post(`${basePath}/admin/users/grant-admin`, async (c) => {
    const body = await c.req.json();
    const user = await getUser(c.req.raw, body);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!user.email || !await isAdmin(user.email)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { email } = body;
    
    if (!email) {
      return c.json({ error: 'Missing email parameter' }, 400);
    }

    try {
      const adminEmails = await kv.get('config:admin_emails') as string[] || [];
      
      if (await isAdmin(email)) {
        return c.json({ 
          success: true,
          message: 'User is already an admin',
          isAdmin: true
        });
      }

      adminEmails.push(email.toLowerCase());
      await kv.set('config:admin_emails', adminEmails);

      console.log(`[ADMIN] ✅ Admin privileges granted to ${email} by ${user.email}`);

      return c.json({ 
        success: true,
        message: `Admin privileges granted to ${email}`,
        isAdmin: true
      });
    } catch (error) {
      console.error('[ADMIN] Error granting admin:', error);
      return c.json({ error: String(error) }, 500);
    }
  });

  /**
   * POST /admin/users/revoke-admin - 撤销用户管理员权限
   */
  app.post(`${basePath}/admin/users/revoke-admin`, async (c) => {
    const body = await c.req.json();
    const user = await getUser(c.req.raw, body);
    
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!user.email || !await isAdmin(user.email)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { email } = body;
    
    if (!email) {
      return c.json({ error: 'Missing email parameter' }, 400);
    }

    if (email.toLowerCase() === user.email.toLowerCase()) {
      return c.json({ error: 'Cannot revoke your own admin privileges' }, 400);
    }

    if (INITIAL_ADMIN_EMAILS.includes(email.toLowerCase())) {
      return c.json({ error: 'Cannot revoke privileges of initial admins' }, 400);
    }

    try {
      const adminEmails = await kv.get('config:admin_emails') as string[] || [];
      const updatedEmails = adminEmails.filter(e => e.toLowerCase() !== email.toLowerCase());
      
      if (updatedEmails.length === adminEmails.length) {
        return c.json({ 
          success: true,
          message: 'User is not an admin',
          isAdmin: false
        });
      }

      await kv.set('config:admin_emails', updatedEmails);

      console.log(`[ADMIN] ✅ Admin privileges revoked from ${email} by ${user.email}`);

      return c.json({ 
        success: true,
        message: `Admin privileges revoked from ${email}`,
        isAdmin: false
      });
    } catch (error) {
      console.error('[ADMIN] Error revoking admin:', error);
      return c.json({ error: String(error) }, 500);
    }
  });
}
