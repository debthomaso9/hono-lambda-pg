# Phase 3 教程：AWS 基础设施 + SAM 部署

这一阶段实现作业第 1、3 条：把 Hono 应用和 RDS 数据库部署到同一个 VPC，通过 SAM 模板一键创建全部 AWS 资源。

---

## 1. 你将学到什么

- SAM 是什么，CloudFormation 是什么，两者关系
- VPC 里"公网子网"和"私网子网"的区别
- 为什么 Lambda 要放私网、NAT Gateway 要放公网
- 安全组（Security Group）怎么控制谁能连谁
- 如何把 Hono 应用适配成 AWS Lambda Handler
- `sam build` 和 `sam deploy` 的作用是什么

---

## 2. 核心概念解释（人话版）

### SAM 是什么？
SAM = Serverless Application Model，是 AWS 官方的 IaC（基础设施即代码）工具。
你在 `infra/template.yaml` 里描述"我要什么资源、怎么连接"，SAM 帮你在 AWS 里把这些资源全部创建好。

### VPC 是什么？
VPC = Virtual Private Cloud，你在 AWS 里的"私有网络"。
把它想象成你家的局域网，里面的设备（Lambda、RDS）彼此可以通信，但外面的人不能随便进来。

### 为什么要 1 个公网 + 2 个私网子网？
- **公网子网**：NAT Gateway 放在这里。NAT Gateway 的作用是让"不对外的服务"能访问外网，比如 Lambda 去请求 GitHub API。
- **私网子网1（Lambda）**：Lambda 函数放在这里，不直接暴露给互联网。
- **私网子网2（RDS）**：数据库放在这里，只有同 VPC 内的 Lambda 能连它。

### 安全组的作用？
安全组 = 防火墙规则。
- Lambda 的安全组：允许"所有出站"（要访问 GitHub、RDS）
- RDS 的安全组：只允许"来自 Lambda 安全组的 5432 端口入站"
- 这意味着：只有你自己的 Lambda 能连数据库，外网完全无法访问

---

## 3. Step by Step 操作

### Step 1：准备 AWS 账号和权限（前提条件）
1. 登录 AWS Console，确保账号能创建以下资源：
   - Lambda、API Gateway
   - VPC、Subnet、Route Table、NAT Gateway
   - RDS、Security Group
   - IAM Role
2. 如果你用 AWS CLI 部署，需要先配置凭据：
   ```powershell
   aws configure
   # 输入 Access Key ID、Secret Access Key、Region、输出格式
   ```
3. 推荐 Region：`us-east-1`（美东，免费套餐最完整）

### Step 2：理解代码结构的变化
这一阶段起，项目有两个入口：

| 文件 | 用途 |
|------|------|
| `src/index.ts` | 本地开发用，启动 Node.js 服务器 |
| `src/lambda.ts` | AWS 部署用，导出 Lambda Handler |
| `src/app.ts` | 两者共用，定义所有路由和业务逻辑 |

本地跑 `npm run dev`，对应 `src/index.ts`。
AWS Lambda 调的是 `dist/lambda.handler`，对应编译后的 `dist/lambda.js`。

### Step 3：编译项目
在部署之前必须先编译 TypeScript，因为 Lambda 执行的是 `dist/` 里的 JS 文件。
```powershell
npm run build
```
编译成功后，`dist/` 目录里会有：
- `dist/app.js`      → 所有路由逻辑
- `dist/lambda.js`   → Lambda 入口（Handler）
- `dist/index.js`    → 本地启动（Lambda 不用这个）
- `dist/db/`         → 数据库相关

### Step 4：理解 SAM 模板结构
打开 `infra/template.yaml`，按顺序阅读：

1. **Parameters**：部署时会被提示输入的参数（数据库密码等）
2. **VPC + Subnets**：创建虚拟网络和三个子网
3. **Internet Gateway + NAT Gateway**：对外通信的出口
4. **Route Tables**：流量走哪条路
5. **Security Groups**：访问控制规则
6. **RDS**：PostgreSQL 数据库实例
7. **HonoFunction**：Lambda 函数，挂载到 API Gateway HTTP API
8. **Outputs**：部署完成后打印 API 地址、RDS 地址等

### Step 5：执行 SAM 构建
`sam build` 把你的项目打包成 Lambda 可以运行的格式，放在 `.aws-sam/build/` 目录：
```powershell
sam build --config-file samconfig.toml
```

### Step 6：执行部署（会花几十分钟，主要是 RDS 启动慢）
```powershell
sam deploy --config-file samconfig.toml
```
部署过程中会被提示：
- `DBPassword [None]:`：输入数据库密码（最少8位），**不会被显示在屏幕上**
- `Deploy this changeset? [y/N]:`：如果 confirm_changeset = false 则不提示

等待过程中你会看到 CloudFormation 在逐步创建资源：
```
CREATE_IN_PROGRESS VPC
CREATE_COMPLETE    VPC
CREATE_IN_PROGRESS RDSInstance   ← 这步最慢，约 5-10 分钟
CREATE_COMPLETE    RDSInstance
...
```

### Step 7：部署完成，查看输出
部署成功后会打印 Outputs：
```
Key   ApiUrl
Value https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```
这个 URL 就是你云端的访问地址。

### Step 8：验证云端接口
打开浏览器（或用 curl）访问：
```
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/health
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/api/db-health
https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/
```
能看到正常 JSON 响应就说明部署成功了。

### Step 9：完整云端验证
1. 打开 `/`，输入 PAT，查询 GitHub 信息
2. 点击"保存到数据库"
3. 点击"查看最近记录"
4. 点击"删除最近保存"
5. 全部正常→作业第1、2、3条验收通过

### Step 10：清理资源（避免持续计费）
作业演示完后，建议删除栈（尤其是 RDS 和 NAT Gateway 会持续收费）：
```powershell
sam delete --config-file samconfig.toml
```

---

## 实际部署记录（2026-03-16）

### 本次部署结果

| 字段 | 值 |
|------|-----|
| 栈名 | hono-hw |
| 区域 | us-east-1 |
| 栈状态 | CREATE_COMPLETE |
| API 地址 | https://sa3y3cpw35.execute-api.us-east-1.amazonaws.com |
| RDS 地址 | hono-hw-db.csb2k8uoem5q.us-east-1.rds.amazonaws.com |
| Lambda 名称 | hono-hw-api |
| 数据库密码 | 部署时通过 --parameter-overrides 传入，不存档 |

### 本次创建的 AWS 资源清单

| 资源类型 | 逻辑 ID | 说明 |
|----------|---------|------|
| AWS::EC2::VPC | VPC | 整个项目的虚拟网络 |
| AWS::EC2::InternetGateway | InternetGateway | VPC 对外出口 |
| AWS::EC2::VPCGatewayAttachment | VPCGatewayAttachment | IGW 挂载到 VPC |
| AWS::EC2::Subnet | PublicSubnet | 公网子网（NAT 在此） |
| AWS::EC2::Subnet | LambdaSubnet | 私网子网（Lambda 在此） |
| AWS::EC2::Subnet | DBSubnetA | 私网子网 A（RDS 在此） |
| AWS::EC2::Subnet | DBSubnetB | 私网子网 B（RDS 多 AZ 备用） |
| AWS::EC2::EIP | NatEIP | NAT Gateway 用的弹性 IP |
| AWS::EC2::NatGateway | NatGateway | 让私网 Lambda 访问外网（GitHub API） |
| AWS::EC2::RouteTable | PublicRouteTable | 公网路由表（→ IGW） |
| AWS::EC2::RouteTable | PrivateRouteTable | 私网路由表（→ NAT） |
| AWS::EC2::Route | PublicRoute | 公网默认路由 |
| AWS::EC2::Route | PrivateRoute | 私网默认路由 |
| AWS::EC2::SubnetRouteTableAssociation | PublicSubnetRTA | 公网子网绑定路由表 |
| AWS::EC2::SubnetRouteTableAssociation | LambdaSubnetRTA | Lambda 子网绑定路由表 |
| AWS::EC2::SecurityGroup | LambdaSecurityGroup | Lambda 安全组（允许所有出站） |
| AWS::EC2::SecurityGroup | DBSecurityGroup | RDS 安全组（只允许 Lambda SG 入站 5432） |
| AWS::RDS::DBSubnetGroup | DBSubnetGroup | RDS 使用的子网组 |
| AWS::RDS::DBInstance | RDSInstance | PostgreSQL 16.4，db.t4g.micro |
| AWS::IAM::Role | HonoFunctionRole | Lambda 执行角色 |
| AWS::Lambda::Function | HonoFunction | Hono 应用 Lambda |
| AWS::ApiGatewayV2::Api | ServerlessHttpApi | HTTP API，对外暴露所有路由 |
| AWS::ApiGatewayV2::Stage | ServerlessHttpApiApiGatewayDefaultStage | API 默认阶段 |
| AWS::Lambda::Permission | HonoFunctionRootPathPermission | API Gateway 调用 Lambda 权限 |
| AWS::Lambda::Permission | HonoFunctionProxyPathPermission | API Gateway 代理路径调用 Lambda 权限 |

---

### 本次遇到的问题与修复记录

#### 问题 1：终端找不到 aws / sam 命令
- **现象**：执行 `aws` 或 `sam` 报"无法识别为可运行程序"
- **原因**：工具安装后需要重启终端才能读取新 PATH，旧终端会话没有刷新
- **修复**：在当前终端手动注入路径：
  ```powershell
  $env:Path = "C:\Program Files\Amazon\AWSCLIV2;C:\Program Files\Amazon\AWSSAMCLI\bin;$env:Path"
  ```
- **永久方案**：已写入用户环境变量，新开终端自动生效

#### 问题 2：samconfig.toml 中文注释导致 GBK 解码崩溃
- **现象**：`sam build` 报 `UnicodeDecodeError: 'gbk' codec can't decode byte 0x80`
- **原因**：Windows 默认编码 GBK 无法解析文件中的 UTF-8 中文注释字符
- **修复**：将 samconfig.toml 注释全部改成纯 ASCII 英文

#### 问题 3：infra/template.yaml 中文注释同样导致 sam deploy 崩溃
- **现象**：`sam deploy` 报 `UnicodeDecodeError: gbk codec`
- **原因**：SAM 读取原始模板文件时遇到 UTF-8 字符
- **修复**：绕过原始文件，改用 `sam build` 产出的纯 ASCII 模板部署：
  ```powershell
  sam deploy --template-file .aws-sam/build/template.yaml ...
  ```
  事后将模板注释清理为 ASCII

#### 问题 4：SAM 模板中 Lambda Policy 写法错误
- **现象**：`sam validate --lint` 报 E3031 错误，policy 不匹配 ARN 格式
- **原因**：`AWSLambdaVPCAccessExecutionPolicy` 是简写，SAM lint 要求完整 ARN
- **修复**：改为完整 ARN：
  ```yaml
  arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
  ```

#### 问题 5：PostgreSQL 版本 16.3 已废弃
- **现象**：`sam validate --lint` 报 W3691，16.3 版本不能创建新实例
- **修复**：改为 `16.4`

#### 问题 6：sam build 时 CodeUri 路径指向错误
- **现象**：`sam build` 成功但打包的是 infra/ 目录内容，找不到 dist/ 和 node_modules
- **原因**：模板文件在 infra/ 下，CodeUri 写 `.` 指向的是 infra/ 而非项目根目录
- **修复**：改为 `CodeUri: ..`，从 infra/ 回退到项目根目录

#### 问题 7：AWS region 输入错误
- **现象**：`aws login` 提示输入 region，输入了 `us-east-1f`（多打了 f），导致 STS 连接失败
- **修复**：手动修正：
  ```powershell
  aws configure set region us-east-1
  ```

---

## 4. 检查点

1. `npm run build` 通过（EXIT=0）
2. `sam validate --template infra/template.yaml --region us-east-1` 通过
3. `sam build` 完成，`.aws-sam/build/` 目录生成
4. `sam deploy` 成功，CloudFormation 栈状态为 `CREATE_COMPLETE`
5. `/health` 接口返回 `{"ok":true}`
6. `/api/db-health` 接口返回 `{"database":"connected"}`
7. 主页面 PAT 查询 + 数据增删完整流程可用

---

## 5. 常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| 部署报 `No credentials` | AWS CLI 没配置 | 执行 `aws configure` |
| RDS 创建失败 | 某些 Region 没有 `db.t4g.micro` | 换成 `db.t3.micro` |
| Lambda 超时 | VPC/NAT 路由配置错误 | 检查私网路由表是否指向 NAT |
| 数据库 refused connection | 安全组配置错误 | 确认 RDS SG 允许 Lambda SG 的 5432 |
| 页面 500 | Lambda 找不到 HTML 文件 | 确认 `npm run build` 完成后再 `sam build` |
| `EngineVersion` 报错 | PostgreSQL 版本已废弃 | 改用更新版本，如 `16.6` 或 `17.2` |

---

## 6. 成本提醒

这个作业会用到以下付费资源：
- **NAT Gateway**：约 $0.045/小时 + 流量费
- **RDS db.t4g.micro**：约 $0.016/小时
- **Lambda**：前 100 万次免费，学习阶段不用担心

**演示完后记得执行 `sam delete` 删除栈！**

---

## 7. 复盘题

1. 为什么 Lambda 不能直接放在公网子网，而要放在私网子网？
2. NAT Gateway 到底"帮"Lambda 做了什么？
3. 安全组的"入站规则"和"出站规则"分别在哪个资源上起作用？
4. 如果不用 SAM，要手动在 Console 上做同样的事情，需要点多少步？
5. `sam build` 和 `sam deploy` 各自做了什么，能直接 `sam deploy` 跳过 `sam build` 吗？
