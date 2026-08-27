# AI Knowledge Workspace

> A multi-tenant RAG knowledge platform built with React, NestJS, PostgreSQL, Redis and MinIO.
>
> 企业级多租户 AI 知识库与智能问答平台：覆盖权限管理、文档处理、混合检索、流式问答与引用追踪的完整业务闭环。

## English overview

AI Knowledge Workspace is a portfolio project that demonstrates end-to-end delivery of a realistic B2B AI product rather than a standalone chat demo. It models platform, organization and department scopes; processes PDF, DOCX and Markdown documents asynchronously; retrieves published knowledge through vector and BM25 search; and streams grounded answers with citations to the browser.

The project is positioned as a **frontend-focused full-stack implementation**. Its strongest areas are React application architecture, role-aware product flows, API integration and the complete RAG user journey. The backend is implemented with NestJS and Prisma, but this repository does not claim large-scale production traffic, distributed architecture or enterprise operations that have not been proven.

### Highlights

- Role-aware React workspace for platform, organization, department admin and member workflows.
- Route-level and API-level authorization, not only hidden navigation items.
- PDF, DOCX and Markdown upload, asynchronous processing, review, publishing, retry, download and archive flows.
- Parent-section/child-chunk indexing with 1,024-dimensional embeddings.
- Hybrid retrieval with vector search, BM25, reciprocal rank fusion, optional reranking and controlled fallbacks.
- SSE streaming responses with citations, retrieval states, feedback and trace diagnostics.
- Chinese/English UI, centralized API feedback and responsive administration pages.

## 中文说明

AI Knowledge Workspace 的目标不是做一个“套壳聊天页面”，而是还原企业知识从进入系统到被可靠使用的完整流程：

```text
组织 / 部门 / 角色权限
        ↓
上传并异步处理业务文档
        ↓
审核、发布可检索内容
        ↓
Vector + BM25 混合召回
        ↓
Reranker / 阈值 / 状态机
        ↓
SSE 流式回答 + Citation + 反馈追踪
```

它适合作为 React / TypeScript 前端岗位，以及前端背景全栈岗位的作品集项目。项目重点展示复杂后台产品建模、前后端接口协作、权限边界、异步任务和 RAG 用户体验，不把尚未验证的高并发、微服务或生产规模包装成既有成果。

## 核心功能

### 多租户与权限

| 角色               | 作用域 | 已实现能力                                      |
| ------------------ | ------ | ----------------------------------------------- |
| Platform Admin     | 平台   | Dashboard、租户创建/编辑/启用/禁用、平台统计    |
| Organization Admin | 组织   | 部门管理、租户员工管理、部门管理员分配          |
| Department Admin   | 部门   | 成员、知识库、文档、Chunk、审核、发布、检索诊断 |
| Department Member  | 部门   | 只读知识库、知识库内 AI Chat、会话与反馈        |

权限同时落在三层：

1. 左侧导航按固定角色显示。
2. React Router 保护直接 URL 访问。
3. NestJS Guard 和资源归属校验保护真实数据边界。

### 文档工作流

```text
UPLOAD → PROCESSING → PARSED → REVIEWING → PUBLISHED
                 └──────────→ FAILED → REPROCESS
```

- 支持 PDF、DOCX、Markdown。
- 原文件写入 MinIO，BullMQ 负责异步处理任务。
- 解析后生成 Parent Section 与 Child Chunk，并写入 Embedding。
- 管理员可以预览、编辑 Chunk、审核和发布。
- 失败文档可以重试；原文件可以下载；归档采用业务状态而非物理删除。

### RAG 与 AI Chat

- Query Rewrite 结合当前问题与有限会话历史生成语义、关键词、纠错和别名查询。
- Vector 与 BM25 两路并行召回，单路失败时允许降级。
- 候选结果通过 RRF 合并，精确实体保护后进入可选 Reranker。
- 命中 Child Chunk 后按 Parent Section 重建连续上下文，避免跨章节拼接。
- 只有 `PUBLISHED` 且有效的 Chunk 参与新检索。
- `grounded` / `partial` 才调用生成模型；无数据、无匹配或服务异常不会伪造答案。
- 浏览器通过 `text/event-stream` 接收增量回答、引用、状态和结束事件。
- Conversation 永久绑定一个知识库，切换知识库会开始空白会话，不复用历史。

## 系统架构

```text
┌─────────────────────────────────────────────────────────────┐
│ React 19 + TypeScript + Vite + HeroUI + Tailwind CSS       │
│ Auth / Admin / Knowledge Base / Document Review / AI Chat  │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST + SSE
┌───────────────────────────▼─────────────────────────────────┐
│ NestJS 11                                                   │
│ DTO Validation / JWT / RBAC Guards / Services / OpenAPI     │
├──────────────┬────────────────┬───────────────┬──────────────┤
│ Prisma ORM   │ BullMQ         │ MinIO         │ AI Providers │
│ ParadeDB     │ Redis          │ Object files  │ Ollama / LLM │
│ pgvector     │ async jobs     │               │ Reranker     │
└──────────────┴────────────────┴───────────────┴──────────────┘
```

## 技术栈

| 层级                 | 技术                                                                     |
| -------------------- | ------------------------------------------------------------------------ |
| Frontend             | React 19、TypeScript、Vite 8、React Router、Zustand、Axios               |
| UI                   | HeroUI、Tailwind CSS 4、Framer Motion、Lucide、React Markdown、KaTeX     |
| Form & Validation    | React Hook Form、Zod                                                     |
| Internationalization | i18next、react-i18next                                                   |
| Backend              | Node.js、NestJS 11、REST、SSE、class-validator、Swagger / Scalar         |
| Auth & Authorization | JWT Access Token、HttpOnly Refresh Cookie、Redis Session、RBAC Guard     |
| Database             | PostgreSQL / ParadeDB、Prisma 7、pgvector、`pg_search` BM25              |
| Async & Storage      | BullMQ、Redis、MinIO                                                     |
| RAG                  | Ollama Embedding、Vector Search、BM25、RRF、Reranker、Citation、RagTrace |
| Quality              | Vitest、Testing Library、Playwright、Jest、Supertest、ESLint、Prettier   |
| Local infrastructure | Docker Compose                                                           |

## 仓库结构

```text
ai-workspace/
├── frontend/              # React SPA、路由、页面、API Client、前端测试
├── backend/               # NestJS API、Prisma、RAG、任务队列、后端测试
├── docker/                # 本地 ParadeDB/PostgreSQL、Redis、MinIO
├── docs/                  # 产品、API、RAG、部署与面试文档
└── scripts/               # 仓库级校验脚本
```

## 快速开始

### 1. 环境要求

- Node.js `^22.22.2`、`^24.15.0` 或 `>=26.0.0`；推荐 Node.js 24 LTS。
- pnpm 10。
- Docker 与 Docker Compose。
- 本地 Ollama，用于 1,024 维 Embedding。
- DeepSeek API Key，用于 Query Rewrite 和回答生成。

Reranker 服务是可选增强项。未启动时，当前检索实现会在已有 Vector/BM25 证据上降级，但会失去交叉编码器重排能力。

### 2. 启动基础服务

```bash
cd docker
docker compose up -d postgres-search redis minio
```

默认端口：

| 服务                  | 地址                    |
| --------------------- | ----------------------- |
| ParadeDB / PostgreSQL | `localhost:5435`        |
| Redis                 | `localhost:6379`        |
| MinIO API             | `localhost:9000`        |
| MinIO Console         | `http://localhost:9001` |

`postgres` 服务是普通 pgvector PostgreSQL；完整 BM25 迁移需要 `postgres-search` 提供的 `pg_search` 扩展，因此本项目默认连接 `5435`。

### 3. 准备 Embedding 模型

```bash
ollama pull qwen3-embedding:0.6b
```

确保 Ollama 运行在 `http://127.0.0.1:11434`。

### 4. 配置并初始化后端

```bash
cd backend
cp .env.example .env
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
pnpm start:dev
```

编辑 `backend/.env`，至少替换：

- `DEEPSEEK_API_KEY`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

后端启动后：

- API：`http://localhost:3000`
- Scalar API Reference：`http://localhost:3000/docs`
- OpenAPI JSON：`http://localhost:3000/openapi.json`

### 5. 启动前端

```bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

浏览器访问 `http://localhost:5173`。

### 6. 本地开发账号

本地 Seed 密码由 `SEED_ADMIN_PASSWORD` 控制，未配置时为 `123456`。这些账号仅用于本地开发，生产环境禁止使用默认密码。

| 账号               | 邮箱     | 固定角色         |
| ------------------ | -------- | ---------------- |
| `en-d-admin@x.com` | `123456` | Department Admin |
| `x-d@x.com`        | `123456` | Department Admin |

** 想要加账户只能用租户管理员登录加成员 **

> `derparment` 是当前 V1 Seed 中保留的开发账号拼写。公开演示前可单独安排数据迁移后更名，不应直接修改 ID 或破坏已有关联数据。

## 常用命令

```bash
# Backend
cd backend
pnpm build
pnpm test
pnpm test:e2e
pnpm openapi:generate
pnpm rag:evaluate
pnpm rag:verify-chat

# Frontend
cd frontend
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
```

RAG 评测结果只代表仓库内 V1 评测集和当时使用的数据、模型及阈值，不应解释为对未来所有文档永久达到相同指标。详见 [RAG 实施说明](docs/RAG.md)。

## 设计取舍与边界

- 当前使用模块化单体，而不是为了作品集强行拆微服务。
- 同一业务库承载事务数据、pgvector 和 BM25，减少额外 ETL 与一致性成本。
- 文档处理使用队列隔离耗时任务，但尚未完成生产级死信队列、任务监控和多 Worker 压测。
- Refresh Token 使用 HttpOnly Cookie，Access Token 由前端内存状态管理；生产部署应使用 HTTPS 和同站域名策略。
- 当前完整部署仍有环境化改造门禁，不能直接把本地 Compose 描述为生产方案。
- V1 不包含 Billing、Subscription、SSO、SCIM、Agent、Tool Calling、Kafka、Kubernetes 和多知识库联合检索。
