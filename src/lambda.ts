// Lambda 入口：把 Hono app 包装成 AWS Lambda handler
// 本地开发时不用这个文件，用 src/index.ts 即可
import { handle } from "hono/aws-lambda";
import { app } from "./app.js";

export const handler = handle(app);
