# 物业维修工单系统

工程部维修工单记录与管理 Web 系统

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Storage)

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## Vercel 部署

1. 将代码推送到 GitHub
2. 登录 https://vercel.com
3. 点击 "New Project" → Import Git Repository
4. 选择仓库，点击 "Import"
5. 在 "Environment Variables" 中添加：
   - `NEXT_PUBLIC_SUPABASE_URL` = 你的Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 你的anon key
6. 点击 "Deploy"

## 功能

- 📋 工单列表展示
- ➕ 新增维修工单
- ✏️ 编辑/删除工单
- 🖼️ 图片上传
- 🔍 搜索和筛选
- 📊 统计看板
