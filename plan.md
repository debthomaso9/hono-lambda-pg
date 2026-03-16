# Hono + SAM 作业总计划（MVP）

## 1. 已确认技术决策
1. 数据库：RDS PostgreSQL
2. GitHub 信息获取：Personal Access Token (PAT)
3. CI/CD 授权方式：GitHub OIDC + IAM Role
4. 交付目标：先跑通作业验收（MVP），再考虑优化

## 2. 作业要求映射
1. 要求1：Hono 开发接口 + 页面，并用 SAM 部署到 AWS
2. 要求2：表单页面通过个人 token 获取 GitHub 账户信息 + Drizzle 实现字段增删
3. 要求3：服务与数据库部署在同一 VPC，采用 1 公网子网 + 2 私网子网（Lambda 与 DB）
4. 要求4：编写 GitHub Actions，并赋予 IAM 权限进行自动部署

## 3. 分阶段实施

### Phase 0：准备阶段
目标：确保工具和账号权限齐备。
- 工具：Node.js、npm、Git、AWS CLI、SAM CLI、Docker
- 账号权限：AWS 可创建 VPC/Lambda/RDS/IAM；GitHub Actions 可执行
- 输出物：可用开发环境

### Phase 1：项目骨架
目标：初始化可运行的 Hono + TypeScript 项目。
- 初始化 Node 项目与依赖
- 建立目录结构（src、infra、.github/workflows）
- 配置 tsconfig、环境变量模板、脚本命令
- 输出物：本地可启动并返回健康检查

### Phase 2：业务功能
目标：实现页面、GitHub 查询、数据库增删。
- GET / 返回表单页面
- POST /api/github/profile：使用 PAT 查询 GitHub /user
- POST /api/records：新增记录
- DELETE /api/records/:id：删除记录
- 输出物：本地完整链路可用

### Phase 3：AWS 基础设施（SAM）
目标：将服务和数据库部署到同一 VPC。
- SAM 模板定义 Lambda + API Gateway + VPC + RDS
- 子网与安全组配置（Lambda 可连 RDS，且可访问外网 GitHub）
- 输出物：云端 API 可访问，数据库可连接

### Phase 4：GitHub Actions 自动部署
目标：通过 OIDC 让流水线自动部署。
- 配置 AWS OIDC 信任与 IAM Role
- 编写 workflow（build + deploy）
- 输出物：推送代码后可自动部署

### Phase 5：验收与提交
目标：形成可演示、可复现的作业成果。
- 本地演示：PAT 查询 + 增删
- 云端演示：API 地址可访问
- CI 演示：Actions 成功日志
- 输出物：README + 截图/日志证据

## 4. 验收检查清单
1. 页面可输入 PAT 并返回 GitHub 用户信息
2. Drizzle 新增/删除接口可用
3. SAM validate/build 通过
4. 服务与数据库在同一 VPC
5. GitHub Actions 通过 OIDC 自动部署成功

## 5. 风险与规避
1. 私网 Lambda 无法访问 GitHub API：需要 NAT 出网
2. RDS 连接失败：检查安全组、子网、连接字符串
3. OIDC AssumeRole 失败：检查 trust policy 的 repo/branch 条件
4. PAT 泄露风险：不要写入仓库，使用环境变量输入
