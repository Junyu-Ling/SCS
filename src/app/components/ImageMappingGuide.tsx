/**
 * 图片映射快速指南页面
 */

import { Image, Upload, Link2, CheckCircle } from 'lucide-react';

export default function ImageMappingGuide() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* 标题 */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">📸 图片映射快速指南</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          3 步将 Supabase Storage 图片关联到商品
        </p>
      </div>

      {/* 流程图 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 步骤 1 */}
          <div className="text-center">
            <div className="bg-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <Upload className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">上传图片</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              将图片上传到 Supabase Storage
            </p>
            <a
              href="#/upload-images"
              className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              前往上传 →
            </a>
          </div>

          {/* 步骤 2 */}
          <div className="text-center">
            <div className="bg-purple-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <Link2 className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">映射图片</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              将图片分配给对应的商品
            </p>
            <a
              href="#/image-mapper"
              className="inline-block mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              开始映射 →
            </a>
          </div>

          {/* 步骤 3 */}
          <div className="text-center">
            <div className="bg-green-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">验证显示</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              查看商品页面确认图片正常
            </p>
            <a
              href="#/tag/all"
              className="inline-block mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              查看商品 →
            </a>
          </div>
        </div>
      </div>

      {/* 详细说明 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 方法 1: Supabase Dashboard */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Image className="w-6 h-6 text-blue-600" />
            方法 1: Supabase Dashboard
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-1">1. 登录 Supabase</p>
              <p className="text-gray-600 dark:text-gray-400">
                访问 supabase.com 并选择你的项目
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">2. 进入 Storage</p>
              <p className="text-gray-600 dark:text-gray-400">
                左侧菜单 → Storage → make-c4f5ade4-images
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">3. 上传文件</p>
              <p className="text-gray-600 dark:text-gray-400">
                点击 Upload files 选择图片
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">4. 复制路径</p>
              <p className="text-gray-600 dark:text-gray-400">
                记录文件路径（如 products/image.png）
              </p>
            </div>
          </div>
        </div>

        {/* 方法 2: 应用内上传 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6 text-purple-600" />
            方法 2: 应用内上传（推荐）
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold mb-1">1. 访问上传页面</p>
              <p className="text-gray-600 dark:text-gray-400">
                点击上方的"前往上传"按钮
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">2. 选择文件夹</p>
              <p className="text-gray-600 dark:text-gray-400">
                输入 products、avatars 等文件夹名
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">3. 上传图片</p>
              <p className="text-gray-600 dark:text-gray-400">
                选择一个或多个图片文件上传
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">4. 复制 URL</p>
              <p className="text-gray-600 dark:text-gray-400">
                点击复制签名 URL 或存储路径
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 使用图片映射工具 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">🔗 使用图片映射工具</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 rounded-full w-8 h-8 flex items-center justify-center text-blue-600 font-bold">
              1
            </div>
            <div>
              <p className="font-semibold">选择商品</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                在左侧列表中点击要编辑的商品
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900 rounded-full w-8 h-8 flex items-center justify-center text-purple-600 font-bold">
              2
            </div>
            <div>
              <p className="font-semibold">选择图片</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                在右侧图库中点击要分配的图片（可多选）
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 rounded-full w-8 h-8 flex items-center justify-center text-green-600 font-bold">
              3
            </div>
            <div>
              <p className="font-semibold">保存映射</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                点击底部的"保存映射"按钮完成关联
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm">
            💡 <strong>提示:</strong> 图片选择的顺序就是在商品详情页的显示顺序，第一张图片会作为封面。
          </p>
        </div>
      </div>

      {/* 常见问题 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">❓ 常见问题</h2>
        <div className="space-y-4">
          <div>
            <p className="font-semibold mb-2">Q: 图片库是空的怎么办？</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A: 请先使用上传工具或 Supabase Dashboard 上传图片到 Storage。
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Q: 如何调整图片顺序？</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A: 在底部预览区删除不需要的图片，然后按顺序重新点击右侧的图片。
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Q: 支持哪些图片格式？</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A: 支持 PNG、JPG、JPEG、WebP、GIF，单个文件最大 8MB。
            </p>
          </div>

          <div>
            <p className="font-semibold mb-2">Q: 图片不显示怎么办？</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A: 检查图片 URL 格式是否正确（应该是 Supabase 签名 URL），刷新页面重试。
            </p>
          </div>
        </div>
      </div>

      {/* 快速链接 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="#/upload-images"
          className="block p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
        >
          <Upload className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold">上传图片</p>
        </a>

        <a
          href="#/image-mapper"
          className="block p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center"
        >
          <Link2 className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold">映射图片</p>
        </a>

        <a
          href="#/tag/all"
          className="block p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
        >
          <Image className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold">查看商品</p>
        </a>
      </div>
    </div>
  );
}
