# Phase 2 实操教程：GitHub 查询 + Drizzle 增删

这份文档是当前阶段的独立教程，你将按它完成作业第 1、2 条的本地实现。

## 1. 这一阶段你会学到什么
1. 如何把前端表单请求发给 Hono 后端。
2. 如何用 PAT 从 GitHub 获取当前用户信息。
3. 如何使用 Drizzle 连接 PostgreSQL，并完成新增、读取、删除。
4. 为什么页面状态和数据库状态要分开管理。

## 2. 为什么现在做数据库
因为“查到 GitHub 信息”还只是半成品。作业要求还包括用 Drizzle 完成字段增删，所以这一阶段的目标是：把查询结果保存到数据库，并能删掉。

## 3. Step by Step

### Step 1：确认本地数据库准备方式
1. 你现在项目里已经有 [docker-compose.yml](docker-compose.yml)。
2. 它会启动一个本地 PostgreSQL 容器，默认参数如下：
   - 数据库名：hono_hw
   - 用户名：postgres
   - 密码：postgres
   - 端口：5432
3. 项目里的 [.env](.env) 已经写好了对应连接串。

### Step 2：启动 Docker Desktop
1. 先打开 Docker Desktop。
2. 等待状态变成 Running。
3. 再回到项目目录执行：
   - `docker compose up -d postgres`

### Step 3：确认数据库容器启动成功
1. 执行：
   - `docker ps`
2. 你应该能看到容器名 `hono-hw-postgres`。

### Step 4：理解数据库代码结构
1. [src/db/schema.ts](src/db/schema.ts)
   - 定义表结构 `github_profiles`
   - 这相当于告诉 Drizzle：表有哪些字段、每个字段是什么类型
2. [src/db/client.ts](src/db/client.ts)
   - 负责读取 `DATABASE_URL`
   - 创建数据库连接
   - 在应用启动时自动确保表存在

### Step 5：理解新增的接口
1. [src/index.ts](src/index.ts) 里现在多了 4 个数据库相关接口：
   - `GET /api/db-health`：检查数据库能不能连通
   - `GET /api/records`：查看最近 20 条记录
   - `POST /api/records`：保存 GitHub 用户信息
   - `DELETE /api/records/:id`：按记录 id 删除

### Step 6：启动服务
1. 执行：
   - `npm run dev`
2. 打开页面：
   - `http://localhost:3000`

### Step 7：手工验证数据库链路
1. 打开：
   - `http://localhost:3000/api/db-health`
2. 正常应返回：
   - `{ "ok": true, "database": "connected" }`

### Step 8：验证“查 GitHub 信息”
1. 在页面输入新的 PAT。
2. 点击“查询个人信息”。
3. 页面应显示 GitHub 返回的用户信息 JSON。

### Step 9：验证“保存到数据库”
1. 查询成功后，点击“保存到数据库”。
2. 返回结果里应该有 `record.id`。
3. 这个 id 就是数据库里那条记录的主键。

### Step 10：验证“查看最近记录”
1. 点击“查看最近记录”。
2. 页面应看到数据库返回的记录数组。

### Step 11：验证“删除最近保存”
1. 点击“删除最近保存”。
2. 删除成功后会返回被删掉的那条记录。

## 4. 你怎么判断自己做对了
1. 页面能查到 GitHub 用户信息。
2. 保存成功时能拿到数据库记录 id。
3. 查看最近记录时能看到刚保存的内容。
4. 删除成功后，再查看最近记录，不应再看到那条记录。

## 5. 常见问题排查
1. `docker compose up -d postgres` 报错且提示 pipe 或 engine：Docker Desktop 没启动。
2. `/api/db-health` 报连接失败：确认 Docker 容器是否启动，且 5432 没被其他程序占用。
3. 查询 GitHub 401：PAT 无效或权限不够。
4. 保存时报 invalid payload：说明前端提交的数据字段不完整，通常是你还没先查询 GitHub 信息。
5. 删除时报 record not found：说明你删的是一个不存在的 id，或者这条记录已经删过。

## 6. 本阶段复盘题
1. 为什么前端页面里要区分“最近查询到的 profile”和“最近保存的 record id”？
2. 为什么数据库主键 id 和 GitHub 用户 id 不能混为一谈？
3. 为什么本地开发先用 Docker 跑 PostgreSQL，比直接装本机数据库更适合练习？
