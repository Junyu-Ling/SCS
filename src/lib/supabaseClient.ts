/**
 * Supabase 客户端配置
 * 
 * 此文件创建和配置 Supabase 客户端实例（单例模式）
 * 用于前端的用户认证和 API 调用
 * 
 * 特性：
 * - 单例模式，确保只有一个 Supabase 客户端实例
 * - 自动 session 管理和 token 刷新
 * - 监听 auth 状态变化
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { AboutUsContent } from '../app/components/AboutUsEditor';

const supabaseUrl = `https://${projectId}.supabase.co`;
const supabaseKey = publicAnonKey;

// 单例实例
let supabaseInstance: SupabaseClient | null = null;

// 存储偏好设置
// 初始化逻辑：如果 SessionStorage 中有 token 且 LocalStorage 中没有，则默认为不记住（SessionStorage）
// 否则默认为记住（LocalStorage）
let persistInLocalStorage = true;

if (typeof window !== 'undefined') {
  const tokenKey = `sb-${projectId}-auth-token`;
  const hasSessionStorage = window.sessionStorage.getItem(tokenKey);
  const hasLocalStorage = window.localStorage.getItem(tokenKey);
  
  if (hasSessionStorage && !hasLocalStorage) {
    persistInLocalStorage = false;
  }
}

/**
 * 设置认证持久化模式
 * @param remember - true: 使用 LocalStorage (记住我); false: 使用 SessionStorage (浏览器关闭即失效)
 */
export function setAuthPersistence(remember: boolean) {
  persistInLocalStorage = remember;
  console.log('[Supabase] Auth persistence set to:', remember ? 'LocalStorage' : 'SessionStorage');
}

// 自定义存储适配器，支持动态切换 LocalStorage 和 SessionStorage
const customStorage = {
  getItem: (key: string): string | null => {
    // 优先查找 LocalStorage，然后 SessionStorage
    // 这样即使用户之前是“记住我”，现在切换到“不记住”，也能读取到旧的 session
    return window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (persistInLocalStorage) {
      window.localStorage.setItem(key, value);
      // 确保存储在 SessionStorage 中的旧数据被清理，避免混淆
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
      // 确保存储在 LocalStorage 中的旧数据被清理
      window.localStorage.removeItem(key);
    }
  },
  removeItem: (key: string): void => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
};

/**
 * 获取 Supabase 客户端实例（单例模式）
 * 确保整个应用只有一个 Supabase 客户端实例
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    console.log('[Supabase] Creating new Supabase client instance');
    
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,        // 开启持久化
        autoRefreshToken: true,       // 自动刷新 token
        detectSessionInUrl: true,     // 检测 URL 中的会话信息（用于邮箱验证）
        storage: customStorage,       // 使用自定义存储适配器
        flowType: 'pkce'             // 使用 PKCE 流程提高安全性
      }
    });

    // 监听 auth 状态变化
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      console.log('[Supabase Auth] State changed:', event);
      
      if (event === 'SIGNED_IN') {
        console.log('[Supabase Auth] ✅ User signed in');
      } else if (event === 'SIGNED_OUT') {
        console.log('[Supabase Auth] 🚪 User signed out');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[Supabase Auth] 🔄 Token refreshed successfully');
      } else if (event === 'USER_UPDATED') {
        console.log('[Supabase Auth] 👤 User data updated');
      }

      // 如果 session 存在，记录过期时间
      if (session?.expires_at) {
        const expiresIn = session.expires_at - Math.floor(Date.now() / 1000);
        console.log('[Supabase Auth] Session expires in:', Math.floor(expiresIn / 60), 'minutes');
      }
    });
  }
  
  return supabaseInstance;
}

/**
 * Supabase 客户端实例（单例）
 */
export const supabase = getSupabaseClient();

/**
 * Edge Function 调用辅助函数
 * 
 * 用于调用 Supabase Edge Functions（后端 API）
 * 自动处理认证 token 和错误处理
 * 
 * @param path - API 路径（例如：'/orders'）
 * @param options - 请求选项
 * @param options.method - HTTP 方法（GET、POST 等）
 * @param options.body - 请求体数据
 * @param options.requireAuth - 是否需要认证（默认 true）
 * @returns Promise<any> - 返回 API 响应的 JSON 数据
 */
export async function callEdgeFunction(
  path: string,
  options: {
    method?: string;
    body?: any;
    requireAuth?: boolean;
  } = {}
) {
  const { method = 'GET', body, requireAuth = true } = options;
  
  console.log(`[API] 📡 Calling ${method} ${path}, requireAuth:`, requireAuth);
  
  try {
    // 获取当前会话
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[API] ❌ Session error:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }
    
    // 检查 token 是否即将过期（60秒内）
    if (session?.expires_at) {
      const expiresIn = session.expires_at - Math.floor(Date.now() / 1000);
      
      if (expiresIn < 60) {
        console.log('[API] ⏰ Token expiring soon (in', expiresIn, 'seconds), refreshing...');
        
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[API] ❌ Failed to refresh token:', refreshError);
          throw new Error('Session expired - please login again');
        }
        
        if (refreshedSession) {
          console.log('[API] ✅ Token refreshed successfully');
          // 递归调用，使用刷新后的 session
          return callEdgeFunction(path, options);
        }
      } else {
        console.log('[API] ⏰ Token is valid for', Math.floor(expiresIn / 60), 'minutes');
      }
    }
    
    // 如果需要认证但没有有效会话
    if (requireAuth && (!session || !session.access_token)) {
      console.error('[API] ❌ Authentication required but no valid session found');
      throw new Error('Authentication required - please login');
    }
    
    // 构建请求 URL
    const url = `${supabaseUrl}/functions/v1/make-server-c4f5ade4${path}`;
    
    // 构建请求头
    const headers: Record<string, string> = {
      'apikey': publicAnonKey,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    };
    
    // Only set Content-Type for non-GET requests with a body
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
    }
    
    // 添加认证头
    if (requireAuth && session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
      console.log('[API] 🔐 Using user access token');
    } else {
      // For non-auth routes OR when no session, always use anon key
      headers['Authorization'] = `Bearer ${publicAnonKey}`;
      console.log('[API] 🔓 Using public anon key');
    }
    
    // 构建请求选项
    const fetchOptions: RequestInit = {
      method,
      headers,
    };
    
    // 添加请求体（如果需要）
    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }
    
    console.log(`[API] 🚀 Fetching ${url}`);
    
    // 发送请求（带重试，处理服务器冷启动导致的 Failed to fetch）
    const MAX_RETRIES = 8;
    let response: Response | undefined;
    let lastFetchError: Error | undefined;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await fetch(url, fetchOptions);
        lastFetchError = undefined;
        break;
      } catch (fetchErr) {
        lastFetchError = fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr));
        console.warn(`[API] ⚠️ Fetch attempt ${attempt}/${MAX_RETRIES} failed for ${path}:`, lastFetchError.message);
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(3000 + attempt * 1500, 10000);
          console.log(`[API] ⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!response) {
      throw lastFetchError || new Error(`Failed to fetch ${path} after ${MAX_RETRIES} retries`);
    }
    
    // 处理响应
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] ❌ Error ${response.status} on ${path}:`, errorText);
      
      // 如果是 401 错误，可能是 token 过期
      if (response.status === 401 && requireAuth) {
        console.log('[API] 🔄 Received 401, attempting to refresh token...');
        
        const { error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError) {
          // Token 刷新成功，重试请求
          console.log('[API] ✅ Token refreshed, retrying request...');
          return callEdgeFunction(path, options);
        }
      }
      
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    console.log(`[API] ✅ Request to ${path} succeeded`);
    return response.json();
    
  } catch (error) {
    console.error('[API] ❌ Exception during API call:', error);
    throw error;
  }
}

/**
 * 保存 About Us 内容（需在请求体中携带 _auth_token，与 Edge getUser 约定一致）
 */
export async function saveAboutUsContentToServer(content: AboutUsContent): Promise<void> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('请先登录 / Please sign in');
  }

  await callEdgeFunction('/aboutus-content', {
    method: 'PUT',
    body: {
      content,
      _auth_token: session.access_token,
    },
    requireAuth: true,
  });
}

/** 当前账号是否在后端允许的 About 正文编辑名单中 */
export async function fetchAboutUsCanEdit(): Promise<boolean> {
  try {
    const res = await callEdgeFunction('/aboutus/can-edit', { method: 'GET', requireAuth: true });
    return !!(res as { canEdit?: boolean })?.canEdit;
  } catch {
    return false;
  }
}

/** 管理员读取 About 编辑白名单：null 表示不设限（全员可编辑），数组含 0 人则任何人都不能编辑正文 */
export async function fetchAboutUsEditors(): Promise<{ emails: string[] | null }> {
  const res = await callEdgeFunction('/admin/aboutus-editors', { method: 'GET', requireAuth: true });
  return {
    emails: (res as { emails?: string[] | null }).emails === undefined ? null : (res as { emails: string[] | null }).emails,
  };
}

/** 写入白名单；emails === null 时删除 KV 键，恢复全员可编辑 */
export async function saveAboutUsEditors(emails: string[] | null): Promise<void> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('请先登录 / Please sign in');
  }
  await callEdgeFunction('/admin/aboutus-editors', {
    method: 'PUT',
    body: { emails: emails === undefined ? null : emails, _auth_token: session.access_token },
    requireAuth: true,
  });
}