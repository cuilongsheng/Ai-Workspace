# AI Knowledge Workspace

[English](README.md) | [简体中文](README.zh-CN.md)

> A multi-tenant RAG knowledge platform built with React, NestJS, PostgreSQL, Redis, MinIO, and a local reranker.

**Current version: v1.0.0**

AI Knowledge Workspace delivers a complete business closed‑loop for enterprise knowledge products. The system covers three scopes: platform, organization and department. It processes enterprise documents asynchronously, recalls published knowledge via hybrid retrieval, and streams well‑grounded, traceably‑cited answers to the browser. Key highlights include the React application architecture, role‑driven product workflows, frontend‑backend API collaboration, and the full end‑to‑end RAG user journey. The backend is implemented with NestJS and Prisma, though production‑scale performance and distributed capabilities are not acceptance criteria for this project.

## Highlights

- Multi-tenant workspaces for platform, organization, and department scopes.
- Role-aware navigation, protected frontend routes, and backend resource authorization.
- Organization administrators can create employees and assign multiple department roles.
- Department administrators can manage members and knowledge bases while retaining normal chat access.
- PDF, DOCX, and Markdown upload with asynchronous parsing, review, publishing, retry, download, and archive workflows.
- Parent-section and child-chunk indexing with 1,024-dimensional embeddings.
- Hybrid vector and BM25 retrieval, reciprocal rank fusion, optional reranking, and controlled fallbacks.
- SSE-streamed answers with citations, retrieval states, feedback, and trace diagnostics.
- Markdown, code blocks, math, links, and constrained images in AI answers and source/chunk previews.
- Chinese and English user interfaces.

## Product Flow

```text
Organization / Department / Role authorization
                         ↓
        Upload and process enterprise documents
                         ↓
             Review and publish knowledge
                         ↓
          Vector + BM25 hybrid retrieval
                         ↓
          Reranker + thresholds + state machine
                         ↓
        SSE answer + citations + feedback trace
```

## Roles and Access

| Role | Scope | Main capabilities |
| --- | --- | --- |
| Platform Admin | Platform | Dashboard, organization creation and management, platform statistics |
| Organization Admin | Organization | Department management, employee management, department role assignment |
| Department Admin | Department | Members, knowledge bases, documents, chunks, review, publishing, retrieval diagnostics, and chat |
| Department Member | Department | Read-only knowledge access, knowledge-base chat, conversations, and feedback |

Authorization is enforced at three levels:

1. Role-aware navigation.
2. React Router protection against direct URL access.
3. NestJS guards and resource ownership checks at the API layer.

## Document Workflow

```text
UPLOAD → PROCESSING → PARSED → REVIEWING → PUBLISHED
                 └──────────→ FAILED → REPROCESS
```

- Original files are stored in MinIO.
- BullMQ and Redis run asynchronous document-processing jobs.
- Parsed content is split into parent sections and child chunks, then embedded.
- Administrators can preview, edit, review, and publish chunks.
- Failed documents can be retried, source files can be downloaded, and archive operations retain business history.

## RAG and AI Chat

- Query rewriting combines the current question with limited conversation history to generate semantic and keyword queries.
- Vector and BM25 retrieval run independently and can degrade gracefully if one path fails.
- Reciprocal rank fusion merges candidates before optional cross-encoder reranking.
- Child-chunk hits are expanded through their parent sections to preserve coherent context.
- Only valid, published chunks participate in new retrieval.
- The generation model is called only for grounded or partial states; missing evidence and service failures are not presented as fabricated answers.
- The browser receives incremental content, citations, retrieval state, and completion events through `text/event-stream`.
- Every conversation is bound to one knowledge base. Switching knowledge bases starts a blank conversation and does not reuse history.

## Architecture

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

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, React Router, Zustand, Axios |
| UI | HeroUI, Tailwind CSS 4, Framer Motion, Lucide, React Markdown, KaTeX |
| Forms and validation | React Hook Form, Zod |
| Internationalization | i18next, react-i18next |
| Backend | Node.js, NestJS 11, REST, SSE, class-validator, Swagger / Scalar |
| Authentication | JWT access token, HttpOnly refresh cookie, Redis session, RBAC guards |
| Database and search | PostgreSQL / ParadeDB, Prisma 7, pgvector, `pg_search` BM25 |
| Jobs and storage | BullMQ, Redis, MinIO |
| RAG | Ollama embeddings, vector search, BM25, RRF, Qwen reranker, citations, RAG traces |
| Quality | Vitest, Testing Library, Playwright, Jest, Supertest, ESLint, Prettier |
| Local infrastructure | Docker Compose |

## Repository Structure

```text
ai-workspace/
├── frontend/       # React SPA, routes, pages, API client, and frontend tests
├── backend/        # NestJS API, Prisma schema, RAG pipeline, queues, and tests
├── reranker/       # Local Qwen reranker service
├── docker/         # ParadeDB/PostgreSQL, Redis, and MinIO for local development
└── docs/           # API, RAG, deployment, roadmap, and interview documentation
```

## Quick Start

### Prerequisites

- Node.js `^22.22.2`, `^24.15.0`, or `>=26.0.0`; Node.js 24 LTS is recommended.
- pnpm 10.
- Docker and Docker Compose.
- A local Ollama instance for 1,024-dimensional embeddings.
- A DeepSeek API key for query rewriting and answer generation.
- Python 3 for the optional reranker service.

### 1. Start the infrastructure

```bash
cd docker
docker compose up -d postgres-search redis minio
```

| Service | Default address |
| --- | --- |
| ParadeDB / PostgreSQL | `localhost:5435` |
| Redis | `localhost:6379` |
| MinIO API | `localhost:9000` |
| MinIO Console | `http://localhost:9001` |

The full BM25 migration requires the `pg_search` extension supplied by `postgres-search`, so the project uses port `5435` by default.

### 2. Prepare the embedding model

```bash
ollama pull qwen3-embedding:0.6b
```

Make sure Ollama is available at `http://127.0.0.1:11434`.

### 3. Configure and start the backend

```bash
cd backend
cp .env.example .env
pnpm install --frozen-lockfile
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
pnpm start:dev
```

At minimum, replace `DEEPSEEK_API_KEY`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` in `backend/.env`.

- API: `http://localhost:3000`
- Scalar API reference: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

### 4. Start the frontend

```bash
cd frontend
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`.

### 5. Start the optional reranker

The reranker improves candidate ordering. The retrieval pipeline can fall back to vector/BM25 evidence when it is unavailable.

```bash
cd reranker
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8010
```

The first model load may download `Qwen/Qwen3-Reranker-0.6B`. Existing Hugging Face cache data is reused automatically.

## Common Commands

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

RAG evaluation results apply only to the repository's V1 evaluation set and the data, models, and thresholds used at that time. See [RAG implementation notes](docs/RAG.md).

## V1.0.0 Scope and Boundaries

- The project uses a modular monolith rather than artificial microservices.
- Transaction data, pgvector, and BM25 share one database to reduce ETL and consistency overhead.
- Queue workers isolate slow document-processing tasks, but production-grade dead-letter queues, worker observability, and multi-worker load testing remain future work.
- Refresh tokens use HttpOnly cookies, while access tokens are held in frontend memory. Production deployment should use HTTPS and a same-site domain strategy.
- Local Docker Compose is a development environment, not a claim of production readiness.
- V1.0.0 does not include billing, subscriptions, SSO, SCIM, agents, tool calling, Kafka, Kubernetes, or cross-knowledge-base retrieval.

## Roadmap

V2 is planned. See [docs/plan-v2.md](docs/plan-v2.md) for the current direction.
