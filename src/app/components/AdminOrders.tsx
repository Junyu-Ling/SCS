import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { supabase, callEdgeFunction } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { Product } from '../data/products';
import { CartItem } from '../contexts/CartContext';
import { useInventory } from '../hooks/useInventory';
import { getProductImages } from '../data/product-images';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { clearProductsCache, updateProductInCache, finalizeProduct } from '../hooks/useProducts';

import { EditStockModal } from './EditStockModal';
import { ChatInterface } from './ChatInterface';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from './ui/tabs';
import * as XLSX from 'xlsx';
import { 
  ShoppingCart, 
  RefreshCw, 
  Loader2, 
  Package, 
  DollarSign, 
  ArrowUpDown,
  Plus,
  Upload,
  X,
  CheckCircle,
  Image,
  ShoppingBag,
  Clock,
  Edit,
  Trash2,
  FileDown,
  Pencil,
  ExternalLink
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

/**
 * 预定类型定义
 */
interface Order {
  id: string;
  orderNumber?: string; // 新的预定号格式（YYYYMMDDXXX）
  userId: string;
  userEmail: string;
  items: CartItem[];
  total: number;
  status: string;
  createdAt: string;
  contactInfo: {
    real_name: string;
    class_name: string;
    role: string;
  };
  completed?: boolean; // 管理员标记为已完成
  isOffline?: boolean; // 是否为线下订单
}

/**
 * 渲染订单商品项（包括选项如尺码）- 移动端卡片样式
 */
const renderOrderItem = (item: CartItem, idx: number) => (
  <div key={idx} className="flex justify-between text-sm">
    <span>
      {item.name || 'Unknown Product / 未知商品'}
      {item.option && item.option !== 'Default' && <span className="text-gray-500 text-xs ml-1">({item.option})</span>}
    </span>
    <span className="text-gray-600">x{item.quantity || 1}</span>
  </div>
);

/**
 * 渲染订单商品项（包括选项如尺码）- 桌面端表格样式
 */
const renderOrderItemDesktop = (item: CartItem, idx: number) => (
  <div key={idx} className="text-sm">
    <span className="font-medium">
      {item.name || 'Unknown Product / 未知商品'}
      {item.option && item.option !== 'Default' && <span className="text-gray-500 text-xs ml-1">({item.option})</span>}
    </span>
    <span className="text-gray-600 ml-2">x{item.quantity || 1}</span>
  </div>
);

/**
 * 添加商品对话框组件
 * 新商品将保存到 KV Store
 */
function AddProductDialog({ onProductAdded, existingProducts }: { onProductAdded: (newProduct: Product) => void; existingProducts: Product[] }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, session } = useProfile();
  const { t, language } = useLanguage();
  const [productData, setProductData] = useState({
    nameEn: '',
    nameCn: '',
    price: '',
    category: '',
    descriptionEn: '',
    descriptionCn: '',
  });
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // 颜色变体支持
  const [isColorVariant, setIsColorVariant] = useState(false);
  const [colorVariants, setColorVariants] = useState<Array<{
    key: string;
    labelEn: string;
    labelCn: string;
    images: string[];
  }>>([{ key: '', labelEn: '', labelCn: '', images: [] }]);

  // 预定义的分类选项（与编辑对话框保持一致）
  const categoryOptions = ['apparel', 'stationery', 'dailyUse', 'gift', 'sports'];

  /**
   * 处理图片上传
   * 上传到 Supabase Storage 而不是保存为 Base64
   * 🚀 优化：支持图片压缩和并行上传
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // ✅ 检查每个文件的原始大小，拒绝超过 15MB 的文件
    for (let i = 0; i < files.length; i++) {
      const fileSizeMB = files[i].size / (1024 * 1024);
      if (fileSizeMB > 15) {
        toast.error(language === 'en' 
          ? `File "${files[i].name}" is too large (${fileSizeMB.toFixed(1)}MB). Maximum 15MB.` 
          : `文件 "${files[i].name}" 过大 (${fileSizeMB.toFixed(1)}MB)，最大 15MB`);
        return;
      }
    }

    console.log('[ADMIN] 🎯 Using direct Supabase Storage upload');
    
    try {
      // 🚀 压缩图片为 Blob 的辅助函数
      const compressImageToBlob = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // 压缩：最大尺寸 1000px，质量 0.7
              const MAX_SIZE = 1000;
              let width = img.width;
              let height = img.height;
              
              if (width > height && width > MAX_SIZE) {
                height = (height * MAX_SIZE) / width;
                width = MAX_SIZE;
              } else if (height > MAX_SIZE) {
                width = (width * MAX_SIZE) / height;
                height = MAX_SIZE;
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);
              
              // 转换为 Blob（JPEG 格式，质量 0.7）
              canvas.toBlob((blob) => {
                if (blob) {
                  const sizeMB = blob.size / (1024 * 1024);
                  console.log(`[ADMIN] Compressed blob size: ${sizeMB.toFixed(2)}MB`);
                  resolve(blob);
                } else {
                  reject(new Error('Failed to create blob'));
                }
              }, 'image/jpeg', 0.7);
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };
      
      // 🚀 并行上传所有图片到 Storage
      const uploadPromises = Array.from(files).map(async (file) => {
        try {
          console.log(`[ADMIN] 📤 Processing file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
          
          // 压缩图片为 Blob
          const compressedBlob = await compressImageToBlob(file);
          console.log(`[ADMIN] ✅ Compressed to: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);
          
          // 生成唯一文件名
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(7);
          const fileName = `${timestamp}-${randomStr}.jpg`;
          const filePath = `products/${fileName}`;
          
          console.log(`[ADMIN] 🚀 Uploading ${fileName} to Storage...`);
          
          // 直接上传到 Supabase Storage
          const { data, error } = await supabase.storage
            .from('make-c4f5ade4-images')
            .upload(filePath, compressedBlob, {
              contentType: 'image/jpeg',
              upsert: false
            });
          
          if (error) {
            console.error('[ADMIN] ❌ Storage upload error:', error);
            throw error;
          }
          
          // 生成签名 URL（有效期 1 年）
          const { data: urlData, error: urlError } = await supabase.storage
            .from('make-c4f5ade4-images')
            .createSignedUrl(filePath, 31536000); // 365 天
          
          if (urlError || !urlData) {
            console.error('[ADMIN] ❌ Failed to create signed URL:', urlError);
            throw new Error('Failed to create signed URL');
          }
          
          console.log('[ADMIN] ✅ Image uploaded successfully:', urlData.signedUrl);
          return urlData.signedUrl;
        } catch (error) {
          console.error('[ADMIN] ❌ Error uploading file:', file.name);
          if (error instanceof Error) {
            console.error('[ADMIN] Error message:', error.message);
          } else {
            console.error('[ADMIN] Error:', error);
          }
          toast.error(t(`Upload failed: ${file.name}`, `上传失败：${file.name}`));
          return null;
        }
      });

      // 等待所有上���完成
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);
      
      if (successfulUploads.length > 0) {
        setUploadedImages(prev => [...prev, ...successfulUploads]);
        toast.success(t(
          `Uploaded ${successfulUploads.length} image(s)`,
          `已上传 ${successfulUploads.length} 张图片`
        ));
      }
      
      if (results.length > successfulUploads.length) {
        const failedCount = results.length - successfulUploads.length;
        toast.error(t(
          `${failedCount} image(s) failed to upload`,
          `${failedCount} 张图片上传失败`
        ));
      }
    } catch (error) {
      console.error('[ADMIN] Error uploading images:', error);
      toast.error(t('Failed to upload images', '图片上传失败'));
    }
  };

  /**
   * 移除已上传的图片
   */
  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * 提交新商品到后端 API
   */
  const handleSubmit = async () => {
    // 验证所有必填字段
    if (!productData.nameEn || !productData.nameCn) {
      toast.error(t('Please fill in both English and Chinese product names', '请填写中英文商品名称'));
      return;
    }

    if (!productData.price || parseFloat(productData.price) <= 0) {
      toast.error(t('Please enter a valid price', '请输入有效价格'));
      return;
    }

    if (!productData.descriptionEn || !productData.descriptionCn) {
      toast.error(t('Please fill in both English and Chinese descriptions', '请填写中英文商品描述'));
      return;
    }

    if (uploadedImages.length === 0) {
      toast.error(t('Please upload at least one product image', '请至少上传一张商品图片'));
      return;
    }

    if (!user || !session) {
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[ADMIN] Getting fresh session for adding product...');
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[ADMIN] Session error:', sessionError);
        toast.error(t('Session expired', '会话过期'));
        return;
      }

      // 构建商品对象：自动将 category 写入 tags，确保分类页能正确显示
      const category = productData.category || 'Other';

      // 构建颜色变体数据
      let colorImages: Record<string, string[]> | undefined;
      let colorLabels: Record<string, { en: string; cn: string }> | undefined;
      let colorOptions: Record<string, number> | undefined;
      let primaryImages = uploadedImages;

      if (isColorVariant && colorVariants.some(v => v.key && v.images.length > 0)) {
        colorImages = {};
        colorLabels = {};
        colorOptions = {};
        colorVariants.forEach(v => {
          if (v.key) {
            colorImages![v.key] = v.images;
            colorLabels![v.key] = { en: v.labelEn || v.key, cn: v.labelCn || v.key };
            colorOptions![v.key] = 0;
          }
        });
        // 以第一个颜色的图片作为主图
        const firstVariant = colorVariants.find(v => v.key && v.images.length > 0);
        if (firstVariant) {
          primaryImages = firstVariant.images;
        }
      }

      const newProduct = {
        name: {
          en: productData.nameEn,
          cn: productData.nameCn,
        },
        description: {
          en: productData.descriptionEn,
          cn: productData.descriptionCn,
        },
        price: parseFloat(productData.price),
        category,
        tags: category !== 'Other' ? [category] : [],
        images: primaryImages,
        ...(colorImages ? { colorImages } : {}),
        ...(colorLabels ? { colorLabels } : {}),
        ...(colorOptions ? { options: colorOptions } : {}),
        _auth_token: freshSession.access_token,
      };

      console.log('[ADMIN] Adding new product to KV Store...');
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(newProduct),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ADMIN] Failed to add product:', response.status, errorData);
        toast.error(errorData.error || t('Failed to add product', '添加商品失败'));
        return;
      }

      const data = await response.json();
      console.log('[ADMIN] Product added successfully:', data.product);

      toast.success(t('Product added successfully', '商品添加成功'));
      
      // Reset form
      setProductData({
        nameEn: '',
        nameCn: '',
        price: '',
        category: '',
        descriptionEn: '',
        descriptionCn: '',
      });
      setUploadedImages([]);
      setIsColorVariant(false);
      setColorVariants([{ key: '', labelEn: '', labelCn: '', images: [] }]);
      setOpen(false);
      
      // 立即添加到商品列表，无需重新加载
      if (data.product) {
        onProductAdded(data.product);
      }
      
      // ✅ 清除前端缓存，确保前台页面立即看到新商品
      clearProductsCache();
      console.log('[ADMIN] Product cache cleared for frontend sync');
      
      // ✅ 延迟二次刷新，确保后端写入完成后前台分类列表正确显示新商品
      setTimeout(() => {
        clearProductsCache();
        console.log('[ADMIN] Secondary cache clear for new product sync');
      }, 1500);
    } catch (error) {
      toast.error(t('Error adding product', '添加商品错误'));
      console.error('[ADMIN] Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dataURLtoBlob = (dataURL: string) => {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-700 hover:bg-green-800">
          <Plus className="w-4 h-4 mr-2" />
          Add New Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Add a new product with images and descriptions
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Product Names */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nameEn">Product Name (EN) *</Label>
              <Input
                id="nameEn"
                placeholder="e.g., Campus T-Shirt"
                value={productData.nameEn}
                onChange={(e) => setProductData(prev => ({ ...prev, nameEn: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameCn">Product Name (CN) *</Label>
              <Input
                id="nameCn"
                placeholder="e.g., 校园T恤"
                value={productData.nameCn}
                onChange={(e) => setProductData(prev => ({ ...prev, nameCn: e.target.value }))}
              />
            </div>
          </div>

          {/* Price and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (CNY) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="e.g., 99.00"
                value={productData.price}
                onChange={(e) => setProductData(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('Category', '类别')}</Label>
              <Select
                value={productData.category}
                onValueChange={(value) => setProductData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Select category', '选择类别')} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 颜色变体开关 */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="color-variant-toggle"
              checked={isColorVariant}
              onChange={(e) => setIsColorVariant(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor="color-variant-toggle" className="text-sm font-medium cursor-pointer select-none">
              颜色变体（不同颜色对应不同图片 / Color variants with different images）
            </label>
          </div>

          {/* Image Upload - 普通模式 */}
          {!isColorVariant && (
            <div className="space-y-2">
              <Label>Product Images *</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Click to upload images or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG (no size limit)
                  </p>
                </label>
              </div>
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <ImageWithFallback 
                        src={img} 
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 颜色变体图片上传区域 */}
          {isColorVariant && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>颜色变体配置 *</Label>
                <button
                  type="button"
                  onClick={() => setColorVariants(prev => [...prev, { key: '', labelEn: '', labelCn: '', images: [] }])}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 添加颜色
                </button>
              </div>
              {colorVariants.map((variant, variantIdx) => (
                <div key={variantIdx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <Input
                        placeholder="颜色Key (e.g. Blue)"
                        value={variant.key}
                        onChange={(e) => setColorVariants(prev => prev.map((v, i) => i === variantIdx ? { ...v, key: e.target.value } : v))}
                        className="text-xs"
                      />
                      <Input
                        placeholder="EN label (e.g. Blue)"
                        value={variant.labelEn}
                        onChange={(e) => setColorVariants(prev => prev.map((v, i) => i === variantIdx ? { ...v, labelEn: e.target.value } : v))}
                        className="text-xs"
                      />
                      <Input
                        placeholder="CN label (e.g. 蓝色)"
                        value={variant.labelCn}
                        onChange={(e) => setColorVariants(prev => prev.map((v, i) => i === variantIdx ? { ...v, labelCn: e.target.value } : v))}
                        className="text-xs"
                      />
                    </div>
                    {colorVariants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setColorVariants(prev => prev.filter((_, i) => i !== variantIdx))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded p-3 text-center hover:border-gray-400 transition-colors bg-white">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        const compressImageToBlob = async (file: File): Promise<Blob> => {
                          return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const img = document.createElement('img');
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                const MAX_SIZE = 1000;
                                let w = img.width, h = img.height;
                                if (w > h && w > MAX_SIZE) { h = (h * MAX_SIZE) / w; w = MAX_SIZE; }
                                else if (h > MAX_SIZE) { w = (w * MAX_SIZE) / h; h = MAX_SIZE; }
                                canvas.width = w; canvas.height = h;
                                ctx?.drawImage(img, 0, 0, w, h);
                                canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Failed')), 'image/jpeg', 0.7);
                              };
                              img.onerror = reject;
                              img.src = ev.target?.result as string;
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                          });
                        };
                        const uploadPromises = Array.from(files).map(async (file) => {
                          try {
                            const blob = await compressImageToBlob(file);
                            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                            const { data, error } = await supabase.storage.from('make-c4f5ade4-images').upload(`products/${fileName}`, blob, { contentType: 'image/jpeg', upsert: false });
                            if (error) throw error;
                            const { data: urlData } = await supabase.storage.from('make-c4f5ade4-images').createSignedUrl(`products/${fileName}`, 31536000);
                            return urlData?.signedUrl || null;
                          } catch { return null; }
                        });
                        const results = await Promise.all(uploadPromises);
                        const urls = results.filter((u): u is string => u !== null);
                        if (urls.length > 0) {
                          setColorVariants(prev => prev.map((v, i) => i === variantIdx ? { ...v, images: [...v.images, ...urls] } : v));
                          toast.success(`已上传 ${urls.length} 张图片`);
                        }
                      }}
                      className="hidden"
                      id={`color-image-upload-${variantIdx}`}
                    />
                    <label htmlFor={`color-image-upload-${variantIdx}`} className="cursor-pointer">
                      <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                      <p className="text-xs text-gray-500">上传 {variant.labelCn || variant.key || `颜色${variantIdx + 1}`} 的图片</p>
                    </label>
                  </div>
                  {variant.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-1">
                      {variant.images.map((img, imgIdx) => (
                        <div key={imgIdx} className="relative group">
                          <ImageWithFallback src={img} alt={`${variant.key}-${imgIdx}`} className="w-full h-16 object-cover rounded border" />
                          <button
                            onClick={() => setColorVariants(prev => prev.map((v, i) => i === variantIdx ? { ...v, images: v.images.filter((_, j) => j !== imgIdx) } : v))}
                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Descriptions */}
          <div className="space-y-2">
            <Label htmlFor="descriptionEn">Description (EN) *</Label>
            <Textarea
              id="descriptionEn"
              placeholder="Product description in English..."
              rows={3}
              value={productData.descriptionEn}
              onChange={(e) => setProductData(prev => ({ ...prev, descriptionEn: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descriptionCn">Description (CN) *</Label>
            <Textarea
              id="descriptionCn"
              placeholder="产品描述（中文）..."
              rows={3}
              value={productData.descriptionCn}
              onChange={(e) => setProductData(prev => ({ ...prev, descriptionCn: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('Cancel', '取消')}
          </Button>
          <Button onClick={handleSubmit} className="bg-green-700 hover:bg-green-800" disabled={isSubmitting}>
            {t('Add Product', '添加商品')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Price Dialog Component
function EditPriceDialog({ 
  productId, 
  productName, 
  currentPrice,
  onPriceUpdated 
}: { 
  productId: number;
  productName: string; 
  currentPrice: number;
  onPriceUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [newPrice, setNewPrice] = useState(currentPrice.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, session } = useProfile();
  const { t } = useLanguage();

  // 当价格改变时更新显示值
  useEffect(() => {
    setNewPrice(currentPrice.toString());
  }, [currentPrice, open]);

  const handleSubmit = async () => {
    if (!user || !session) {
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      return;
    }

    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast.error(t('Please enter a valid price', '请输入有效价格'));
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[ADMIN] Getting fresh session for price update...');
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[ADMIN] Session error:', sessionError);
        toast.error(t('Session expired', '会话过期'));
        return;
      }

      const updatedPrice = parseFloat(newPrice);
      
      console.log(`[ADMIN] Updating product ${productId} price to ${updatedPrice}...`);
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          price: updatedPrice,
          _auth_token: freshSession.access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ADMIN] Failed to update price:', response.status, errorData);
        toast.error(errorData.error || t('Failed to update price', '更新价格失败'));
        return;
      }

      const data = await response.json();
      console.log('[ADMIN] Price updated successfully:', data.product);

      toast.success(t('Price updated successfully', '价格更新成功'));
      
      setOpen(false);
      
      // ✅ 立即更新本地缓存，防止页面切换时闪烁旧价格
      if (data.product) {
        updateProductInCache(data.product);
      }
      
      // ✅ 清除前端缓存，确保前台页面立即看到更新
      clearProductsCache();
      console.log('[ADMIN] Product cache cleared for frontend sync');
      
      // 刷新商品列表以显示更新后的价格
      onPriceUpdated();
    } catch (error) {
      toast.error(t('Error updating price', '更新价格错误'));
      console.error('[ADMIN] Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit Price
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Price</DialogTitle>
          <DialogDescription>
            Update price for {productName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="price">New Price (CNY)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('Cancel', '取消')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {t('Update Price', '更新价格')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 新的完整商品编辑对话框组件
function EditProductDialog({ 
  product,
  onProductUpdated 
}: { 
  product: any;
  onProductUpdated: (updatedProduct: Product) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { user, session } = useProfile();
  const { t, language } = useLanguage();
  
  // 表单状态
  const [formData, setFormData] = useState({
    nameEn: product.name.en,
    nameCn: product.name.cn,
    category: product.category,
    descriptionEn: product.description?.en || '',
    descriptionCn: product.description?.cn || '',
    price: product.price.toString(),
    images: product.images || [], // 支持多张图片
    tag: product.tags && product.tags.length > 0 ? product.tags[0] : 'none', // 标签选择
  });

  // 颜色变体（与新建商品一致：选色换图）
  const [isColorVariant, setIsColorVariant] = useState(
    !!(product.colorImages && Object.keys(product.colorImages).length > 0)
  );
  const [colorVariants, setColorVariants] = useState<Array<{
    key: string;
    labelEn: string;
    labelCn: string;
    images: string[];
    stock: number;
  }>>([]);

  const syncFormFromProduct = () => {
    const specialTag = (product.tags || []).find((t: string) => t === 'new' || t === 'hot') || 'none';
    setFormData({
      nameEn: product.name.en,
      nameCn: product.name.cn,
      category: product.category,
      descriptionEn: product.description?.en || '',
      descriptionCn: product.description?.cn || '',
      price: product.price.toString(),
      images: product.images || [],
      tag: specialTag,
    });
    const hasColors = !!(product.colorImages && Object.keys(product.colorImages).length > 0);
    setIsColorVariant(hasColors);
    if (hasColors) {
      const keys = Object.keys(product.colorImages);
      setColorVariants(keys.map((key) => ({
        key,
        labelEn: product.colorLabels?.[key]?.en || key,
        labelCn: product.colorLabels?.[key]?.cn || key,
        images: product.colorImages[key] || [],
        stock: typeof product.options?.[key] === 'number' ? product.options[key] : 0,
      })));
    } else {
      setColorVariants([{ key: '', labelEn: '', labelCn: '', images: [], stock: 0 }]);
    }
  };

  // ✅ 每次打开对话框时，同步最新的 product 数据到表单
  useEffect(() => {
    if (open) syncFormFromProduct();
  }, [open, product]);

  // 预定义的分类选项
  const CATEGORY_OPTIONS = [
    { value: 'apparel', labelEn: 'Apparel', labelCn: '服装' },
    { value: 'stationery', labelEn: 'Stationery', labelCn: '文具' },
    { value: 'dailyUse', labelEn: 'Daily Use', labelCn: '日用品' },
    { value: 'gift', labelEn: 'Gift', labelCn: '礼品' },
    { value: 'sports', labelEn: 'Sports', labelCn: '运动' },
  ];

  const uploadFilesToStorage = async (files: FileList | File[]): Promise<string[]> => {
    const fileArr = Array.from(files);
    const compressImageToBlob = async (file: File): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const MAX_SIZE = 1000;
            let width = img.width;
            let height = img.height;
            if (width > height && width > MAX_SIZE) {
              height = (height * MAX_SIZE) / width;
              width = MAX_SIZE;
            } else if (height > MAX_SIZE) {
              width = (width * MAX_SIZE) / height;
              height = MAX_SIZE;
            }
            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Failed to create blob'));
            }, 'image/jpeg', 0.7);
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    const results = await Promise.all(fileArr.map(async (file) => {
      if (!file.type.startsWith('image/')) return null;
      try {
        const compressedBlob = await compressImageToBlob(file);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `products/${fileName}`;
        const { error } = await supabase.storage
          .from('make-c4f5ade4-images')
          .upload(filePath, compressedBlob, { contentType: 'image/jpeg', upsert: false });
        if (error) throw error;
        const { data: urlData, error: urlError } = await supabase.storage
          .from('make-c4f5ade4-images')
          .createSignedUrl(filePath, 31536000);
        if (urlError || !urlData) throw new Error('Failed to create signed URL');
        return urlData.signedUrl;
      } catch (err) {
        console.error('[ADMIN] Color/image upload failed:', file.name, err);
        toast.error(t(`Upload failed: ${file.name}`, `上传失败: ${file.name}`));
        return null;
      }
    }));
    return results.filter((url): url is string => url !== null);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 验证文件数量
    if (formData.images.length + files.length > 5) {
      toast.error(t('Maximum 5 images allowed', '最多上传5张图片'));
      return;
    }

    // ✅ 检查每个文件的原始大小，拒绝超过 15MB 的文件
    for (let i = 0; i < files.length; i++) {
      const fileSizeMB = files[i].size / (1024 * 1024);
      if (fileSizeMB > 15) {
        toast.error(language === 'en' 
          ? `File "${files[i].name}" is too large (${fileSizeMB.toFixed(1)}MB). Maximum 15MB.` 
          : `文件 "${files[i].name}" 过大 (${fileSizeMB.toFixed(1)}MB)，最大 15MB`);
        return;
      }
    }

    setIsUploadingImage(true);

    try {
      console.log('[ADMIN] 🎯 Using direct Supabase Storage upload');

      // 🚀 压缩图片为 Blob 的辅助函数
      const compressImageToBlob = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // 压缩：最大尺寸 1000px，质量 0.7
              const MAX_SIZE = 1000;
              let width = img.width;
              let height = img.height;
              
              if (width > height && width > MAX_SIZE) {
                height = (height * MAX_SIZE) / width;
                width = MAX_SIZE;
              } else if (height > MAX_SIZE) {
                width = (width * MAX_SIZE) / height;
                height = MAX_SIZE;
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);
              
              // 转换为 Blob（JPEG 格式，质量 0.7）
              canvas.toBlob((blob) => {
                if (blob) {
                  const sizeMB = blob.size / (1024 * 1024);
                  console.log(`[ADMIN] Compressed blob size: ${sizeMB.toFixed(2)}MB`);
                  resolve(blob);
                } else {
                  reject(new Error('Failed to create blob'));
                }
              }, 'image/jpeg', 0.7);
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      };

      // 🚀 并行上传所有图片到 Storage
      const uploadPromises = Array.from(files).map(async (file) => {
        // 验证文件类型
        if (!file.type.startsWith('image/')) {
        toast.error(t('Please select image files only', '请只选择图片文件'));
          return null;
        }

        try {
          console.log(`[ADMIN] 📤 Processing file: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
          
          // 压缩图片为 Blob
          const compressedBlob = await compressImageToBlob(file);
          console.log(`[ADMIN] ✅ Compressed to: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);
          
          // 生成唯一文件名
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(7);
          const fileName = `${timestamp}-${randomStr}.jpg`;
          const filePath = `products/${fileName}`;
          
          console.log(`[ADMIN] 🚀 Uploading ${fileName} to Storage...`);
          
          // 直接上传到 Supabase Storage
          const { data, error } = await supabase.storage
            .from('make-c4f5ade4-images')
            .upload(filePath, compressedBlob, {
              contentType: 'image/jpeg',
              upsert: false
            });
          
          if (error) {
            console.error('[ADMIN] ❌ Storage upload error:', error);
            throw error;
          }
          
          // 生成签名 URL（有效期 1 年）
          const { data: urlData, error: urlError } = await supabase.storage
            .from('make-c4f5ade4-images')
            .createSignedUrl(filePath, 31536000); // 365 天
          
          if (urlError || !urlData) {
            console.error('[ADMIN] ❌ Failed to create signed URL:', urlError);
            throw new Error('Failed to create signed URL');
          }
          
          console.log('[ADMIN] ✅ Image uploaded successfully:', urlData.signedUrl);
          return urlData.signedUrl;
        } catch (error) {
          console.error('[ADMIN] ❌ Error uploading file:', file.name);
          if (error instanceof Error) {
            console.error('[ADMIN] Error message:', error.message);
          } else {
            console.error('[ADMIN] Error:', error);
          }
          toast.error(t(`Upload failed: ${file.name}`, `上传失败: ${file.name}`));
          return null;
        }
      });

      // 等待所有上传完成
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);
      
      if (successfulUploads.length > 0) {
        setFormData(prev => ({ ...prev, images: [...prev.images, ...successfulUploads] }));
        toast.success(t(`${successfulUploads.length} image(s) uploaded`, `已上传 ${successfulUploads.length} 张图片`));
      }
      
      if (results.length > successfulUploads.length) {
        const failedCount = results.length - successfulUploads.length;
        toast.error(t(`${failedCount} image(s) failed to upload`, `${failedCount} 张图片上传失败`));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(t('Failed to upload images', '上传图片失败'));
    } finally {
      setIsUploadingImage(false);
      // 清空 input，允许重复选择同一文件
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_: any, i: number) => i !== index)
    }));
    toast.success(t('Image removed', '图片已移除'));
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...formData.images];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newImages.length) return;
    
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSubmit = async () => {
    if (!user || !session) {
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      return;
    }

    // 验证必填字段
    if (!formData.nameEn || !formData.nameCn) {
      toast.error(t('Please fill in product name (both languages)', '请填写商品名称（双语）'));
      return;
    }

    if (!formData.category) {
      toast.error(t('Please select a category', '请选择分类'));
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error(t('Please enter a valid price', '请输入有效价格'));
      return;
    }

    let primaryImages = formData.images;
    let colorImages: Record<string, string[]> | undefined;
    let colorLabels: Record<string, { en: string; cn: string }> | undefined;
    let colorOptions: Record<string, number> | undefined;

    if (isColorVariant) {
      const validVariants = colorVariants.filter((v) => v.key && v.images.length > 0);
      if (validVariants.length === 0) {
        toast.error(t('Please configure at least one color with images', '请至少配置一种带图片的颜色'));
        return;
      }
      colorImages = {};
      colorLabels = {};
      colorOptions = {};
      validVariants.forEach((v) => {
        colorImages![v.key] = v.images;
        colorLabels![v.key] = { en: v.labelEn || v.key, cn: v.labelCn || v.key };
        colorOptions![v.key] = Math.max(0, Math.round(Number(v.stock) || 0));
      });
      primaryImages = validVariants[0].images;
    } else if (formData.images.length === 0) {
      toast.error(t('Please upload at least one image', '请至少上传一张图片'));
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('[ADMIN] Getting fresh session for product update...');
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[ADMIN] Session error:', sessionError);
        toast.error(t('Session expired', '会话过期'));
        return;
      }

      console.log(`[ADMIN] Updating product ${product.id}...`);
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      
      // 处理标签数组：始终保留 category 作为 tag，确保分类页能正确过滤
      const specialTags = formData.tag === 'none' ? [] : [formData.tag];
      const categoryTagSet = new Set([formData.category, ...specialTags].filter(Boolean));
      const tags = [...categoryTagSet];

      const response = await fetch(`${API_BASE}/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          name: {
            en: formData.nameEn,
            cn: formData.nameCn,
          },
          category: formData.category,
          description: {
            en: formData.descriptionEn,
            cn: formData.descriptionCn,
          },
          price: parseFloat(formData.price),
          images: primaryImages,
          tags: tags,
          ...(isColorVariant
            ? { colorImages, colorLabels, options: colorOptions }
            : product.colorImages
              ? { colorImages: {}, colorLabels: {} } // 显式关闭颜色变体
              : {}),
          _auth_token: freshSession.access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ADMIN] Failed to update product:', response.status, errorData);
        toast.error(errorData.error || t('Failed to update product', '更新商品失败'));
        return;
      }

      const data = await response.json();
      const raw = data.product;
      const merged: Product | undefined = raw
        ? {
            ...raw,
            price:
              typeof raw.price === 'string' ? parseFloat(raw.price) : Number(raw.price),
          }
        : undefined;
      console.log('[ADMIN] Product updated successfully:', merged);

      toast.success(t('Product updated successfully', '商品更新成功'));

      setOpen(false);

      if (merged) {
        onProductUpdated(merged);
        updateProductInCache(merged as any);
      }

      clearProductsCache();
    } catch (error) {
      toast.error(t('Error updating product', '更新商品错误'));
      console.error('[ADMIN] Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-1" />
          {t('Edit', '编辑')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t('Edit Product', '编辑商品')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t('Update product information and images', '更新商品信息和图片')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* 颜色变体开关 */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              id="edit-color-variant"
              checked={isColorVariant}
              onChange={(e) => setIsColorVariant(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="edit-color-variant" className="text-sm font-medium cursor-pointer">
              {t(
                'Color variants (different colors use different images)',
                '颜色变体（不同颜色对应不同图片）'
              )}
            </label>
          </div>

          {/* 颜色变体图片管理 */}
          {isColorVariant ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {t('Color Variants', '颜色变体')}
                </Label>
                <button
                  type="button"
                  onClick={() =>
                    setColorVariants((prev) => [
                      ...prev,
                      { key: '', labelEn: '', labelCn: '', images: [], stock: 0 },
                    ])
                  }
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {t('Add color', '添加颜色')}
                </button>
              </div>
              {colorVariants.map((variant, variantIdx) => (
                <div key={variantIdx} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                      <Input
                        placeholder="Key (e.g. Blue)"
                        value={variant.key}
                        onChange={(e) =>
                          setColorVariants((prev) =>
                            prev.map((v, i) =>
                              i === variantIdx ? { ...v, key: e.target.value } : v
                            )
                          )
                        }
                        className="text-xs"
                      />
                      <Input
                        placeholder="EN"
                        value={variant.labelEn}
                        onChange={(e) =>
                          setColorVariants((prev) =>
                            prev.map((v, i) =>
                              i === variantIdx ? { ...v, labelEn: e.target.value } : v
                            )
                          )
                        }
                        className="text-xs"
                      />
                      <Input
                        placeholder="中文"
                        value={variant.labelCn}
                        onChange={(e) =>
                          setColorVariants((prev) =>
                            prev.map((v, i) =>
                              i === variantIdx ? { ...v, labelCn: e.target.value } : v
                            )
                          )
                        }
                        className="text-xs"
                      />
                      <Input
                        type="number"
                        min={0}
                        placeholder={t('Stock', '库存')}
                        value={variant.stock}
                        onChange={(e) =>
                          setColorVariants((prev) =>
                            prev.map((v, i) =>
                              i === variantIdx
                                ? { ...v, stock: parseInt(e.target.value || '0', 10) || 0 }
                                : v
                            )
                          )
                        }
                        className="text-xs"
                      />
                    </div>
                    {colorVariants.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setColorVariants((prev) => prev.filter((_, i) => i !== variantIdx))
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {variant.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {variant.images.map((img, imgIdx) => (
                        <div key={imgIdx} className="relative group">
                          <ImageWithFallback
                            src={img}
                            alt={`${variant.key}-${imgIdx}`}
                            className="w-full h-20 object-cover rounded border bg-black"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setColorVariants((prev) =>
                                prev.map((v, i) =>
                                  i === variantIdx
                                    ? { ...v, images: v.images.filter((_, j) => j !== imgIdx) }
                                    : v
                                )
                              )
                            }
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded cursor-pointer hover:border-blue-400 bg-white text-xs text-gray-600">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files?.length) return;
                        setIsUploadingImage(true);
                        try {
                          const urls = await uploadFilesToStorage(files);
                          if (urls.length) {
                            setColorVariants((prev) =>
                              prev.map((v, i) =>
                                i === variantIdx ? { ...v, images: [...v.images, ...urls] } : v
                              )
                            );
                            toast.success(
                              t(`Uploaded ${urls.length} image(s)`, `已上传 ${urls.length} 张图片`)
                            );
                          }
                        } finally {
                          setIsUploadingImage(false);
                          e.target.value = '';
                        }
                      }}
                    />
                    <Upload className="w-4 h-4" />
                    {t('Upload color images', '上传该颜色图片')}
                  </label>
                </div>
              ))}
            </div>
          ) : (
          /* 普通商品图片管理区域 */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {t('Product Images', '商品图片')}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({t('First image is the cover', '第一张为封面')})
                </span>
              </Label>
              <span className="text-sm text-muted-foreground">
                {formData.images.length}/5
              </span>
            </div>
            
            {/* 图片预览网格 */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-5 gap-3">
                {formData.images.map((img: string, index: number) => (
                  <div key={index} className="relative group">
                    <div className={`relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 ${
                      index === 0 ? 'border-blue-500' : 'border-gray-200'
                    }`}>
                      <ImageWithFallback 
                        src={img} 
                        alt={`Product ${index + 1}`} 
                        className="w-full h-full object-cover" 
                      />
                      {index === 0 && (
                        <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                          {t('Cover', '封面')}
                        </div>
                      )}
                      {/* 操作按钮 */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => moveImage(index, 'up')}
                            className="p-1.5 bg-white rounded-full hover:bg-gray-100 transition-colors"
                            title={t('Move left', '左移')}
                          >
                            <ArrowUpDown className="w-3 h-3 rotate-90" />
                          </button>
                        )}
                        {index < formData.images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveImage(index, 'down')}
                            className="p-1.5 bg-white rounded-full hover:bg-gray-100 transition-colors"
                            title={t('Move right', '右移')}
                          >
                            <ArrowUpDown className="w-3 h-3 -rotate-90" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          title={t('Remove', '移除')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      {index + 1}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {/* 上传按钮 */}
            {formData.images.length < 5 && (
              <div>
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">
                        {t('Uploading...', '上传中...')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {t('Click to upload images', '点击上传图片')}
                      </span>
                    </>
                  )}
                </label>
                <p className="text-xs text-muted-foreground mt-1.5 text-center">
                  {t('Up to 5 images supported', '最多支持 5 张图片')}
                </p>
              </div>
            )}
          </div>
          )}

          {/* 商品名称 */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <Label className="text-base font-semibold">
              {t('Product Name', '商品名称')}
            </Label>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nameEn" className="text-sm text-muted-foreground">
                  {t('English', '英文')}
                </Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
                  placeholder={t('e.g., Coca Cola', '例如：Coca Cola')}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameCn" className="text-sm text-muted-foreground">
                  {t('Chinese', '中文')}
                </Label>
                <Input
                  id="nameCn"
                  value={formData.nameCn}
                  onChange={(e) => setFormData(prev => ({ ...prev, nameCn: e.target.value }))}
                  placeholder={t('e.g., 可口可乐', '例如：可口可乐')}
                  className="text-base"
                />
              </div>
            </div>
          </div>

          {/* 商品分类 */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <Label className="text-base font-semibold">
              {t('Category', '商品分类')}
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder={t('Select category', '选择分类')} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {language === 'en' ? cat.labelEn : cat.labelCn} ({cat.value})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 商品说明 */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <Label className="text-base font-semibold">
              {t('Description', '商品说明')}
            </Label>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label htmlFor="descriptionEn" className="text-sm text-muted-foreground">
                  {t('English', '英文')}
                </Label>
                <textarea
                  id="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                  placeholder={t('Product description in English', '商品说明（英文）')}
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md text-base resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionCn" className="text-sm text-muted-foreground">
                  {t('Chinese', '中文')}
                </Label>
                <textarea
                  id="descriptionCn"
                  value={formData.descriptionCn}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionCn: e.target.value }))}
                  placeholder={t('Product description in Chinese', '商品说明（中文）')}
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md text-base resize-none"
                />
              </div>
            </div>
          </div>

          {/* 价格 */}
          <div className="space-y-2">
            <Label htmlFor="price" className="text-base font-semibold">
              {t('Price (CNY)', '价格（元）')}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">¥</span>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.00"
                className="text-base pl-8"
              />
            </div>
          </div>

          {/* 商品标签 */}
          <div className="space-y-2">
            <Label htmlFor="tag" className="text-base font-semibold">
              {t('Product Tag', '商品标签')}
            </Label>
            <Select 
              value={formData.tag} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, tag: value }))}
            >
              <SelectTrigger className="text-base">
                <SelectValue placeholder={t('Select a tag', '选择标签')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t('No Tag', '无标签')}
                </SelectItem>
                <SelectItem value="new">
                  <span className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-500">
                      {t('NEW', '新品')}
                    </Badge>
                  </span>
                </SelectItem>
                <SelectItem value="hot">
                  <span className="flex items-center gap-2">
                    <Badge variant="default" className="bg-red-500">
                      {t('HOT', '热门')}
                    </Badge>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('Add a special tag to highlight this product', '为商品添加特殊标签以突出显示')}
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('Cancel', '取消')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('Update Product', '更新商品')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminChatView() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const { session } = useProfile();
  const { t } = useLanguage();

  const fetchSessions = async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/chat/sessions?_auth_token=${encodeURIComponent(session.access_token)}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // Refresh list every 10s
    return () => clearInterval(interval);
  }, [session?.access_token]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
      <Card className="lg:col-span-1 flex flex-col h-full">
        <CardHeader className="py-4">
          <CardTitle className="text-lg">{t('Conversations', '会话列表')}</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSessions} className="w-full mt-2">
            <RefreshCw className="w-3 h-3 mr-2" />
            {t('Refresh', '刷新')}
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2">
          {loading && sessions.length === 0 ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-gray-500 py-4">{t('No conversations', '暂无会话')}</div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <div 
                  key={s.customerId}
                  className={`p-3 rounded-lg cursor-pointer border hover:bg-gray-50 transition-colors ${selectedCustomerId === s.customerId ? 'bg-primary/5 border-primary' : 'bg-white'}`}
                  onClick={() => {
                    setSelectedCustomerId(s.customerId);
                    setSelectedCustomerName(s.customerName);
                  }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium truncate">{s.customerName}</span>
                    {s.unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{s.unreadCount}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{s.lastMessage}</p>
                  <p className="text-[10px] text-gray-400 mt-1 text-right">
                    {new Date(s.lastTimestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="lg:col-span-2 h-full">
        {selectedCustomerId ? (
          <ChatInterface 
            customerId={selectedCustomerId} 
            customerName={selectedCustomerName}
            isAdminView={true} 
            className="h-full"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-gray-50 border rounded-lg text-gray-500 p-8 text-center">
            <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
            <p>{t('Select a conversation to start chatting', '选择一个会话开始聊天')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [refreshingUrls, setRefreshingUrls] = useState(false);
  const [ensuringSeeds, setEnsuringSeeds] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const { language } = useLanguage();
  const { isStocked } = useInventory();
  const { user, session, isAdmin } = useProfile();
  
  // 翻译函数
  const t = (en: string, cn: string) => language === 'en' ? en : cn;
  
  // 商品排序状态
  type ProductSortField = 'name' | 'category' | 'price' | 'none';
  type SortDirection = 'asc' | 'desc';
  const [productSortField, setProductSortField] = useState<ProductSortField>('none');
  const [productSortDirection, setProductSortDirection] = useState<SortDirection>('asc');

  // 线下订单对话框状态
  const [offlineOrderDialogOpen, setOfflineOrderDialogOpen] = useState(false);
  const [editingStockProduct, setEditingStockProduct] = useState<Product | null>(null);
  const [offlineOrderForm, setOfflineOrderForm] = useState({
    productId: null as number | null,
    selectedProduct: null as Product | null,
    option: '', // 型号/尺码
    quantity: '1', // 改为字符串，支持空值
    unitPrice: 0, // 单价
    totalAmount: 0 // 总价
  });
  const [submittingOfflineOrder, setSubmittingOfflineOrder] = useState(false);

  // 用于检测订单状态变��的引用
  const previousOrdersRef = useRef<Order[]>([]);
  
  // 防止无限循环：追踪是否已经尝试过自动刷新 blob URL
  const hasAttemptedAutoRefresh = useRef(false);

  /**
   * 加载商品列表（从后端 KV Store 加载）
   */
  useEffect(() => {
    loadProducts();
  }, []);

  /**
   * 从后端 API 加载所有商品
   */
  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setProductsError(null);
      
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      console.log('[ADMIN] Fetching all products from API...');
      
      // ✅ 增加重试机制，处理服务器冷启动
      let response: Response | null = null;
      let lastFetchError: Error | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetch(`${API_BASE}/products`, {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          });
          break;
        } catch (fetchError) {
          lastFetchError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
          console.warn(`[ADMIN] Fetch products attempt ${attempt}/3 failed:`, lastFetchError.message);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      }
      
      if (!response) {
        throw lastFetchError || new Error('Failed to fetch products after retries');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[ADMIN] Products loaded:', data.products.length);
      
      // ✅ 合并本地图片数据并过滤无效的 blob URL；服饰仅有 Default 时拆尺码
      const productsWithImages = data.products.map((product: Product) => {
        const hasBlobUrls = product.images?.some(url => url.startsWith('blob:'));

        if (hasBlobUrls) {
          const localImages = getProductImages(product.id);
          return finalizeProduct({
            ...product,
            images: localImages.length > 0 ? localImages : [],
          });
        }

        const validImages = product.images?.filter((url: string) => {
          if (typeof url !== 'string') return false;
          const isValid = url.startsWith('http') || url.startsWith('data:') || url.startsWith('/') || url.startsWith('figma:');
          if (!isValid && url) {
            console.warn(`[ADMIN] Filtered invalid URL from product ${product.id}: ${url.substring(0, 50)}...`);
          }
          return isValid;
        }) || [];

        if (validImages.length > 0) {
          return finalizeProduct({
            ...product,
            images: validImages,
          });
        }

        const localImages = getProductImages(product.id);
        if (localImages.length > 0) {
          console.log(`[ADMIN] Using local Figma assets for product ${product.id}`);
        }
        return finalizeProduct({
          ...product,
          images: localImages,
        });
      });
      
      setDisplayProducts(productsWithImages);
      setProductsError(null);
      
      // ✅ 检测是否有商品包含 blob URL，并提示管理员清理
      const productsWithBlobUrls = data.products.filter((product: Product) => 
        product.images?.some(url => url.startsWith('blob:'))
      );
      
      if (productsWithBlobUrls.length > 0 && !hasAttemptedAutoRefresh.current) {
        hasAttemptedAutoRefresh.current = true;
        // 静默处理 - 服务器会自动清理，管理员可以使用"Fix Blob URLs"按钮手动清理
        /*
        toast.info(
          t(
            `${productsWithBlobUrls.length} products have invalid image URLs in the database. Click "Refresh Image URLs" below to clean them up.`,
            `数据库中有 ${productsWithBlobUrls.length} 个商品的��片 URL 无效。点击下方的"刷新图片 URL"按钮来清理它们。`
          ),
          { duration: 8000 }
        );
        */
      }
    } catch (error) {
      console.error('[ADMIN] Failed to load products:', error);
      setProductsError(error instanceof Error ? error.message : 'Failed to load products / 加载商品失败');
      setDisplayProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  /**
   * 加载所有用户的订单（从后端 API）
   */
  useEffect(() => {
    if (user && session) {
      loadAllOrders();
    }
  }, [user, session]);

  /**
   * 自动轮询订单状态（用于实时接收顾客取消订单等更新）
   * ✅ 优化：增加轮询间隔到 15 秒，减少服务器压力
   */
  useEffect(() => {
    if (!user || !session) {
      return;
    }

    console.log('[ADMIN] Starting order polling...');
    
    // 设置定时轮询（每 15 秒）
    const pollInterval = setInterval(() => {
      console.log('[ADMIN] Polling for order updates...');
      loadAllOrders(true); // 使用静默模式，避免界面闪烁
    }, 15000); // ✅ 15 秒轮询一次（从 5 秒优化）

    // 清理定时器
    return () => {
      console.log('[ADMIN] Stopping order polling...');
      clearInterval(pollInterval);
    };
  }, [user, session]);

  /**
   * 从后端 API 加载所有订单（管理员功能）
   * @param silent - 是否静默加载（轮询时不显示加载状态，避免闪烁）
   */
  const loadAllOrders = async (silent: boolean = false) => {
    if (!user || !session) {
      console.log('[ADMIN] Cannot load orders - no user or session');
      setLoadingOrders(false);
      return;
    }

    try {
      // 非静默模式才显示加载状态
      if (!silent) {
        setLoadingOrders(true);
        setOrdersError(null);
      }
      
      console.log('[ADMIN] Getting fresh session...');
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[ADMIN] Session error:', sessionError);
        setOrdersError('Session expired, please log in again / 会话过期，请重新登录');
        setAllOrders([]);
        return;
      }
      
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      console.log('[ADMIN] Fetching all orders from API...');
      
      // 使用 anon key 通过网关，token 通过查询参数传递
      const url = `${API_BASE}/admin/orders?_auth_token=${encodeURIComponent(freshSession.access_token)}`;
      
      // ✅ 增加重试机制，处理服务器冷启动导致的 Failed to fetch
      let response: Response | null = null;
      let lastError: Error | null = null;
      const MAX_RETRIES = 3;
      
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          });
          break;
        } catch (fetchError) {
          lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
          console.warn(`[ADMIN] Fetch orders attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      }
      
      if (!response) {
        throw lastError || new Error('Failed to fetch orders after retries');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ADMIN] Failed to fetch orders:', response.status, errorData);
        
        if (response.status === 401) {
          setOrdersError('Session expired, please log in again / 会话过期，请重新登录');
        } else if (response.status === 403) {
          setOrdersError('Forbidden: Admin access required / 需要管理员权限');
        } else {
          setOrdersError(errorData.error || 'Failed to load orders / 加载订单失败');
        }
        setAllOrders([]);
        return;
      }

      const data = await response.json();
      const fetchedOrders = data.orders || [];
      
      // 按创建时间降序排序
      fetchedOrders.sort((a: Order, b: Order) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // 🔔 检测订单状态变化（仅在静默轮询时）
      if (silent && previousOrdersRef.current.length > 0) {
        const cancelledOrders = fetchedOrders.filter((newOrder: Order) => {
          const oldOrder = previousOrdersRef.current.find(o => o.id === newOrder.id);
          // 检测到订单状态从非 cancelled 变为 cancelled
          return oldOrder && oldOrder.status !== 'cancelled' && newOrder.status === 'cancelled';
        });

        // 如��有订单被取消，显示通知
        if (cancelledOrders.length > 0) {
          cancelledOrders.forEach((order: Order) => {
            const orderNum = order.orderNumber || order.id.substring(0, 8);
            toast.info(
              t(
                `Order #${orderNum} has been cancelled by customer`,
                `订单 #${orderNum} 已被顾客取消`
              ),
              {
                duration: 5000,
              }
            );
          });
          console.log('[ADMIN] Detected cancelled orders:', cancelledOrders.length);
        }
      }

      // 更新订单列表和引用
      setAllOrders(fetchedOrders);
      previousOrdersRef.current = fetchedOrders;
      console.log('[ADMIN] Loaded all orders from API:', fetchedOrders.length);
    } catch (error) {
      console.error('[ADMIN] Failed to load orders:', error);
      setOrdersError(error instanceof Error ? error.message : 'Failed to load orders / 加载订单失败');
      setAllOrders([]);
    } finally {
      // 非静默模式才更新加载状态
      if (!silent) {
        setLoadingOrders(false);
      }
    }
  };

  /**
   * 标记订单为已完成（调用后端 API）
   */
  const markOrderAsCompleted = async (orderId: string) => {
    if (!user || !session) {
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      return;
    }

    try {
      // 先更新本地状态（乐观更新）
      const order = allOrders.find(o => o.id === orderId);
      const newCompletedStatus = !order?.completed;
      
      setAllOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, completed: newCompletedStatus }
            : order
        )
      );

      // 获取最新 session
      console.log('[ADMIN] Getting fresh session for order update...');
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[ADMIN] Session error:', sessionError);
        toast.error(t('Session expired', '会话过期'));
        // 回滚本地状态
        setAllOrders(prev => 
          prev.map(order => 
            order.id === orderId 
              ? { ...order, completed: !newCompletedStatus }
              : order
          )
        );
        return;
      }

      // 调用后端 API 更新订单状态
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/admin/orders`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          orderId,
          status: newCompletedStatus ? 'completed' : 'pending',
          _auth_token: freshSession.access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ADMIN] Failed to update order status:', response.status, errorData);
        
        // 回滚本地状态
        setAllOrders(prev => 
          prev.map(order => 
            order.id === orderId 
              ? { ...order, completed: !newCompletedStatus }
              : order
          )
        );
        
        toast.error(errorData.error || t('Failed to update order status', '更新订单状态失败'));
        return;
      }

      toast.success(t('Order status updated', '订单状态已更新'));
    } catch (error) {
      console.error('[ADMIN] Error updating order status:', error);
      toast.error(t('Error updating order status', '更新订单状态错误'));
      
      // 重新加载订单以确保数据一致性
      loadAllOrders();
    }
  };

  /**
   * 切换商品上下架 / 库存展示状态（与后端 available 同步，并即时更新本表）
   */
  const toggleProductStock = async (productId: number) => {
    if (!user || !session) {
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      return;
    }

    const currentProduct = displayProducts.find(p => p.id === productId);
    if (!currentProduct) return;

    const currentStockStatus =
      currentProduct.available !== undefined && currentProduct.available !== null
        ? currentProduct.available
        : isStocked(productId);
    const newStockStatus = !currentStockStatus;

    setDisplayProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, available: newStockStatus } : p))
    );

    try {
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !freshSession?.access_token) {
        toast.error(t('Session expired — please log in again', '会话已过期，请重新登录'));
        setDisplayProducts(prev =>
          prev.map(p => (p.id === productId ? { ...p, available: currentStockStatus } : p))
        );
        return;
      }

      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/admin/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          available: newStockStatus,
          _auth_token: freshSession.access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ADMIN] Failed to update stock status:', response.status, errorData);
        toast.error(t('Failed to sync with server — reverted', '同步服务器失败，已恢复'));
        setDisplayProducts(prev =>
          prev.map(p => (p.id === productId ? { ...p, available: currentStockStatus } : p))
        );
        return;
      }

      const data = await response.json();

      if (data.product) {
        const normalized: Product = {
          ...data.product,
          price:
            typeof data.product.price === 'string'
              ? parseFloat(data.product.price)
              : Number(data.product.price),
        };
        updateProductInCache(normalized);
        setDisplayProducts(prev =>
          prev.map(p => (p.id === productId ? { ...normalized, images: p.images?.length ? normalized.images : p.images } : p))
        );
      }

      clearProductsCache();
      toast.success(
        newStockStatus
          ? t('Product is now listed', '商品已上架')
          : t('Product is now delisted', '商品已下架')
      );
    } catch (error) {
      console.error('[ADMIN] Error updating stock status:', error);
      toast.error(t('Network error — reverted', '网络错误，已恢复'));
      setDisplayProducts(prev =>
        prev.map(p => (p.id === productId ? { ...p, available: currentStockStatus } : p))
      );
    }
  };

  /**
   * 添加新商品（实时添加，无需重新加载）
   */
  const addProduct = (newProduct: Product) => {
    console.log('[ADMIN] Adding new product to local state:', newProduct.id);
    setDisplayProducts(prev => [...prev, newProduct]);
  };

  /**
   * 更新商品列表（实时更新单个商品，无需重新加载）
   * ✅ 添加图片保护：如果更新后的产品没有图片但原产品有图片，保留原图片
   */
  const updateProduct = (updatedProduct: Product) => {
    const normalized: Product = {
      ...updatedProduct,
      price:
        typeof updatedProduct.price === 'string'
          ? parseFloat(updatedProduct.price)
          : Number(updatedProduct.price),
    };
    console.log('[ADMIN] Updating product in local state:', normalized.id);
    setDisplayProducts(prev =>
      prev.map(p => {
        if (p.id === normalized.id) {
          let finalImages = normalized.images || [];
          const validImages = finalImages.filter((url: string) => {
            if (typeof url !== 'string') return false;
            return url.startsWith('http') || url.startsWith('data:') || url.startsWith('/') || url.startsWith('figma:');
          });

          if (validImages.length === 0) {
            if (p.images && p.images.length > 0) {
              console.log('[ADMIN] Preserving original images for product', p.id);
              finalImages = p.images;
            } else {
              finalImages = getProductImages(p.id);
            }
          } else {
            finalImages = validImages;
          }

          return { ...normalized, images: finalImages };
        }
        return p;
      })
    );
  };

  /**
   * 刷新商品列表（重新加载从后端获取的商品）
   */
  const refreshProducts = () => {
    loadProducts();
  };

  /**
   * 刷新所有商品的图片 URL（内部函数，无 UI 反馈）
   * ✅ 修复所有包含 blob: 前缀的无效图片 URL
   */
  const refreshImageUrls = async () => {
    try {
      console.log('[ADMIN] 🔧 Fixing blob URLs in all products...');
      
      // 获取 fresh session 用于认证
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[ADMIN] Session error:', sessionError);
        throw new Error('Session expired');
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4/admin/products/fix-blob-urls`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            _auth_token: freshSession.access_token
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fix blob URLs');
      }

      const data = await response.json();
      console.log('[ADMIN] ✅ Blob URLs fixed:', data);
      
      // 清除缓存并重新加载商品
      clearProductsCache();
      await loadProducts();
      
      return data;
    } catch (error) {
      console.error('[ADMIN] ❌ Error fixing blob URLs:', error);
      throw error;
    }
  };

  /**
   * 刷新所有商品的图片 URL（带 UI 反馈）
   * ✅ 修复无效的 blob URLs
   */
  const handleRefreshImageUrls = async () => {
    if (refreshingUrls) return;
    
    setRefreshingUrls(true);
    try {
      const data = await refreshImageUrls();
      
      if (data.fixedCount > 0) {
        toast.success(
          t(
            `Fixed ${data.fixedCount} product(s) with invalid image URLs`,
            `修复了 ${data.fixedCount} 个商品的无效图片 URL`
          )
        );
      } else {
        toast.success(
          t(
            'All product images are valid',
            '所有商品图片都有效'
          )
        );
      }
    } catch (error) {
      toast.error(
        t(
          'Failed to fix image URLs',
          '修复图片 URL 失败'
        )
      );
    } finally {
      setRefreshingUrls(false);
    }
  };

  /** 将缺失的新种子商品（如棒球帽）写入全站 KV，不覆盖已有商品 */
  const handleEnsureSeedProducts = async () => {
    if (ensuringSeeds) return;
    if (!user || !session) {
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      return;
    }

    setEnsuringSeeds(true);
    try {
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !freshSession?.access_token) {
        toast.error(t('Session expired', '会话过期'));
        return;
      }

      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/admin/products/ensure-seeds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ _auth_token: freshSession.access_token }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.ensured > 0) {
        toast.success(
          t(
            `Synced ${data.ensured} seed product(s): ${(data.ids || []).join(', ')}`,
            `已同步 ${data.ensured} 个种子商品：${(data.ids || []).join(', ')}`
          )
        );
      } else {
        toast.success(t('Seed products already up to date', '种子商品已是最新'));
      }

      clearProductsCache();
      window.dispatchEvent(new Event('products-force-refresh'));
      await refreshProducts();
    } catch (error) {
      console.error('[ADMIN] ensure-seeds failed:', error);
      toast.error(
        t(
          'Failed to sync seed products (deploy edge function if endpoint missing)',
          '同步种子商品失败（若接口不存在请先部署边缘函数）'
        )
      );
    } finally {
      setEnsuringSeeds(false);
    }
  };

  /**
   * 清空所有订单记录（管理员面板独立功能，不影响用户端）
   */
  const clearCompletedOrders = async () => {
    if (!user || !session) {
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      return;
    }

    // 统计所有订单数量
    const totalCount = allOrders.length;
    
    if (totalCount === 0) {
      toast.info(t('No orders to clear', '没有订单可清空'));
      return;
    }

    // 确认删除
    const confirmMessage = language === 'en' 
      ? `Are you sure you want to delete all ${totalCount} order(s)? This will only clear admin panel records and will not affect user orders. This action cannot be undone.`
      : `确定要删除全部 ${totalCount} 个订单记录吗？这只会清空管理员面板的记录，不会影响用户端的订单。此操作无法撤销。`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      console.log('[ADMIN] Clearing all orders from admin panel...');
      
      // 乐观更新：立即清空本地状态
      const previousOrders = [...allOrders];
      
      setAllOrders([]);
      
      // 获取最新 session
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[ADMIN] Session error:', sessionError);
        toast.error(t('Session expired', '会话过期'));
        // 回滚本地状态
        setAllOrders(previousOrders);
        return;
      }

      // 调用后端 API 清空所有订单（仅管理员面板）
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/admin/orders/all`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          _auth_token: freshSession.access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ADMIN] Failed to clear all orders:', response.status, errorData);
        toast.error(errorData.error || 'Failed to clear orders / 清空记录失败');
        // 回滚本地状态
        setAllOrders(previousOrders);
        return;
      }

      const data = await response.json();
      console.log('[ADMIN] All orders cleared from admin panel:', data.deletedCount);

      toast.success(t(
        `Successfully deleted ${data.deletedCount} order record(s) from admin panel`,
        `成功从管理员���板删除 ${data.deletedCount} 个订单记录`
      ));
      
      // 不需要重新加载，因为已经乐观更新了
    } catch (error) {
      console.error('[ADMIN] Error clearing orders:', error);
      toast.error(t('Error clearing order records', '清空记录错误'));
      // 出错时重新加载以确保数据一致性
      loadAllOrders();
    }
  };

  /**
   * 处理商品选择变化
   */
  const handleProductSelect = (productId: number) => {
    const product = displayProducts.find(p => p.id === productId);
    if (!product) return;

    // 获取当前数量（如果为空则默认为 1）
    const currentQty = offlineOrderForm.quantity === '' ? 1 : parseInt(offlineOrderForm.quantity) || 1;

    // 重置选项和价格
    setOfflineOrderForm(prev => ({
      ...prev,
      productId,
      selectedProduct: product,
      option: '', // 重置选项
      unitPrice: product.price,
      totalAmount: product.price * currentQty
    }));
  };

  /**
   * 处理选项（尺码）变化
   */
  const handleOptionSelect = (option: string) => {
    const product = offlineOrderForm.selectedProduct;
    if (!product) return;

    // 如果有选项特定价格，使用它；否则使用基础价格
    const optionPrice = product.options?.[option] || product.price;
    
    // 获取当前数量（如果为空则默认为 1）
    const currentQty = offlineOrderForm.quantity === '' ? 1 : parseInt(offlineOrderForm.quantity) || 1;
    
    setOfflineOrderForm(prev => ({
      ...prev,
      option,
      unitPrice: optionPrice,
      totalAmount: optionPrice * currentQty
    }));
  };

  /**
   * 处理数量变化
   */
  const handleQuantityChange = (value: string) => {
    // 允许空值
    if (value === '') {
      setOfflineOrderForm(prev => ({
        ...prev,
        quantity: '',
        totalAmount: 0
      }));
      return;
    }

    // 解析数量
    const quantity = parseInt(value);
    if (isNaN(quantity) || quantity < 0) {
      return; // 忽略无效输入
    }

    setOfflineOrderForm(prev => ({
      ...prev,
      quantity: value,
      totalAmount: prev.unitPrice * quantity
    }));
  };

  /**
   * 提交线下订单
   */
  const submitOfflineOrder = async () => {
    if (!user || !session) {
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      return;
    }

    // 验证表单
    if (!offlineOrderForm.selectedProduct) {
      toast.error(t('Please select a product', '请选择商品'));
      return;
    }
    
    // 验证数量（不能为空且必须大于 0）
    const quantity = parseInt(offlineOrderForm.quantity);
    if (!offlineOrderForm.quantity || isNaN(quantity) || quantity <= 0) {
      toast.error(t('Please enter valid quantity', '请输入有效数量'));
      return;
    }
    
    // 如果商品有选项（如尺码）���必须选择
    if (offlineOrderForm.selectedProduct.options && Object.keys(offlineOrderForm.selectedProduct.options).length > 0 && !offlineOrderForm.option) {
      toast.error(t('Please select size/option', '请选择尺码/规格'));
      return;
    }

    setSubmittingOfflineOrder(true);

    try {
      console.log('[ADMIN] Submitting offline order...');
      
      // 获取最新 session
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[ADMIN] Session error:', sessionError);
        toast.error(t('Session expired', '会话过期'));
        return;
      }

      const productName = language === 'en' 
        ? offlineOrderForm.selectedProduct.name.en 
        : offlineOrderForm.selectedProduct.name.cn;

      // 调用后端 API 创建线下订单
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/admin/orders/offline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          _auth_token: freshSession.access_token,
          productId: offlineOrderForm.productId,
          productName: productName,
          option: offlineOrderForm.option || undefined,
          quantity: quantity, // 使用验证后的数量值
          unitPrice: offlineOrderForm.unitPrice,
          amount: offlineOrderForm.totalAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ADMIN] Failed to create offline order:', response.status, errorData);
        toast.error(errorData.error || t('Failed to create offline reservation', '创建线下预定失败'));
        return;
      }

      const data = await response.json();
      console.log('[ADMIN] Offline order created:', data);

      toast.success(t(
        `Offline reservation #${data.orderNumber} created successfully`,
        `线下预定 #${data.orderNumber} 创建成功`
      ));

      // 关闭对话框并重置表单
      setOfflineOrderDialogOpen(false);
      setOfflineOrderForm({
        productId: null,
        selectedProduct: null,
        option: '',
        quantity: '1', // 重置为字符串 '1'
        unitPrice: 0,
        totalAmount: 0
      });

      // 刷新订单列表
      loadAllOrders();
    } catch (error) {
      console.error('[ADMIN] Error creating offline order:', error);
      toast.error(t('Error creating offline reservation', '创建线下预定错误'));
    } finally {
      setSubmittingOfflineOrder(false);
    }
  };

  /**
   * 删除商品
   */
  const deleteProduct = async (product: Product) => {
    console.log('[ADMIN] Delete button clicked for product:', product.id);
    
    if (!user || !session) {
      console.error('[ADMIN] No user or session');
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      return;
    }

    // 确认删除
    const productName = language === 'en' ? product.name.en : product.name.cn;
    const confirmMessage = language === 'en' 
      ? `Are you sure you want to delete "${productName}"? This action cannot be undone.`
      : `确定要删除「${productName}」吗？此操作无法撤销。`;
    
    console.log('[ADMIN] Showing confirmation dialog...');
    if (!confirm(confirmMessage)) {
      console.log('[ADMIN] User cancelled deletion');
      return;
    }

    try {
      console.log('[ADMIN] Getting fresh session for product deletion...');
      
      // 乐观更新：立即从本地状态移除商品
      const previousProducts = [...displayProducts];
      setDisplayProducts(prev => prev.filter(p => p.id !== product.id));
      
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        console.error('[ADMIN] Session error:', sessionError);
        toast.error(t('Session expired', '会话过期'));
        // 回滚本地状态
        setDisplayProducts(previousProducts);
        return;
      }

      console.log(`[ADMIN] Deleting product ${product.id}...`);
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      
      // 使用查询参数传递 token（与 PATCH 路由保持一致的认证方式）
      const response = await fetch(`${API_BASE}/admin/products/${product.id}?_auth_token=${encodeURIComponent(freshSession.access_token)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ADMIN] Failed to delete product:', response.status, errorData);
        toast.error(errorData.error || t('Failed to delete product', '删除商品失败'));
        // 回滚本地状态
        setDisplayProducts(previousProducts);
        return;
      }

      const data = await response.json();
      console.log('[ADMIN] Product deleted successfully:', data);
      
      toast.success(t(`Product "${productName}" deleted successfully`, `商品「${productName}」已删除`));
      
      // ✅ 清除前端缓存，确保前台页面立即移除该商品
      clearProductsCache();
      console.log('[ADMIN] Product cache cleared for frontend sync');
      
      // 不需要刷新，因为已经乐观更新了
    } catch (error) {
      console.error('[ADMIN] Error deleting product:', error);
      toast.error(t('Failed to delete product', '删除商品失败'));
      // 出错时重新加载以确保数据一致性
      refreshProducts();
    }
  };

  /**
   * 格式化日期时间
   */
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(language === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * 导出预定数据为Excel
   */
  const exportToExcel = () => {
    try {
      // 准备导出数据
      const exportData = allOrders.map((order, index) => {
        // 计算商品详情
        const items = order.items.map(item => 
          `${item.name}${item.option ? `(${item.option})` : ''} x${item.quantity}`
        ).join('; ');

        return {
          [t('No.', '序号')]: index + 1,
          [t('Reservation No.', '预定号')]: order.orderNumber || order.id.substring(0, 8),
          [t('Type', '类型')]: order.isOffline ? t('Offline', '线下') : t('Online', '线上'),
          [t('User', '用户')]: order.contactInfo?.real_name || order.userEmail,
          [t('Class', '班级')]: order.contactInfo?.class_name || '-',
          [t('Items', '商品详情')]: items,
          [t('Total (CNY)', '总额(元)')]: `¥${order.total.toFixed(2)}`,
          [t('Status', '状态')]: order.completed ? t('Completed', '已完成') : t('Pending', '待完成'),
          [t('Time', '预定时间')]: formatDateTime(order.createdAt)
        };
      });

      // 创建工作簿和工作表
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, t('Reservations', '预定列表'));

      // 设置列宽
      const columnWidths = [
        { wch: 6 },  // 序号
        { wch: 15 }, // 预定号
        { wch: 8 },  // 类型
        { wch: 12 }, // 用户
        { wch: 15 }, // 班级
        { wch: 40 }, // 商品详情
        { wch: 12 }, // 总额
        { wch: 10 }, // 状态
        { wch: 20 }, // 时间
      ];
      worksheet['!cols'] = columnWidths;

      // 生成文件名（包含当前日期）
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const fileName = `${t('Reservations', '预定列表')}_${dateStr}.xlsx`;

      // 导出文件
      XLSX.writeFile(workbook, fileName);
      
      toast.success(t('Excel exported successfully', 'Excel导出成功'));
    } catch (error) {
      console.error('[ADMIN] Error exporting to Excel:', error);
      toast.error(t('Failed to export Excel', '导出Excel失败'));
    }
  };

  /**
   * 处理商品排序
   */
  const handleProductSort = (field: ProductSortField) => {
    // 如果点击同一列，切换排序方向
    if (productSortField === field) {
      setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // 点击新列，设置为升序
      setProductSortField(field);
      setProductSortDirection('asc');
    }
  };

  /**
   * 获取排序后的商品列表
   */
  const getSortedProducts = () => {
    if (productSortField === 'none') {
      return displayProducts;
    }

    const sorted = [...displayProducts].sort((a, b) => {
      let compareA: string | number;
      let compareB: string | number;

      switch (productSortField) {
        case 'name':
          compareA = language === 'en' ? a.name.en.toLowerCase() : a.name.cn.toLowerCase();
          compareB = language === 'en' ? b.name.en.toLowerCase() : b.name.cn.toLowerCase();
          break;
        case 'category':
          compareA = a.category.toLowerCase();
          compareB = b.category.toLowerCase();
          break;
        case 'price':
          compareA = a.price;
          compareB = b.price;
          break;
        default:
          return 0;
      }

      if (compareA < compareB) {
        return productSortDirection === 'asc' ? -1 : 1;
      }
      if (compareA > compareB) {
        return productSortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  };

  // 获取排序后的商品
  const sortedProducts = getSortedProducts();

  return (
    <div className="container mx-auto py-8 px-4">
      <Tabs defaultValue="orders" className="w-full space-y-8">
        <TabsList className="grid w-full grid-cols-3 h-auto gap-1 p-1">
          <TabsTrigger value="orders">{t('Orders', '订单管理')}</TabsTrigger>
          <TabsTrigger value="products">{t('Products', '商品管理')}</TabsTrigger>
          <TabsTrigger value="messages">{t('Messages', '消息中心')}</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {/* 订单管理区域 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {t('Reservation Management', '预定管理')}
              </CardTitle>
              <CardDescription>{t('View and manage all reservations', '查看和管理所有预定')}</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOfflineOrderDialogOpen(true)}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('Add Offline Reservation', '录入线下预定')}
              </Button>
              {allOrders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToExcel}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {t('Export Excel', '导出Excel')}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.hash = '#/sales'}
                className="text-primary hover:text-primary hover:bg-primary/10"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                {t('Sales Statistics', '销售统计')}
              </Button>
              {allOrders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCompletedOrders}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('Clear Records', '清空记录')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : ordersError ? (
            <div className="text-center py-8 text-red-500">
              <p>{ordersError}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={loadAllOrders}
              >
                Retry
              </Button>
            </div>
          ) : allOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('No reservations yet', '暂无预定')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Uncompleted Orders Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-orange-600 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {t('Uncompleted', '未完成')} ({allOrders.filter(o => !o.completed && o.status !== 'completed' && o.status !== 'cancelled').length})
                </h3>
                
                {/* 移动端：卡片式布局 */}
                <div className="block lg:hidden space-y-3">
                  {allOrders
                    .filter(order => !order.completed && order.status !== 'completed' && order.status !== 'cancelled')
                    .map((order) => (
                       <div key={order.id} className="border rounded-lg p-4 space-y-3 bg-white shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-xs text-gray-500 truncate">
                                #{order.orderNumber || order.id.slice(0, 20) + '...'}
                              </p>
                              {order.isOffline && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                  {t('Offline', '线下')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                          <span className="font-semibold text-lg text-orange-600 ml-2">
                            ¥{order.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{order.contactInfo?.real_name || 'N/A'}</p>
                          <p className="text-xs text-gray-600">{order.contactInfo?.class_name || 'N/A'}</p>
                        </div>
                        <div className="space-y-2 bg-gray-50 p-3 rounded">
                          <p className="text-xs font-semibold text-gray-700">{t('Items', '商品')}:</p>
                          {order.items.map((item, idx) => renderOrderItem(item, idx))}
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => markOrderAsCompleted(order.id)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('Complete', '完成')}
                        </Button>
                      </div>
                    ))}
                  {allOrders.filter(order => !order.completed && order.status !== 'completed' && order.status !== 'cancelled').length === 0 && (
                    <div className="text-center py-8 text-gray-500 border rounded-lg">
                      {t('No uncompleted orders', '没有未完成订单')}
                    </div>
                  )}
                </div>

                {/* 桌面端：表格布局 */}
                <div className="hidden lg:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">{t('Order', '订单')}</TableHead>
                        <TableHead className="min-w-[120px]">{t('Customer', '客户')}</TableHead>
                        <TableHead className="min-w-[200px]">{t('Items', '商品')}</TableHead>
                        <TableHead className="min-w-[100px]">{t('Total', '总价')}</TableHead>
                        <TableHead className="text-right min-w-[120px]">{t('Action', '操作')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOrders
                        .filter(order => !order.completed && order.status !== 'completed' && order.status !== 'cancelled')
                        .map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-xs text-gray-500">
                                    #{order.orderNumber || order.id.slice(0, 15) + '...'}
                                  </p>
                                  {order.isOffline && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                      {t('Offline', '线下')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {formatDateTime(order.createdAt)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{order.contactInfo?.real_name || 'N/A'}</p>
                                <p className="text-xs text-gray-600">{order.contactInfo?.class_name || 'N/A'}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.items.map((item, idx) => renderOrderItemDesktop(item, idx))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">¥{order.total.toFixed(2)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => markOrderAsCompleted(order.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Complete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      {allOrders.filter(order => !order.completed && order.status !== 'completed' && order.status !== 'cancelled').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            {t('No uncompleted orders', '没有未完成订单')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Completed Orders Column */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {t('Completed', '已完成')} ({allOrders.filter(o => o.completed || o.status === 'completed').length})
                </h3>
                
                {/* 移动端：卡片式布局 */}
                <div className="block lg:hidden space-y-3">
                  {allOrders
                    .filter(order => order.completed || order.status === 'completed')
                    .map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 space-y-3 bg-green-50 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-xs text-gray-500 truncate">
                                #{order.orderNumber || order.id.slice(0, 20) + '...'}
                              </p>
                              {order.isOffline && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                  {t('Offline', '线下')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {formatDateTime(order.createdAt)}
                            </p>
                          </div>
                          <span className="font-semibold text-lg text-green-600 ml-2">
                            ¥{order.total.toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{order.contactInfo?.real_name || 'N/A'}</p>
                          <p className="text-xs text-gray-600">{order.contactInfo?.class_name || 'N/A'}</p>
                        </div>
                        <div className="space-y-2 bg-white p-3 rounded border border-green-200">
                          <p className="text-xs font-semibold text-gray-700">{t('Items', '商品')}:</p>
                          {order.items.map((item, idx) => renderOrderItem(item, idx))}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markOrderAsCompleted(order.id)}
                          className="w-full"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Unmark / 取消
                        </Button>
                      </div>
                    ))}
                  {allOrders.filter(order => order.completed || order.status === 'completed').length === 0 && (
                    <div className="text-center py-8 text-gray-500 border rounded-lg bg-green-50">
                      {t('No completed orders', '没有已完成订单')}
                    </div>
                  )}
                </div>

                {/* 桌面端：表格布局 */}
                <div className="hidden lg:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">{t('Order', '订单')}</TableHead>
                        <TableHead className="min-w-[120px]">{t('Customer', '客户')}</TableHead>
                        <TableHead className="min-w-[200px]">{t('Items', '商品')}</TableHead>
                        <TableHead className="min-w-[100px]">{t('Total', '总价')}</TableHead>
                        <TableHead className="text-right min-w-[120px]">{t('Action', '操作')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allOrders
                        .filter(order => order.completed || order.status === 'completed')
                        .map((order) => (
                          <TableRow key={order.id} className="bg-green-50">
                            <TableCell>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-xs text-gray-500">
                                    #{order.orderNumber || order.id.slice(0, 15) + '...'}
                                  </p>
                                  {order.isOffline && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                      {t('Offline', '线下')}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {formatDateTime(order.createdAt)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{order.contactInfo?.real_name || 'N/A'}</p>
                                <p className="text-xs text-gray-600">{order.contactInfo?.class_name || 'N/A'}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {order.items.map((item, idx) => renderOrderItemDesktop(item, idx))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">¥{order.total.toFixed(2)}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markOrderAsCompleted(order.id)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Unmark
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      {allOrders.filter(order => order.completed || order.status === 'completed').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            {t('No completed orders', '没有已完成订单')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Cancelled Orders Section */}
              {allOrders.filter(o => o.status === 'cancelled').length > 0 && (
                <div className="space-y-4 mt-6">
                  <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                    <X className="w-5 h-5" />
                    {t('Cancelled', '已取消')} ({allOrders.filter(o => o.status === 'cancelled').length})
                  </h3>
                  
                  {/* 移动端：卡片式布局 */}
                  <div className="block lg:hidden space-y-3">
                    {allOrders
                      .filter(order => order.status === 'cancelled')
                      .map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 space-y-3 bg-red-50 shadow-sm border-red-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-xs text-gray-500 truncate">
                                  #{order.orderNumber || order.id.slice(0, 20) + '...'}
                                </p>
                                {order.isOffline && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                    {t('Offline', '线下')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {formatDateTime(order.createdAt)}
                              </p>
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded">
                                {t('CANCELLED', '已取消')}
                              </span>
                            </div>
                            <span className="font-semibold text-lg text-gray-500 line-through ml-2">
                              ¥{order.total.toFixed(2)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{order.contactInfo?.real_name || 'N/A'}</p>
                            <p className="text-xs text-gray-600">{order.contactInfo?.class_name || 'N/A'}</p>
                          </div>
                          <div className="space-y-2 bg-white p-3 rounded">
                            <p className="text-xs font-semibold text-gray-700">{t('Items', '商品')}:</p>
                            {order.items.map((item, idx) => renderOrderItem(item, idx))}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* 桌面端：表格布局 */}
                  <div className="hidden lg:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[180px]">{t('Order', '订单')}</TableHead>
                          <TableHead className="min-w-[120px]">{t('Customer', '客户')}</TableHead>
                          <TableHead className="min-w-[200px]">{t('Items', '商品')}</TableHead>
                          <TableHead className="min-w-[100px]">{t('Total', '总价')}</TableHead>
                          <TableHead className="text-right min-w-[120px]">{t('Status', '状态')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allOrders
                          .filter(order => order.status === 'cancelled')
                          .map((order) => (
                            <TableRow key={order.id} className="bg-red-50">
                              <TableCell>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-mono text-xs text-gray-500">
                                      #{order.orderNumber || order.id.slice(0, 15) + '...'}
                                    </p>
                                    {order.isOffline && (
                                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                        {t('Offline', '线下')}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {formatDateTime(order.createdAt)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-sm">{order.contactInfo?.real_name || 'N/A'}</p>
                                  <p className="text-xs text-gray-600">{order.contactInfo?.class_name || 'N/A'}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {order.items.map((item, idx) => renderOrderItemDesktop(item, idx))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold text-gray-500 line-through">¥{order.total.toFixed(2)}</span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="inline-block px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
                                  {t('CANCELLED', '已取消')}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="products">
          {/* 商品库存管理区域 */}
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {t('Product Inventory', '商品库存')}
              </CardTitle>
              <CardDescription>
                {t('Manage product inventory', '管理商品库存')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnsureSeedProducts}
                disabled={ensuringSeeds}
                title={t('Sync missing seed products (e.g. Cap) to database', '将缺失的种子商品（如棒球帽）同步到数据库')}
              >
                {ensuringSeeds ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('Syncing...', '同步中...')}
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    {t('Sync Seeds', '同步种子商品')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshImageUrls}
                disabled={refreshingUrls}
                title={t('Fix invalid blob URLs in product images', '修复商品图片中的无效 blob URLs')}
              >
                {refreshingUrls ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('Fixing...', '修复中...')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {t('Fix Blob URLs', '修复 Blob URLs')}
                  </>
                )}
              </Button>
              <AddProductDialog onProductAdded={addProduct} existingProducts={displayProducts} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingProducts ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-gray-600">
                  {t('Loading products...', '加载商品中...')}
                </p>
              </div>
            </div>
          ) : productsError ? (
            // Error state
            <div className="rounded-md border border-red-200 bg-red-50 p-8 text-center">
              <p className="text-red-600 font-medium mb-2">
                {t('Failed to load products', '加载商品失败')}
              </p>
              <p className="text-sm text-red-500">{productsError}</p>
              <Button 
                onClick={refreshProducts} 
                variant="outline" 
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('Retry', '重试')}
              </Button>
            </div>
          ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleProductSort('name')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      {t('Product', '商品')}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleProductSort('category')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      {t('Category', '分类')}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleProductSort('price')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      {t('Price', '价格')}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </TableHead>
                  <TableHead>{t('Actions', '操作')}</TableHead>
                  <TableHead className="text-right">{t('Status', '状态')}</TableHead>
                  <TableHead className="text-center">{t('Delete', '删除')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product) => {
                  const productIsStocked = product.available ?? isStocked(product.id);
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                            {product.images?.[0] ? (
                              <ImageWithFallback 
                                src={product.images[0]} 
                                alt={product.name.en} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{language === 'en' ? product.name.en : product.name.cn}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell>¥{product.price.toFixed(2)}</TableCell>
                      <TableCell>
                        <EditProductDialog
                          product={product}
                          onProductUpdated={updateProduct}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="default"
                            size="icon"
                            onClick={() => setEditingStockProduct(product)}
                            className="bg-blue-600 hover:bg-blue-700 h-8 w-8 shadow-sm mr-2"
                            title={t('Edit Stock', '编辑库存')}
                          >
                            <Package className="w-4 h-4" />
                          </Button>
                          <span className={`text-sm ${productIsStocked ? 'text-green-600' : 'text-red-500'}`}>
                            {productIsStocked ? t('In Stock', '有货') : t('Out of Stock', '缺货')}
                          </span>
                          <button
                            onClick={() => toggleProductStock(product.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              productIsStocked ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                productIsStocked ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProduct(product)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="messages">
          <AdminChatView />
        </TabsContent>
      </Tabs>

      <EditStockModal
        product={editingStockProduct}
        isOpen={!!editingStockProduct}
        onClose={() => setEditingStockProduct(null)}
        onUpdate={(updated) => {
          if (updated) updateProduct(updated);
        }}
      />

      {/* 线下订单录入对话框 */}
      <Dialog open={offlineOrderDialogOpen} onOpenChange={setOfflineOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('Add Offline Reservation', '录入线下预定')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'Manually add offline transaction to sync with online orders',
                '手动录入线下交易，与线上订单一起统计'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 商品选择 */}
            <div className="space-y-2">
              <Label htmlFor="product">
                {t('Select Product', '选择商品')} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={offlineOrderForm.productId?.toString() || ''}
                onValueChange={(value) => handleProductSelect(parseInt(value))}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder={t('Select a product...', '选择商品...')} />
                </SelectTrigger>
                <SelectContent>
                  {displayProducts.map(product => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {language === 'en' ? product.name.en : product.name.cn} - ¥{product.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 型号/尺码选择（仅当商品有选项时显示） */}
            {offlineOrderForm.selectedProduct?.options && 
             Object.keys(offlineOrderForm.selectedProduct.options).length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="option">
                  {t('Size/Option', '尺码/规格')} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={offlineOrderForm.option}
                  onValueChange={handleOptionSelect}
                >
                  <SelectTrigger id="option">
                    <SelectValue placeholder={t('Select size/option...', '选择尺码/规格...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(offlineOrderForm.selectedProduct.options).map(([option, price]) => (
                      <SelectItem key={option} value={option}>
                        {option} - ¥{price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 数量 */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                {t('Quantity', '数量')} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={offlineOrderForm.quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                onFocus={(e) => e.target.select()} // 选中全部文本，方便替换
                placeholder="1"
                className="text-center"
              />
              <p className="text-xs text-gray-500">
                {t('Use ↑↓ arrows or type to change', '使用 ↑↓ 箭头或直接输入')}
              </p>
            </div>

            {/* 单价（只读，自动填充） */}
            <div className="space-y-2">
              <Label htmlFor="unitPrice">
                {t('Unit Price (¥)', '单价（¥）')}
              </Label>
              <Input
                id="unitPrice"
                type="number"
                value={offlineOrderForm.unitPrice.toFixed(2)}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* 总金额（只读，自动计算） */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                {t('Total Amount (¥)', '总金额（¥）')}
              </Label>
              <Input
                id="amount"
                type="number"
                value={offlineOrderForm.totalAmount.toFixed(2)}
                disabled
                className="bg-gray-100 cursor-not-allowed text-lg font-semibold"
              />
            </div>

            {/* 价格计算说明 */}
            {offlineOrderForm.selectedProduct && offlineOrderForm.quantity && parseInt(offlineOrderForm.quantity) > 0 && (
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md text-sm">
                <p className="text-green-700 dark:text-green-300">
                  💰 {t('Price Calculation:', '价格计算：')}
                  <span className="font-mono ml-2">
                    ¥{offlineOrderForm.unitPrice.toFixed(2)} × {offlineOrderForm.quantity} = ¥{offlineOrderForm.totalAmount.toFixed(2)}
                  </span>
                </p>
              </div>
            )}

            {/* 提示信息 */}
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">
                {t('💡 Tips:', '💡 提示：')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t('Select product from database, price auto-fills', '从数据库选择商品，价格自动填充')}</li>
                <li>{t('Total amount auto-calculates based on quantity', '总金额根据数量自动计算')}</li>
                <li>{t('Offline reservations marked as completed by default', '线下预定默认标记为已完成')}</li>
                <li>{t('All reservations included in sales statistics', '所有预定纳入销售统计')}</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setOfflineOrderDialogOpen(false);
                setOfflineOrderForm({
                  productId: null,
                  selectedProduct: null,
                  option: '',
                  quantity: '1', // 重置为字符串
                  unitPrice: 0,
                  totalAmount: 0
                });
              }}
            >
              {t('Cancel', '取消')}
            </Button>
            <Button 
              onClick={submitOfflineOrder}
              disabled={submittingOfflineOrder || !offlineOrderForm.selectedProduct}
              className="bg-green-600 hover:bg-green-700"
            >
              {submittingOfflineOrder && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('Add Order', '添加订单')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}