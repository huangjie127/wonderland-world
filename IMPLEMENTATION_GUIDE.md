# 功能实现说明文档

## 🔐 1. 邮箱登录 (Supabase Auth)

### 文件结构
```
src/app/auth/
├── login/page.js         # 登录页面
└── signup/page.js        # 注册页面
```

### 核心功能

**登录页面** (`/auth/login`)
- 邮箱和密码输入
- 错误提示
- 自动跳转到 /home
- 注册链接

**注册页面** (`/auth/signup`)
- 邮箱验证
- 密码强度检查（最少6位）
- 密码确认验证
- 邮箱验证确认提示

### 工作流程
```
用户 → 注册 → Supabase Auth → 邮箱验证 → 登录 → 获取 Session
```

### 关键代码
```javascript
// 登录
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

// 注册
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});
```

---

## 👤 2. 认证上下文 (AuthContext)

### 文件
`src/app/providers.js`

### 功能
- 全局用户状态管理
- 自动检查登录状态
- 监听认证变化
- 提供 logout 方法

### 使用方法
```javascript
import { useAuth } from "@/app/providers";

export default function MyComponent() {
  const { user, loading, logout } = useAuth();
  
  if (loading) return <div>加载中...</div>;
  if (!user) return <div>请登录</div>;
  
  return <div>欢迎 {user.email}</div>;
}
```

### 在 Layout 中使用
```javascript
import { AuthProvider } from "./providers";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## 🎨 3. 角色创建 + 头像上传到 Storage

### 文件
`src/components/CreateCharacter.js`

### 功能特性

**1. 头像上传**
- 图片预览
- 上传到 Supabase Storage (`avatars` bucket)
- 自动生成唯一文件名
- 获取公开 URL

**2. 角色信息**
- 名称（必填）
- 标语
- 详细描述

**3. 数据库操作**
- 创建 characters 记录
- 关联用户 ID
- 返回新角色 ID

### 代码实现

```javascript
// 上传头像
const fileExt = formData.avatar.name.split(".").pop();
const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
const filePath = `${user.id}/${fileName}`;

const { error } = await supabase.storage
  .from("avatars")
  .upload(filePath, formData.avatar);

// 获取公开 URL
const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
const avatarUrl = data?.publicUrl;

// 创建角色记录
const { data: character } = await supabase
  .from("characters")
  .insert([{
    name: formData.name,
    tagline: formData.tagline,
    description: formData.description,
    avatar_url: avatarUrl,
    user_id: user.id,
  }])
  .select()
  .single();
```

### 数据库架构

**characters 表**
```sql
- id (uuid)
- user_id (uuid) -- 外键，关联 auth.users
- name (text) -- 角色名称
- tagline (text) -- 标语
- description (text) -- 描述
- avatar_url (text) -- 头像 URL
- created_at (timestamp)
- updated_at (timestamp)
```

### Supabase Storage 设置

需要在 Supabase 创建 `avatars` bucket：
1. 进入 Storage 标签
2. 创建新 bucket: `avatars`
3. 设置为公开读取
4. 添加 RLS 策略允许用户上传自己的文件

---

## 🏠 4. Home 页更新 - 显示用户角色

### 文件
`src/app/home/page.js`

### 功能

**1. 用户欢迎信息**
```
欢迎, user@email.com
管理你的多角色档案库
```

**2. 创建角色按钮**
- 点击显示/隐藏 CreateCharacter 表单
- 创建完成后自动刷新列表

**3. 角色网格展示**
- 显示当前用户的所有角色
- 网格布局（响应式）
- 点击进入角色详情页

**4. 管理功能模块**
- 头像设定
- 相册
- 事件记录
- 关系档案

### 数据流
```
用户登录 → Home 页
  ↓
1. 检查用户登录状态
2. 从 characters 表读取当前用户的角色
3. 显示角色网格
4. 点击创建按钮显示表单
5. 创建成功后刷新列表
```

### 关键代码
```javascript
// 加载用户角色
useEffect(() => {
  const { data } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  
  setCharacters(data || []);
}, [user]);

// 创建后回调
const handleCharacterCreated = (newCharacter) => {
  setCharacters((prev) => [newCharacter, ...prev]);
};
```

---

## 📚 5. 档案馆 - 水平滑动展示

### 文件
`src/app/archive/page.js`

### 功能

**1. 我的角色区域（水平滑动）**
- 显示当前用户创建的角色
- 可通过左右按钮滑动查看
- 卡片样式，悬停时放大
- 点击进入详情页

**2. 社区角色库（网格展示）**
- 显示所有用户创建的角色
- 网格布局（4列响应式）
- 显示作者 ID
- 方便浏览其他创作者的作品

### 水平滑动实现

```javascript
const scrollContainerRef = useRef(null);

const scroll = (direction) => {
  const container = scrollContainerRef.current;
  if (container) {
    container.scrollBy({
      left: direction === "left" ? -300 : 300,
      behavior: "smooth",
    });
  }
};

// 使用
<div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto scroll-smooth">
  {/* 角色卡片 */}
</div>
```

### 样式特性
- 流畅的滚动动画
- 悬停时卡片放大（scale-105）
- 阴影效果提升
- 响应式设计

---

## 🔄 导航流程

```
/ (首页)
  └─ Redirect to /home (if logged in) or /auth/login

/auth/login (登录)
  └─ Success → /home

/auth/signup (注册)
  └─ Success → /auth/login

/home (首页仪表板)
  ├─ 显示用户角色网格
  ├─ 创建新角色
  └─ 管理功能快捷链接

/archive (档案馆)
  ├─ 我的角色（水平滑动）
  ├─ 社区角色库（网格）
  └─ 点击进入详情

/archive/[id] (角色详情)
  ├─ 角色信息展示
  ├─ 点赞
  ├─ 事件记录
  ├─ 相册
  ├─ 关系档案
  └─ 评论
```

---

## 📱 用户交互流程

### 新用户流程
1. 访问首页 → 重定向到 /auth/login
2. 点击"注册" → /auth/signup
3. 填写邮箱和密码 → 提交
4. 收到确认邮件 → 验证
5. 返回登录 → 输入邮箱密码 → 登录成功
6. 进入 /home → 显示"创建新角色"
7. 点击创建 → 填写信息 + 上传头像
8. 创建完成 → 角色显示在首页网格中

### 已有用户流程
1. 访问 /home → 显示已创建的角色网格
2. 可选择：
   a. 点击现有角色 → 进入 /archive/[id] 详情页
   b. 点击创建新角色 → 重复上面的流程
3. 访问 /archive → 水平滑动查看自己的角色，网格查看社区角色

---

## 🔑 关键技术点

1. **Supabase Auth**
   - `signUp()` - 注册
   - `signInWithPassword()` - 登录
   - `onAuthStateChange()` - 监听状态
   - `signOut()` - 退出

2. **Supabase Storage**
   - `upload()` - 上传文件
   - `getPublicUrl()` - 获取公开 URL

3. **Supabase Database**
   - RLS（行级安全）- 用户只能看到自己的角色
   - Foreign Key - user_id 关联

4. **React 钩子**
   - `useAuth()` - 自定义钩子获取用户信息
   - `useEffect()` - 生命周期
   - `useState()` - 状态管理
   - `useRef()` - 获取 DOM 引用

5. **Next.js**
   - `useRouter()` - 导航
   - Client Component (`"use client"`)
   - Dynamic routing (`[id]`)

---

## ⚙️ 环境变量设置

`.env.local` 需要包含：
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

---

## 🚀 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 中设置环境变量
3. 自动部署
4. 配置 Supabase 重定向 URL：
   - `https://your-domain.vercel.app/auth/callback`

---

## ✅ 测试清单

- [ ] 注册新账户
- [ ] 邮箱验证成功
- [ ] 登录成功
- [ ] 上传头像
- [ ] 创建角色成功
- [ ] Home 页显示角色
- [ ] 档案馆水平滑动功能正常
- [ ] 点击角色进入详情页
- [ ] 退出登录重定向到登录页
- [ ] 其他用户的角色显示在社区库

