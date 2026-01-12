# 阶段一完成指南 - 纯本地开发环境

> 完成日期: 2026-01-13  
> 本指南包含所有已完成的配置和下一步操作

---

## ✅ 已完成项目

### 1. 开发工具安装
- [x] Docker Desktop (v29.1.3)
- [x] Node.js (v25.2.1)
- [x] npm (v11.6.2)
- [x] Supabase CLI (v2.67.1)

### 2. Supabase 项目初始化
- [x] `supabase init` 完成
- [x] `config.toml` 已配置
- [x] 迁移文件目录创建
- [x] 初始 Schema 迁移文件创建

### 3. 数据库 Schema 设置
- [x] `properties` (物件表)
- [x] `property_photos` (照片表)
- [x] `clients` (客户表)
- [x] `property_appointments` (预约表)
- [x] Row Level Security (RLS) 政策配置
- [x] 数据库索引优化

### 4. 前端环境配置
- [x] `.env.local` 文件创建
- [x] Supabase 客户端库 (`lib/supabase.ts`)
- [x] Package.json 更新 (@supabase/supabase-js)

---

## 🚀 启动本地开发环境

### 步骤 1: 启动 Supabase

```bash
cd "/Users/jason66/Owner Real Estate Agent SaaS"

# 方法 A: 使用自动化脚本（推荐）
bash setup-phase-one.sh

# 方法 B: 手动启动
supabase start
```

**首次启动会拉取 Docker 镜像，需要 5-10 分钟。**

### 步骤 2: 获取 API 密钥

启动完成后，你会看到类似的输出：

```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: <your-jwt-secret>
        anon key: eyJ... (重要！)
service_role key: eyJ...
```

**复制 `anon key` 的值。**

### 步骤 3: 更新前端环境变量

编辑 `frontend/.env.local`：

```bash
nano frontend/.env.local
```

替换这一行：
```
EXPO_PUBLIC_SUPABASE_ANON_KEY=<复制的anon key>
```

### 步骤 4: 安装前端依赖

```bash
cd frontend
npm install
```

### 步骤 5: 启动开发服务器

```bash
npx expo start
```

你会看到：
```
Tunnel ready. Connecting to http://localhost:8081
⚠️  Locally connected only
Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

## 📚 访问 Supabase Studio

访问 http://localhost:54323 可以：
- 查看数据库表
- 管理用户
- 配置 Storage Buckets
- 查看实时日志

---

## 🧪 测试数据库连接

### 方法 1: 使用 Supabase Studio

1. 访问 http://localhost:54323
2. 左侧选择 "SQL Editor"
3. 执行测试查询：

```sql
SELECT * FROM properties LIMIT 10;
```

### 方法 2: 在前端测试

在你的 React 组件中：

```typescript
import { testConnection } from './lib/supabase'

export default function TestComponent() {
  useEffect(() => {
    testConnection().then(result => {
      console.log('Database connection test:', result)
    })
  }, [])
  
  return <div>Check console for connection test result</div>
}
```

---

## 📁 项目结构

```
Owner Real Estate Agent SaaS/
├── supabase/                          # Supabase 本地配置
│   ├── config.toml                    # Supabase 配置文件
│   └── migrations/                    # 数据库迁移
│       └── 20260112000000_initial_schema.sql
├── frontend/                          # 前端应用
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabase.ts           # Supabase 客户端库 ✨ NEW
│   │   ├── components/
│   │   ├── Dashboard.tsx
│   │   └── App.tsx
│   ├── .env.local                    # 环境变量 ✨ NEW
│   ├── package.json                  # 已更新 @supabase/supabase-js
│   └── ...
├── setup-phase-one.sh                # 自动化启动脚本 ✨ NEW
└── docs/
    └── 每日開發進度追蹤與報告/
        └── 三階段部署說明.md
```

---

## 🔧 故障排查

### 问题 1: Docker 无法启动
```bash
# 确保 Docker Desktop 运行中
# Mac: 打开 Launchpad > Docker

# 检查 Docker 状态
docker ps
```

### 问题 2: 端口被占用
```bash
# 查看占用的进程
lsof -i :54321  # API 端口
lsof -i :54322  # 数据库端口
lsof -i :54323  # Studio 端口

# 杀死进程
kill -9 <PID>
```

### 问题 3: Supabase 启动缓慢
- 首次启动需要拉取大量 Docker 镜像（~3GB）
- 网络连接可能影响速度
- 建议使用梯子或更换网络

### 问题 4: 连接失败 "Connection refused"
```bash
# 检查 Supabase 是否运行
supabase status

# 如果失败，清除并重启
supabase stop
docker system prune
supabase start
```

---

## 📱 手机测试

### iOS (需要 Mac)
```bash
# 1. 确保手机和 Mac 在同一网络
# 2. 运行 Expo
npx expo start

# 3. 使用 iPhone 相机应用扫描 QR 码
# 4. 自动打开 Expo Go 应用进行预览
```

### Android
```bash
# 1. 安装 Expo Go 应用
# https://play.google.com/store/apps/details?id=host.exp.exponent

# 2. 确保手机和 Mac 在同一网络
# 3. 扫描 QR 码
```

### Web 浏览器
```bash
npx expo start --web

# 或在 Expo 菜单中选择 "w" 开启 Web 预览
```

---

## ✨ 下一步

### 立即可做：
- [ ] 测试数据库连接
- [ ] 创建简单的登录页面
- [ ] 实现物业列表显示
- [ ] 实现照片上传功能

### 一周内完成：
- [ ] 用户注册/登录流程
- [ ] 核心业务逻辑开发
- [ ] 邀请测试用户

### 准备阶段二：
- 使用相同的 Schema
- 部署到 Supabase Cloud Free
- 部署前端到 Vercel

---

## 💡 有用的资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Expo 官方文档](https://docs.expo.dev/)
- [PostgreSQL JSON/JSONB](https://www.postgresql.org/docs/current/datatype-json.html)
- [Supabase 社区](https://discord.supabase.com)

---

## 🎯 检查清单

在继续之前，确保完成了以下所有项目：

```
✅ 已完成项目
├── [x] Docker 已安装并运行
├── [x] Node.js 已安装
├── [x] Supabase CLI 已安装
├── [x] Supabase 初始化完成
├── [x] 数据库 Schema 创建
├── [x] 前端环境变量配置
├── [x] @supabase/supabase-js 依赖添加
└── [x] Supabase 客户端库创建

⏳ 下一步
├── [ ] Supabase 启动并运行
├── [ ] 获取 anon key
├── [ ] 更新 .env.local
├── [ ] npm install 完成
├── [ ] Expo 成功启动
└── [ ] 测试数据库连接成功
```

---

**最后更新**: 2026-01-13  
**作者**: 自动化部署助手
