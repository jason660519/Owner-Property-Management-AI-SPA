# Owner Real Estate Agent SaaS - 快速启动指南

> 房地產仲介人工智能 SaaS 平台 - 本地开发环境

## 🚀 5 分钟快速启动

### 前置要求
- macOS 11+
- Docker Desktop
- Node.js 18+

### 快速步骤

```bash
# 1. 进入项目目录
cd "/Users/jason66/Owner Real Estate Agent SaaS"

# 2. 启动本地 Supabase（仅需首次）
supabase start

# 3. 记下输出的 "anon key"

# 4. 更新前端环境变量
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=<粘贴anon key>" >> frontend/.env.local

# 5. 安装依赖
cd frontend && npm install

# 6. 启动开发服务器
npx expo start

# 7. 在手机上扫描 QR 码
```

## 📋 项目结构

```
├── frontend/           # React + Expo 前端
├── supabase/           # 本地数据库配置
│   └── migrations/     # 数据库迁移文件
├── docs/               # 文档和规划
└── setup-phase-one.sh  # 自动化启动脚本
```

## 🌐 本地地址

| 服务 | 地址 |
|------|------|
| API | http://localhost:54321 |
| Studio (管理后台) | http://localhost:54323 |
| Expo | http://localhost:8081 |

## 📚 更多信息

- 详细设置: [PHASE_ONE_COMPLETE.md](./PHASE_ONE_COMPLETE.md)
- 部署计划: [docs/每日開發進度追蹤與報告/三階段部署說明.md](./docs/每日開發進度追蹤與報告/三階段部署說明.md)

## 💻 常用命令

```bash
# Supabase
supabase start      # 启动服务
supabase stop       # 停止服务
supabase status     # 查看状态
supabase db reset   # 重置数据库

# 前端
cd frontend && npm install    # 安装依赖
npx expo start                # 启动开发
npx expo start --web          # Web 预览
npm run android               # 安卓预览
npm run ios                   # iOS 预览
```

## 🔧 故障排查

遇到问题？查看 [PHASE_ONE_COMPLETE.md](./PHASE_ONE_COMPLETE.md) 中的故障排查部分。

---

**当前版本**: 1.0.0 (Phase One - Local Development)
