① PasswordHasher（密码服务）

↓

② EmailAuthenticator（邮箱认证）

↓

③ AuthService（统一入口）

↓

④ JWT Access Token

↓

⑤ Refresh Token

↓

⑥ Session

↓

⑦ JwtStrategy

↓

⑧ JwtGuard

↓

⑨ /auth/me

↓

⑩ RBAC Guard（真正开始权限）

# 整个认证闭环

PasswordHasher
│
▼
EmailAuthenticator
│
▼
AuthService
│
▼
JwtTokenService
│
▼
SessionService
│
▼
JWT

| 配置          | 作用                                    |
| ------------- | --------------------------------------- |
| `imports`     | 使用其他 Module 导出的 Provider         |
| `controllers` | 注册 HTTP 请求入口                      |
| `providers`   | 注册当前模块内可注入的对象              |
| `exports`     | 将当前模块的 Provider 暴露给其他 Module |

# GET /auth/me

Authorization: Bearer <access-token>

- 完整流程：
  HTTP 请求
  ↓
  JwtAuthGuard
  ↓
  调用 JwtStrategy
  ↓
  提取 Bearer Token
  ↓
  验证签名和过期时间
  ↓
  JwtStrategy.validate(payload)
  ↓
  查询 User
  ↓
  return { id }
  ↓
  Passport 写入 request.user
  ↓
  @CurrentUser() 读取 request.user
  ↓
  AuthController.me()
  ↓
  AuthService.getCurrentUser()
  ↓
  UsersService.getUserContext()
  ↓
  返回组织、部门、角色、权限

# 完整认证体系

Access Token
├── JWT
├── 15 分钟
├── 前端内存保存
└── Authorization: Bearer ...

Refresh Token
├── JWT
├── 7 天
├── HttpOnly Cookie
└── 只发送给 /auth/refresh 和 /auth/logout

Redis Session
├── 保存 Refresh Token 的哈希
├── TTL 7 天
└── 负责撤销登录状态

# 登录

登录
↓
生成 accessToken
↓
生成 refreshToken
↓
refreshToken 哈希后存 Redis
↓
refreshToken 原文写入 HttpOnly Cookie
↓
返回 accessToken

# 刷新

浏览器自动携带 Refresh Cookie
↓
POST /auth/refresh
↓
验证 Refresh JWT
↓
检查 Redis Session
↓
轮换 Refresh Token
↓
返回新 Access Token

# 登出

删除 Redis Session

- 清除 Cookie

## 为什么 Redis 不直接保存 Refresh Token 原文

一旦 Redis 数据泄漏，攻击者可以直接使用 Token。
