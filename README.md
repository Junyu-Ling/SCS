# SCLS Campus Shop - React Application

这是SCLS Campus Shop的React版本，基于原始HTML网站重建。

## 功能特性

- ✅ **双语支持** - 中英文无缝切换
- ✅ **主页** - 倒计时和英雄区块
- ✅ **分类页面** - 商品分类浏览
- ✅ **关于我们** - 团队介绍和使命说明
- ✅ **商品详情** - 图片轮播、尺寸选择、数量控制
- ✅ **购物车** - 侧边栏购物车，支持添加/删除/选择商品
- ✅ **响应式设计** - 适配桌面和移动设备
- ✅ **本地存储** - 自动保存购物车和语言偏好

## 技术栈

- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **shadcn/ui** - UI组件库
- **Lucide React** - 图标库
- **Sonner** - 通知组件

## 项目结构

```
src/
├── app/
│   ├── components/
│   │   ├── Navbar.tsx          # 顶部导航栏
│   │   ├── SubNavbar.tsx       # 子导航栏
│   │   ├── HomePage.tsx        # 主页
│   │   ├── TagsPage.tsx        # 分类页面
│   │   ├── AboutUsPage.tsx     # 关于我们页面
│   │   ├── ProductDetail.tsx   # 商品详情页
│   │   ├── Cart.tsx            # 购物车
│   │   ├── Footer.tsx          # 页脚
│   │   └── ui/                 # shadcn/ui组件
│   ├── contexts/
│   │   ├── LanguageContext.tsx # 语言状态管理
│   │   └── CartContext.tsx     # 购物车状态管理
│   └── App.tsx                 # 主应用组件
└── styles/
    └── tailwind.css            # Tailwind样式
```

## 路由系统

使用简单的hash路由系统：

- `#/` 或 `#/home` - 主页
- `#/tag` - 分类页面
- `#/tag/apparel` - 服饰分类
- `#/tag/stationery` - 文具分类
- `#/tag/dailyUse` - 日用品分类
- `#/tag/sports` - 运动分类
- `#/tag/gift` - 礼品分类
- `#/aboutUs` - 关于我们
- `#/detail` - 商品详情

## 开发指南

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 部署（Cloudflare Pages）

本项目使用 **Cloudflare Pages** 部署（非 Vercel）。推送 `main` 分支后，GitHub Actions 会自动构建并发布。

### Cloudflare Dashboard 构建设置（重要）

Git 仓库已连到 Cloudflare Pages 时，**推荐只用内置发布，不要自定义 Deploy command**：

| 项 | 值 |
|---|---|
| Framework preset | Vite（或 None） |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Deploy command** | **留空**（必须留空） |

留空后，Cloudflare 会在 build 完成后**自动上传 `dist`**，不需要 API Token，也不会跑 wrangler。

**GitHub 仓库名 `SCS` ≠ Cloudflare 项目名。** 仓库叫 SCS 没问题；Cloudflare 侧项目名可以是 `scs` 或 `scls-campus-shop`，互不影响。

### 常见报错

| 现象 | 原因 | 处理 |
|---|---|---|
| `Missing entry-point` | Deploy 用了 `npx wrangler deploy` | 删掉 Deploy command，或改为留空 |
| `does not support "assets"` | `wrangler pages deploy` 与 `[assets]` 冲突 | 已修复；Deploy command 应留空 |
| `Authentication error [10000]` | Deploy 用了 `npm run deploy`，但 Token 无 Pages 写权限 | **Deploy command 留空**（推荐），或给 Token 加 Account → Cloudflare Pages → Edit |

### 仅本地/CI 手动部署时才用 wrangler

```bash
npm run deploy:cloudflare
```

需在本机或 GitHub Actions Secrets 配置：
- `CLOUDFLARE_API_TOKEN` — 权限含 **Account → Cloudflare Pages → Edit**
- `CLOUDFLARE_ACCOUNT_ID`

### 首次配置 Cloudflare（GitHub Actions 自动部署，可选）

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 创建 Pages 项目（名称自定，如 `scs`）
2. 在 GitHub 仓库 Settings → Secrets 添加：
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### 本地手动部署
```bash
npm run deploy:cloudflare
```

### 本地预览 Cloudflare Pages 构建结果
```bash
npm run pages:dev
```

## GitHub集成

### 初始化仓库
```bash
git init
git add .
git commit -m "Initial commit: SCLS Campus Shop React application"
```

### 连接远程仓库
```bash
git remote add origin https://github.com/Miyeon-0131/SCS.git
```

### 推送代码
```bash
# 推送到main分支
git push -u origin main

# 如果需要强制推送
git push -u origin main --force
```

## 从原HTML迁移的页面

已完成：
- ✅ home.html → HomePage.tsx
- ✅ tag.html → TagsPage.tsx
- ✅ aboutUs.html → AboutUsPage.tsx
- ✅ commodityDetail.html → ProductDetail.tsx

待实现：
- ⏳ login.html
- ⏳ register.html
- ⏳ account.html
- ⏳ submitOrder.html
- ⏳ privacyPolicy.html
- ⏳ termsOfUse.html
- ⏳ updateHistory.html

## 下一步计划

1. **实现登录/注册页面**
2. **添加用户账户管理**
3. **完善订单提交流程**
4. **添加更多商品数据**
5. **集成后端API**
6. **实现支付功能**

## 联系方式

- 邮箱：help@sclscampus.shop
- GitHub：https://github.com/Miyeon-0131/SCS

## 许可证

© 2023-2026 SCLS Campus Shop. All rights reserved.
