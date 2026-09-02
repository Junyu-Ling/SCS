/**
 * 图片映射工具 - 将 Supabase Storage 中的图片映射到商品
 * 用于管理员批量更新商品图片
 */

import { useState, useEffect } from 'react';
import { Image, Link2, Save, RefreshCw, AlertCircle, CheckCircle2, Loader2, Eye, Trash2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { toast } from 'sonner';

interface StorageFile {
  name: string;
  path: string;
  url?: string;
  size?: number;
  created_at?: string;
}

interface Product {
  id: number;
  name: {
    en: string;
    cn: string;
  };
  description: {
    en: string;
    cn: string;
  };
  price: number;
  images: string[];
  category: string;
  tags: string[];
  options?: Record<string, number>;
}

interface StorageResponse {
  success: boolean;
  files: StorageFile[];
  count: number;
  isPublic?: boolean;
}

export default function ImageMapper() {
  const [storageFiles, setStorageFiles] = useState<StorageFile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [folderFilter, setFolderFilter] = useState('');
  const [isPublicBucket, setIsPublicBucket] = useState(false);

  const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;

  // 加载 Storage 中的图片
  const loadStorageFiles = async () => {
    try {
      console.log('[ImageMapper] Loading storage files...');
      const response = await fetch(`${API_BASE}/storage/list-files`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load storage files');
      }

      const data: StorageResponse = await response.json();
      console.log('[ImageMapper] Storage files:', data);
      setStorageFiles(data.files || []);
      setIsPublicBucket(data.isPublic ?? false);
    } catch (error: any) {
      console.error('[ImageMapper] Error loading files:', error);
      toast.error('加载图片失败: ' + error.message);
    }
  };

  // 加载所有商品
  const loadProducts = async () => {
    try {
      console.log('[ImageMapper] Loading products...');
      const response = await fetch(`${API_BASE}/products`);

      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const data = await response.json();
      console.log('[ImageMapper] Products:', data);
      setProducts(data.products || []);
    } catch (error: any) {
      console.error('[ImageMapper] Error loading products:', error);
      toast.error('加载商品失败: ' + error.message);
    }
  };

  // 初始加载
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadStorageFiles(), loadProducts()]);
      setIsLoading(false);
    };
    init();
  }, []);

  // 当选择商品时，加载其现有图片
  useEffect(() => {
    if (selectedProduct) {
      setSelectedImages(selectedProduct.images || []);
    } else {
      setSelectedImages([]);
    }
  }, [selectedProduct]);

  // 切换图片选择
  const toggleImage = (url: string) => {
    if (selectedImages.includes(url)) {
      setSelectedImages(selectedImages.filter(img => img !== url));
    } else {
      setSelectedImages([...selectedImages, url]);
    }
  };

  // 保存商品图片映射
  const saveMapping = async () => {
    if (!selectedProduct) {
      toast.error('请先选择一个商品');
      return;
    }

    if (selectedImages.length === 0) {
      toast.error('请至少选择一张图片');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE}/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...selectedProduct,
          images: selectedImages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || '更新失败');
      }

      toast.success(`✅ 已更新 ${selectedProduct.name.cn} 的图片`);
      
      // 重新加载商品列表
      await loadProducts();
      
      // 更新选中的商品
      const updatedProduct = products.find(p => p.id === selectedProduct.id);
      if (updatedProduct) {
        setSelectedProduct(updatedProduct);
      }
    } catch (error: any) {
      console.error('[ImageMapper] Error saving:', error);
      toast.error('保存失败: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 过滤文件
  const filteredFiles = folderFilter
    ? storageFiles.filter(file => file.path.startsWith(folderFilter))
    : storageFiles;

  // 获取所有文件夹
  const folders = Array.from(new Set(
    storageFiles
      .map(file => file.path.split('/')[0])
      .filter(Boolean)
  ));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">图片映射工具</h1>
        <p className="text-gray-600 dark:text-gray-400">
          将 Supabase Storage 中的图片分配给对应的商品
        </p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Image className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Storage 图片</p>
              <p className="text-2xl font-bold">{storageFiles.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">商品总数</p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">已选择图片</p>
              <p className="text-2xl font-bold">{selectedImages.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：商品列表 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-semibold">选择商品</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              点击商品来为其分配图片
            </p>
          </div>
          
          <div className="divide-y dark:divide-gray-700 max-h-[600px] overflow-y-auto">
            {products.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedProduct?.id === product.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 商品图片预览 */}
                  <div className="flex-shrink-0">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name.cn}
                        className="w-16 h-16 object-cover rounded border dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded border dark:border-gray-600 flex items-center justify-center">
                        <Image className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 商品信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{product.name.cn}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {product.name.en}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                        {product.category}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        ¥{product.price}
                      </span>
                      {product.images && product.images.length > 0 && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          {product.images.length} 张图片
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：Storage 图片库 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Storage 图片库</h2>
              <button
                onClick={loadStorageFiles}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="刷新"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* 文件夹筛选 */}
            {folders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFolderFilter('')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${
                    folderFilter === ''
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  全部 ({storageFiles.length})
                </button>
                {folders.map(folder => (
                  <button
                    key={folder}
                    onClick={() => setFolderFilter(folder)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      folderFilter === folder
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {folder} ({storageFiles.filter(f => f.path.startsWith(folder)).length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 图片网格 */}
          <div className="p-4 max-h-[600px] overflow-y-auto">
            {filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  没有找到图片
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  请先上传图片到 Supabase Storage
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredFiles.map(file => (
                  <div
                    key={file.path}
                    onClick={() => file.url && toggleImage(file.url)}
                    className={`relative cursor-pointer rounded-lg border-2 transition-all hover:shadow-lg ${
                      file.url && selectedImages.includes(file.url)
                        ? 'border-blue-600 ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {/* 图片 */}
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden">
                      {file.url ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* 文件信息 */}
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-b-lg">
                      <p className="text-xs font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      {file.size && (
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      )}
                    </div>

                    {/* 选中标记 */}
                    {file.url && selectedImages.includes(file.url) && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      {selectedProduct && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                当前选择: {selectedProduct.name.cn}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                已选择 {selectedImages.length} 张图片
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setSelectedImages([]);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveMapping}
                disabled={isSaving || selectedImages.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    保存映射
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 已选择图片预览 */}
          {selectedImages.length > 0 && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <p className="text-sm font-medium mb-2">已选择的图片:</p>
              <div className="flex flex-wrap gap-2">
                {selectedImages.map((url, index) => (
                  <div key={url} className="relative group">
                    <img
                      src={url}
                      alt={`Selected ${index + 1}`}
                      className="w-20 h-20 object-cover rounded border-2 border-blue-600"
                    />
                    <button
                      onClick={() => toggleImage(url)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 使用提示 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          使用说明
        </h4>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300 ml-7">
          <li>1. 从左侧选择一个商品</li>
          <li>2. 从右侧选择要分配给该商品的图片（可多选）</li>
          <li>3. 点击"保存映射"按钮完成关联</li>
          <li>4. 图片顺序就是在商品详情页显示的顺序</li>
          <li>5. 如果 Storage 中没有图片，请先访问 <a href="#/upload-images" className="text-blue-600 hover:underline">上传图片页面</a></li>
        </ul>
      </div>
    </div>
  );
}