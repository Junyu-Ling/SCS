/**
 * 手动上传图片到 Supabase Storage 的组件
 * 用于管理员批量上传商品图片等
 */

import { useState } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

interface UploadedImage {
  name: string;
  url: string;
  path: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export default function ManualImageUpload() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [folder, setFolder] = useState('products');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    // 初始化所有图片为 uploading 状态
    const newImages: UploadedImage[] = Array.from(files).map(file => ({
      name: file.name,
      url: '',
      path: '',
      status: 'uploading',
    }));

    setImages(prev => [...prev, ...newImages]);

    // 逐个上传
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageIndex = images.length + i;

      try {
        // 读取文件为 Base64
        const base64 = await fileToBase64(file);

        // 调用后端 API 上传 (使用现有的 /upload/image 端点)
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4/upload/image`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64,
              fileName: file.name,
              folder: folder || undefined,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || '上传失败');
        }

        const result = await response.json();

        // 更新为成功状态
        setImages(prev => {
          const updated = [...prev];
          updated[imageIndex] = {
            ...updated[imageIndex],
            status: 'success',
            url: result.url,
            path: result.path,
          };
          return updated;
        });

      } catch (error: any) {
        console.error('Upload error:', error);
        // 更新为错误状态
        setImages(prev => {
          const updated = [...prev];
          updated[imageIndex] = {
            ...updated[imageIndex],
            status: 'error',
            error: error.message || '上传失败',
          };
          return updated;
        });
      }
    }

    setIsUploading(false);
    // 清空文件选择器
    event.target.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setImages([]);
  };

  const successCount = images.filter(img => img.status === 'success').length;
  const errorCount = images.filter(img => img.status === 'error').length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* 标题 */}
      <div>
        <h2 className="text-2xl font-bold mb-2">手动上传图片</h2>
        <p className="text-gray-600 dark:text-gray-400">
          上传图片到 Supabase Storage，获取永久 URL 链接
        </p>
      </div>

      {/* 上传控制 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        {/* 文件夹选择 */}
        <div>
          <label className="block text-sm font-medium mb-2">
            上传到文件夹（可选）
          </label>
          <input
            type="text"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="例如: products, avatars"
            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">
            留空则上传到根目录
          </p>
        </div>

        {/* 上传按钮 */}
        <div>
          <label className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
            <Upload className="w-5 h-5" />
            <span>{isUploading ? '上传中...' : '选择图片'}</span>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500 mt-2 text-center">
            支持 PNG, JPG, WebP, GIF，单个文件最大 8MB
          </p>
        </div>

        {/* 统计信息 */}
        {images.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
            <div className="flex gap-4 text-sm">
              <span>总计: {images.length}</span>
              <span className="text-green-600">成功: {successCount}</span>
              {errorCount > 0 && <span className="text-red-600">失败: {errorCount}</span>}
            </div>
            <button
              onClick={clearAll}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              清空列表
            </button>
          </div>
        )}
      </div>

      {/* 上传结果列表 */}
      {images.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b dark:border-gray-700">
            <h3 className="font-semibold">上传结果</h3>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {images.map((image, index) => (
              <div key={index} className="p-4 flex items-start gap-4">
                {/* 状态图标 */}
                <div className="flex-shrink-0 mt-1">
                  {image.status === 'uploading' && (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  )}
                  {image.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  )}
                  {image.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{image.name}</p>
                  
                  {image.status === 'success' && (
                    <div className="mt-2 space-y-2">
                      {/* URL */}
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          图片 URL（点击复制）
                        </label>
                        <div
                          onClick={() => copyToClipboard(image.url)}
                          className="text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <code className="text-xs break-all">{image.url}</code>
                        </div>
                      </div>
                      
                      {/* Path */}
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          存储路径（点击复制）
                        </label>
                        <div
                          onClick={() => copyToClipboard(image.path)}
                          className="text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <code className="text-xs">{image.path}</code>
                        </div>
                      </div>
                    </div>
                  )}

                  {image.status === 'error' && (
                    <p className="text-sm text-red-600 mt-1">{image.error}</p>
                  )}

                  {image.status === 'uploading' && (
                    <p className="text-sm text-gray-500 mt-1">正在上传...</p>
                  )}
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => removeImage(index)}
                  className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  disabled={image.status === 'uploading'}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2">💡 使用提示</h4>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li>• 上传成功后，可以点击 URL 或路径来复制到剪贴板</li>
          <li>• URL 可以直接在 <code>&lt;img&gt;</code> 标签中使用</li>
          <li>• 建议为不同类型的图片创建不同的文件夹（如 products、avatars）</li>
          <li>• 签名 URL 有效期为 1 年，过期后系统会自动刷新</li>
        </ul>
      </div>
    </div>
  );
}