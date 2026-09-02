/**
 * Supabase Storage 工具函数
 * 用于管理图片上传、存储和访问
 */

import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const BUCKET_NAME = 'make-c4f5ade4-images';

// ✅ 添加签名 URL 缓存 - 避免频繁重新生成
const signedUrlCache = new Map<string, { url: string; expires: number }>();
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7天缓存（签名 URL 有效期 1 年）

// ✅ 检测 bucket 是否为公开访问
let IS_PUBLIC_BUCKET: boolean | null = null;

/**
 * 创建 Supabase 客户端
 */
const getClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
};

/**
 * 检测 bucket 是否为公开访问
 */
async function checkIfPublicBucket(): Promise<boolean> {
  if (IS_PUBLIC_BUCKET !== null) {
    return IS_PUBLIC_BUCKET;
  }

  const supabase = getClient();
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucket = buckets?.find(b => b.name === BUCKET_NAME);
    IS_PUBLIC_BUCKET = bucket?.public ?? false;
    console.log(`[STORAGE] Bucket '${BUCKET_NAME}' is ${IS_PUBLIC_BUCKET ? 'PUBLIC' : 'PRIVATE'}`);
    return IS_PUBLIC_BUCKET;
  } catch (error) {
    console.error('[STORAGE] Error checking bucket visibility:', error);
    IS_PUBLIC_BUCKET = false;
    return false;
  }
}

/**
 * 获取图片的公开 URL（用于公开 bucket）
 */
function getPublicUrl(path: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
}

/**
 * 初始化 Storage Bucket
 * 如果 bucket 不存在则创建
 */
export async function initializeBucket() {
  const supabase = getClient();
  
  try {
    console.log('[STORAGE] Checking if bucket exists...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('[STORAGE] Error listing buckets:', listError);
      // 如果列举失败，尝试创建（可能是权限问题）
      // 不要 throw，继续尝试创建
      console.log('[STORAGE] Attempting to create bucket anyway...');
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`[STORAGE] ✅ Bucket '${BUCKET_NAME}' already exists`);
      return true;
    }
    
    // 创建新 bucket
    console.log(`[STORAGE] Creating bucket '${BUCKET_NAME}'...`);
    const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'],
    });
    
    if (createError) {
      // 检查是否是"已存在"错误（状态码 400 或错误消息包含 "already exists"）
      const isAlreadyExistsError = 
        createError.message?.toLowerCase().includes('already exists') ||
        createError.message?.toLowerCase().includes('duplicate') ||
        (createError as any).status === 400;
      
      if (isAlreadyExistsError) {
        console.log(`[STORAGE] ✅ Bucket '${BUCKET_NAME}' already exists (confirmed by create attempt)`);
        return true;
      }
      
      console.error('[STORAGE] Error creating bucket:', createError);
      console.error('[STORAGE] Error details:', {
        message: createError.message,
        status: (createError as any).status,
        name: createError.name
      });
      
      // 其他错误也不 throw，返回 false 表示失败但不中断服务器启动
      return false;
    }
    
    console.log(`[STORAGE] ✅ Successfully created bucket '${BUCKET_NAME}'`);
    return true;
  } catch (error) {
    console.error('[STORAGE] Unexpected error in initializeBucket:', error);
    // 不要 throw，返回 false 允许服务器继续启动
    return false;
  }
}

/**
 * 上传图片到 Storage
 * @param file - 文件的 ArrayBuffer 或 Uint8Array
 * @param fileName - 文件名（应包含扩展名）
 * @param folder - 可选的文件夹路径（如 'products', 'avatars'）
 * @returns 文件的公开或签名 URL
 */
export async function uploadImage(
  file: ArrayBuffer | Uint8Array,
  fileName: string,
  folder?: string
): Promise<{ url: string; path: string }> {
  const supabase = getClient();
  
  // 生成唯一文件名（添加时间戳避免冲突）
  const timestamp = Date.now();
  const uniqueFileName = `${timestamp}-${fileName}`;
  const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
  
  console.log(`[STORAGE] Uploading file to: ${filePath}`);
  
  // 上传文件
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: getContentType(fileName),
      upsert: false, // 不覆盖已存在的文件
    });
  
  if (error) {
    console.error('[STORAGE] Upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
  
  console.log(`[STORAGE] ✅ File uploaded successfully: ${data.path}`);
  
  // 检查 bucket 是否为公开访问
  const isPublic = await checkIfPublicBucket();
  
  if (isPublic) {
    // 公开 bucket - 直接返回公开 URL
    const publicUrl = getPublicUrl(data.path);
    console.log(`[STORAGE] ✅ Public URL generated: ${publicUrl}`);
    return {
      url: publicUrl,
      path: data.path,
    };
  } else {
    // 私有 bucket - 生成签名 URL（有效期 1 年）
    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 31536000); // 1 year in seconds
    
    if (urlError) {
      console.error('[STORAGE] Error creating signed URL:', urlError);
      throw new Error(`Failed to create signed URL: ${urlError.message}`);
    }
    
    console.log(`[STORAGE] ✅ Signed URL created`);
    
    return {
      url: urlData.signedUrl,
      path: data.path,
    };
  }
}

/**
 * 从 Base64 字符串上传图片
 * @param base64String - Base64 编码的图片字符串（可包含 data:image/... 前缀）
 * @param fileName - 文件名
 * @param folder - 可选的文件夹路径
 */
export async function uploadImageFromBase64(
  base64String: string,
  fileName: string,
  folder?: string
): Promise<{ url: string; path: string }> {
  // 移除 data:image/...;base64, 前缀
  const base64Data = base64String.includes(',') 
    ? base64String.split(',')[1] 
    : base64String;
  
  // 检查 Base64 数据大小（在解码之前）
  const estimatedSizeInBytes = (base64Data.length * 3) / 4;
  const estimatedSizeInMB = estimatedSizeInBytes / (1024 * 1024);
  
  console.log(`[STORAGE] Base64 size: ${estimatedSizeInMB.toFixed(2)}MB`);
  
  // 如果超过 8MB，拒绝上传（留有余量）
  if (estimatedSizeInMB > 8) {
    throw new Error(`Image too large: ${estimatedSizeInMB.toFixed(2)}MB (max 8MB). Please compress the image on the client side.`);
  }
  
  // 解码 Base64
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  console.log(`[STORAGE] Decoded size: ${(bytes.length / (1024 * 1024)).toFixed(2)}MB`);
  
  return uploadImage(bytes, fileName, folder);
}

/**
 * 批量上传图片
 * @param files - 图片文件数组（ArrayBuffer 或 Uint8Array）
 * @param fileNames - 对应的文件名数组
 * @param folder - 可选的文件夹路径
 */
export async function uploadMultipleImages(
  files: (ArrayBuffer | Uint8Array)[],
  fileNames: string[],
  folder?: string
): Promise<{ url: string; path: string }[]> {
  if (files.length !== fileNames.length) {
    throw new Error('Files and fileNames arrays must have the same length');
  }
  
  console.log(`[STORAGE] Uploading ${files.length} images...`);
  
  const results = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await uploadImage(files[i], fileNames[i], folder);
      results.push(result);
    } catch (error) {
      console.error(`[STORAGE] Failed to upload image ${i}:`, error);
      throw error;
    }
  }
  
  console.log(`[STORAGE] ✅ All ${files.length} images uploaded successfully`);
  return results;
}

/**
 * 删除图片
 * @param path - 文件路径（从上传时返回的 path）
 */
export async function deleteImage(path: string): Promise<boolean> {
  const supabase = getClient();
  
  console.log(`[STORAGE] Deleting file: ${path}`);
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);
  
  if (error) {
    console.error('[STORAGE] Delete error:', error);
    return false;
  }
  
  console.log(`[STORAGE] ✅ File deleted successfully`);
  return true;
}

/**
 * 批量删除图片
 * @param paths - 文件路径数组
 */
export async function deleteMultipleImages(paths: string[]): Promise<boolean> {
  const supabase = getClient();
  
  console.log(`[STORAGE] Deleting ${paths.length} files...`);
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths);
  
  if (error) {
    console.error('[STORAGE] Delete error:', error);
    return false;
  }
  
  console.log(`[STORAGE] ✅ All files deleted successfully`);
  return true;
}

/**
 * 刷新签名 URL
 * @param path - 文件路径
 * @param expiresIn - URL 有效期（秒），默认 1 年
 */
export async function refreshSignedUrl(path: string, expiresIn: number = 31536000): Promise<string> {
  const supabase = getClient();
  
  // 首先检查文件是否存在
  console.log(`[STORAGE] Checking if file exists: ${path}`);
  const { data: listData, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(path.substring(0, path.lastIndexOf('/')), {
      search: path.substring(path.lastIndexOf('/') + 1)
    });
  
  if (listError) {
    console.error('[STORAGE] Error checking file existence:', listError);
  } else if (!listData || listData.length === 0) {
    console.warn(`[STORAGE] ⚠️ File not found in storage: ${path}`);
    throw new Error(`File not found in storage: ${path}`);
  }
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    console.error('[STORAGE] Error refreshing signed URL:', error);
    throw new Error(`Failed to refresh signed URL: ${error.message}`);
  }
  
  console.log(`[STORAGE] ✅ Successfully refreshed signed URL for: ${path}`);
  return data.signedUrl;
}

/**
 * 获取或生成签名 URL（带缓存）
 * @param path - 文件路径
 * @param expiresIn - URL 有效期（秒），默认 1 年
 */
export async function getSignedUrl(path: string, expiresIn: number = 31536000): Promise<string> {
  const now = Date.now();
  const cached = signedUrlCache.get(path);
  
  // 检查缓存是否有效（还有至少 7 天未过期）
  if (cached && cached.expires > now) {
    console.log(`[STORAGE] 📦 Using cached signed URL for: ${path}`);
    return cached.url;
  }
  
  console.log(`[STORAGE] 🔄 Generating new signed URL for: ${path}`);
  const url = await refreshSignedUrl(path, expiresIn);
  
  // 缓存新的签名 URL
  signedUrlCache.set(path, {
    url,
    expires: now + CACHE_DURATION,
  });
  
  return url;
}

/**
 * 清除签名 URL 缓存
 */
export function clearSignedUrlCache(path?: string) {
  if (path) {
    signedUrlCache.delete(path);
    console.log(`[STORAGE] 🗑️ Cleared cache for: ${path}`);
  } else {
    signedUrlCache.clear();
    console.log('[STORAGE] 🗑️ Cleared all signed URL cache');
  }
}

/**
 * 根据文件名获取 Content-Type
 */
function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  return types[ext || 'jpg'] || 'image/jpeg';
}

/**
 * 列出文件夹中的所有文件
 * @param folder - 文件夹路径
 */
export async function listFiles(folder?: string): Promise<any[]> {
  const supabase = getClient();
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folder || '', {
      limit: 1000,
      offset: 0,
    });
  
  if (error) {
    console.error('[STORAGE] Error listing files:', error);
    throw error;
  }
  
  return data || [];
}