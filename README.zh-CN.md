# AI Knowledge Workspace

[English](README.md) | [简体中文](README.zh-CN.md)

> 基于 React、NestJS、PostgreSQL、Redis、MinIO 与本地 Reranker 构建的企业级多租户 RAG 知识平台。

**当前版本：v1.0.0**

AI Knowledge Workspace 不是一个单独的聊天 Demo，而是对企业知识产品完整业务闭环的实现。系统覆盖平台、组织和部门三个作用域，可以异步处理企业文档，通过混合检索召回已发布知识，并将有依据、可追溯引用的回答流式传输到浏览器。

项目定位为 **前端方向的全栈实现**。重点展示 React 应用架构、角色驱动的产品流程、前后端接口协作和完整的 RAG 用户链路。后端使用 NestJS 与 Prisma 实现，但不把尚未验证的生产规模或分布式能力包装成既有成果。

## 项目亮点

- 覆盖平台、组织和部门作用域的多租户工作空间。
- 同时实现角色导航、前端路由保护和后端资源权限校验。
- 企业管理员可以创建员工，并为员工分配多个部门角色。
- 部门管理员可以管理成员和知识库，同时保留普通聊天能力。
- 支持 PDF、DOCX、Markdown 上传，以及异步解析、审核、发布、重试、下载和归档流程。
- Parent Section / Child Chunk 分层索引与 1,024 维 Embedding。
- Vector + BM25 混合检索、RRF 融合、可选 Reranker 和受控降级。
- SSE 流式回答，支持引用、检索状态、反馈和链路诊断。
- AI 回答、引用数据源和 Chunk 预览支持 Markdown、代码块、数学公式、链接和受限尺寸图片。
- 支持中英文界面切换。

## 产品链路

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

## 角色与权限

| 角色 | 作用域 | 主要能力 |
| --- | --- | --- |
| Platform Admin | 平台 | Dashboard、租户创建与管理、平台统计 |
| Organization Admin | 组织 | 部门管理、租户员工管理、部门角色分配 |
| Department Admin | 部门 | 成员、知识库、文档、Chunk、审核、发布、检索诊断和聊天 |
| Department Member | 部门 | 只读知识访问、知识库 AI Chat、会话与反馈 |

权限同时落在三层：

1. 左侧导航根据角色显示。
2. React Router 阻止直接访问无权限 URL。
3. NestJS Guard 和资源归属校验保护 API 与真实数据边界。

## 文档工作流

```text
UPLOAD → PROCESSING → PARSED → REVIEWING → PUBLISHED
                 └──────────→ FAILED → REPROCESS
```

- 原文件存入 MinIO。
- BullMQ 与 Redis 执行异步文档处理任务。
- 解析后生成 Parent Section 与 Child Chunk，并写入 Embedding。
- 管理员可以预览、编辑、审核和发布 Chunk。
- 失败文档可以重试，原文件可以下载，归档操作保留业务历史。

## RAG 与 AI Chat

- Query Rewrite 结合当前问题与有限会话历史生成语义和关键词查询。
- Vector 与 BM25 两路独立召回，其中一路失败时允许受控降级。
- 候选结果通过 RRF 合并，再进入可选的交叉编码器 Reranker。
- 命中 Child Chunk 后根据 Parent Section 重建连续上下文，避免跨章节拼接。
- 只有有效且已发布的 Chunk 才会参与新检索。
- 仅在 `grounded` 或 `partial` 状态调用生成模型；无数据、无匹配或服务异常不会被包装成伪造答案。
- 浏览器通过 `text/event-stream` 接收增量回答、引用、检索状态和完成事件。
- 每个 Conversation 永久绑定一个知识库，切换知识库会开始空白会话，不复用原历史。

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
│ ParadeDB     │ Redis          │ Object files  │ LLM / Embed  │
│ pgvector     │ async jobs     │               │ Reranker     │
└──────────────┴────────────────┴───────────────┴──────────────┘
```

## 技术栈

| 层级 | 技术 |
| --- | --- |
| Frontend | React 19、TypeScript、Vite 8、React Router、Zustand、Axios |
| UI | HeroUI、Tailwind CSS 4、Framer Motion、Lucide、React Markdown、KaTeX |
| 表单与校验 | React Hook Form、Zod |
| 国际化 | i18next、react-i18next |
| Backend | Node.js、NestJS 11、REST、SSE、class-validator、Swagger / Scalar |
| 认证与授权 | JWT Access Token、HttpOnly Refresh Cookie、Redis Session、RBAC Guard |
| 数据库与搜索 | PostgreSQL / ParadeDB、Prisma 7、pgvector、`pg_search` BM25 |
| 异步任务与存储 | BullMQ、Redis、MinIO |
| RAG | Ollama Embedding、Vector Search、BM25、RRF、Qwen Reranker、Citation、RAG Trace |
| 质量保障 | Vitest、Testing Library、Playwright、Jest、Supertest、ESLint、Prettier |
| 本地基础设施 | Docker Compose |

## 仓库结构

```text
ai-workspace/
├── frontend/       # React SPA、路由、页面、API Client 与前端测试
├── backend/        # NestJS API、Prisma、RAG、任务队列与后端测试
├── reranker/       # 本地 Qwen Reranker 服务
├── docker/         # 本地 ParadeDB/PostgreSQL、Redis 与 MinIO
└── docs/           # API、RAG、部署、路线图与面试文档
```

## 快速开始

### 环境要求

- Node.js `^22.22.2`、`^24.15.0` 或 `>=26.0.0`；推荐 Node.js 24 LTS。
- pnpm 10。
- Docker 与 Docker Compose。
- 本地 Ollama，用于 1,024 维 Embedding。
- DeepSeek API Key，用于 Query Rewrite 和回答生成。
- Python 3，用于可选的 Reranker 服务。

### 1. 启动基础服务

```bash
cd docker
docker compose up -d postgres-search redis minio
```

| 服务 | 默认地址 |
| --- | --- |
| ParadeDB / PostgreSQL | `localhost:5435` |
| Redis | `localhost:6379` |
| MinIO API | `localhost:9000` |
| MinIO Console | `http://localhost:9001` |

完整 BM25 迁移需要 `postgres-search` 提供的 `pg_search` 扩展，因此项目默认使用 `5435` 端口。

### 2. 准备 Embedding 模型

```bash
ollama pull qwen3-embedding:0.6b
```

请确保 Ollama 运行在 `http://127.0.0.1:11434`。

### 3. 配置并启动后端

```bash
cd backend
cp .env.example .env
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
pnpm start:dev
```

编辑 `backend/.env`，至少替换 `DEEPSEEK_API_KEY`、`JWT_SECRET` 和 `JWT_REFRESH_SECRET`。

- API：`http://localhost:3000`
- Scalar API Reference：`http://localhost:3000/docs`
- OpenAPI JSON：`http://localhost:3000/openapi.json`

### 4. 启动前端

```bash
cd frontend
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev
```

浏览器访问 `http://localhost:5173`。

### 5. 启动可选 Reranker

Reranker 用于改善候选内容排序。未启动时，检索管线可以基于已有 Vector/BM25 证据降级运行。

```bash
cd reranker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8010
```

第一次加载模型时可能下载 `Qwen/Qwen3-Reranker-0.6B`，已有 Hugging Face 缓存会自动复用。

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

## V1.0.0 范围与边界

- 当前使用模块化单体，而不是为了作品集强行拆分微服务。
- 同一业务库承载事务数据、pgvector 和 BM25，减少额外 ETL 与一致性成本。
- 文档处理使用队列隔离耗时任务，但尚未完成生产级死信队列、Worker 监控和多 Worker 压测。
- Refresh Token 使用 HttpOnly Cookie，Access Token 由前端内存状态管理；生产部署应使用 HTTPS 和同站域名策略。
- 本地 Docker Compose 是开发环境，不代表项目已经完成生产化验证。
- V1.0.0 不包含 Billing、Subscription、SSO、SCIM、Agent、Tool Calling、Kafka、Kubernetes 和多知识库联合检索。

## 后续计划

V2 已进入规划阶段，当前方向见 [docs/plan-v2.md](docs/plan-v2.md)。
