// 本地开发入口：读取 .env、启动 Node 服务器
// 部署到 AWS Lambda 时使用 src/lambda.ts
import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { ensureDatabaseReady } from "./db/client.js";

const port = Number(process.env.PORT ?? 3000);

ensureDatabaseReady().catch((error) => {
  console.error("Database init failed:", error);
});

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server started at http://localhost:${port}`);
});
