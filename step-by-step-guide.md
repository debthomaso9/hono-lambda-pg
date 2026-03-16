# Hono + SAM 作业 Step by Step 教程

这份文档用于边做边学。每个阶段都按固定结构：
1. 你将学到什么
2. 为什么做这一步
3. Step by Step 操作
4. 检查点
5. 常见问题排查
6. 复盘题

---

## Phase 1：项目骨架（先把项目跑起来）

### 1) 你将学到什么
- 如何从 0 初始化 TypeScript 后端项目
- Hono 最小服务如何启动
- 为什么先做健康检查能减少后续调试成本

### 2) 为什么做这一步
没有稳定骨架，后续接入 Drizzle、SAM、GitHub Actions 会反复返工。

### 3) Step by Step 操作
1. 在项目根目录初始化 Node 项目：
   - `npm init -y`
2. 安装运行时依赖：
   - `npm i hono drizzle-orm postgres`
3. 安装开发依赖：
   - `npm i -D typescript tsx @types/node`
4. 初始化 TypeScript 配置：
   - `npx tsc --init`
5. 新建目录：
   - `src`
   - `src/routes`
   - `src/db`
   - `src/pages`
   - `infra`
   - `.github/workflows`
6. 创建最小入口文件 `src/index.ts`（后续我会带你写）
7. 在 `package.json` 中增加脚本（后续我会带你写）

### 4) 检查点
- 有 `package.json`、`tsconfig.json`
- `src/index.ts` 存在
- 运行开发命令后服务可启动

### 5) 常见问题排查
- Node 版本过低：升级到 20.x（推荐）
- `npx tsc --init` 失败：检查 npm 权限或网络
- 启动脚本报路径错误：确认入口文件路径是否为 `src/index.ts`

### 6) 复盘题
1. 为什么先做健康检查接口，而不是直接写业务接口？
2. tsconfig 中 target 与 module 分别控制什么？

---

## Phase 2：业务功能（PAT + Drizzle 增删）

### 1) 你将学到什么
- 如何用 Hono 接收表单请求
- 如何用 PAT 请求 GitHub API
- 如何用 Drizzle 定义表并做新增/删除

### 2) 为什么做这一步
这是作业第 1、2 条的核心：接口、页面、GitHub 信息、数据库操作。

### 3) Step by Step 操作
1. 新建页面路由：`GET /` 返回 HTML 表单
2. 新建 GitHub 接口：`POST /api/github/profile`
   - 从请求中读取 PAT
   - 调用 `https://api.github.com/user`
   - 返回 login、id、avatar_url 等字段
3. 启动本地 PostgreSQL
   - 启动 Docker Desktop
   - 执行 `docker compose up -d postgres`
   - 数据库连接串使用 `.env` 中的 `DATABASE_URL`
4. 新建 Drizzle schema：例如 `github_profiles` 表
5. 新建新增接口：`POST /api/records`
6. 新建删除接口：`DELETE /api/records/:id`
7. 可选增加读取接口：`GET /api/records`，方便检查保存结果
8. 页面上增加按钮，调用新增、删除、查看最近记录接口

### 4) 检查点
- 表单提交后，页面能看到 GitHub 用户信息
- 新增接口可写入数据，删除接口可删除数据
- `GET /api/db-health` 返回数据库连通成功

### 5) 常见问题排查
- GitHub 返回 401：PAT 权限不足或 token 错误
- 数据库连接失败：检查连接字符串与网络连通
- Drizzle 报 schema 问题：检查字段类型与主键设置
- `docker compose up` 失败且提示 pipe 错误：通常是 Docker Desktop 没有启动

### 6) 复盘题
1. 为什么不要把 PAT 写死在代码里？
2. 新增和删除接口为什么建议做参数校验？

---

## Phase 3：SAM + VPC + RDS（云上部署）

### 1) 你将学到什么
- 如何用 SAM 定义 Lambda 与 API Gateway
- VPC 三子网的实际作用
- Lambda 在私网下如何访问 RDS 与外网 API

### 2) 为什么做这一步
这是作业第 3 条的核心：网络架构与部署规范。

### 3) Step by Step 操作
1. 在 `infra/template.yaml` 定义基础资源：
   - Lambda
   - API Gateway
   - VPC
   - 子网（1 公网 + 2 私网）
   - 安全组
   - RDS PostgreSQL
2. Lambda 放到私网子网，RDS 放到数据库私网子网
3. 配置安全组：只允许 Lambda SG 访问 RDS 5432
4. 配置 NAT 出网能力，保证 Lambda 能访问 GitHub API
5. 使用 `sam validate`、`sam build`、`sam deploy` 部署

### 4) 检查点
- 部署成功并得到 API URL
- 云端调用 GitHub 接口成功
- Lambda 能连接 RDS

### 5) 常见问题排查
- 超时：多为 VPC 路由/NAT 配置不完整
- RDS 连接拒绝：安全组或子网 ACL 配置错误
- SAM 参数报错：检查模板参数和默认值

### 6) 复盘题
1. 为什么 Lambda 放私网通常更安全？
2. 为什么私网 Lambda 访问 GitHub 需要 NAT？

---

## Phase 4：GitHub Actions + OIDC 自动部署

### 1) 你将学到什么
- GitHub OIDC 到 AWS 的无密钥授权思路
- 如何在 workflow 中完成 SAM 自动部署
- 如何把权限限制到具体仓库和具体分支

### 2) 为什么做这一步
这是作业第 4 条核心，且是工程化交付关键能力。

### 3) Step by Step 操作
1. 确认 GitHub 仓库信息
   - 仓库全名：`debthomaso9/hono-lambda-pg`
   - 分支：`main`
2. 在 AWS 创建 GitHub OIDC Provider
   - Provider URL：`https://token.actions.githubusercontent.com`
   - Audience：`sts.amazonaws.com`
3. 创建 IAM Trust Policy
   - 直接使用 `infra/iam/github-oidc-trust-policy.json`
   - 关键限制条件是：只允许 `debthomaso9/hono-lambda-pg` 的 `main` 分支发起临时身份申请
4. 创建 IAM Permission Policy
   - 直接使用 `infra/iam/github-actions-deploy-policy.json`
   - 这份策略覆盖本项目现阶段部署需要的 CloudFormation、S3、Lambda、IAM、API Gateway、EC2、RDS 权限
5. 创建一个 GitHub Actions 专用 Role
   - 建议名称：`GitHubActionsHonoDeployRole`
   - 信任策略使用上一步的 Trust Policy
   - 权限策略使用上一步的 Deploy Policy
6. 在 GitHub 仓库 Secrets 中新增两个机密
   - `AWS_ROLE_ARN`：上面那个 IAM Role 的 ARN
   - `DB_PASSWORD`：你部署 RDS 时使用的数据库密码
7. 在仓库中提交 `.github/workflows/deploy.yml`
   - 流程是：checkout -> setup node -> npm ci -> npm run build -> setup sam -> OIDC 获取临时凭证 -> sam validate -> sam build -> sam deploy
8. 推送到 `main` 分支，或在 GitHub Actions 页面手动执行 `workflow_dispatch`
9. 在 Actions 日志中重点检查 3 个阶段
   - `Configure AWS credentials from GitHub OIDC`
   - `Build SAM application`
   - `Deploy SAM stack`

### 4) 检查点
- Actions 日志中 AssumeRole 成功
- `sam deploy` 成功
- 新版本可访问
- 没有在仓库中存放长期 AWS Access Key

### 5) 常见问题排查
- `Not authorized to perform sts:AssumeRoleWithWebIdentity`：trust policy 条件不匹配
- 部署权限不足：Role policy 缺少 CloudFormation/Lambda/RDS 权限
- `Credentials could not be loaded`：检查 GitHub Actions 权限是否包含 `id-token: write`
- `Parameters: [DBPassword] must have values`：检查仓库 Secret `DB_PASSWORD` 是否已设置
- push 了但没触发部署：检查默认分支是不是 `main`

### 6) 复盘题
1. OIDC 为什么比长期 AK/SK 更安全？
2. 为什么要限制到具体 repo 和分支？
3. 为什么 CI 里仍然需要 Secret 存数据库密码，而不是把它写死在 workflow 里？

---

## Phase 5：验收材料整理

### 1) 你将学到什么
- 如何把技术成果变成可评分的作业证据

### 2) 为什么做这一步
老师看的是“可验证结果”，不是你脑中的实现过程。

### 3) Step by Step 操作
1. 准备本地演示截图：PAT 查询 + 增删成功
2. 准备云端演示截图：API URL 可访问
3. 准备 Actions 成功截图：OIDC + deploy 日志
4. 在 README 中逐条对应 4 个作业要求

### 4) 检查点
- 第三方同学按 README 可以复现主要流程
- 四条作业要求都能找到证据

### 5) 常见问题排查
- 只给代码不给证据：容易被判定“无法验收”
- 文档与实际不一致：复现失败

### 6) 复盘题
1. 这次项目里你最关键的 3 个知识点是什么？
2. 如果重做一次，哪个阶段你会提前做得更好？
