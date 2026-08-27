

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```
## Offen Bash

```bash

$ tree -L 2

# 启动docker
$ docker compose -f docker/docker-compose.yml up -d
$ docker ps

# 重新生成 Client
$ pnpm prisma generate

# 生成一个模块
$ pnpm nest g module users
$ pnpm nest g service users
$ pnpm nest g controller users

```