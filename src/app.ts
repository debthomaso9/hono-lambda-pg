import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { checkDatabaseHealth, db, ensureDatabaseReady } from "./db/client.js";
import { githubProfiles } from "./db/schema.js";

export const app = new Hono();

const pagePath = join(process.cwd(), "src", "pages", "index.html");

app.get("/", (c) => {
  const html = readFileSync(pagePath, "utf-8");
  return c.html(html);
});

app.get("/health", (c) => c.json({ ok: true, service: "hono-homework" }));

app.get("/api/db-health", async (c) => {
  await ensureDatabaseReady();
  await checkDatabaseHealth();
  return c.json({ ok: true, database: "connected" });
});

app.get("/api/records", async (c) => {
  await ensureDatabaseReady();
  const records = await db
    .select()
    .from(githubProfiles)
    .orderBy(desc(githubProfiles.id))
    .limit(20);
  return c.json({ ok: true, records });
});

app.post("/api/github/profile", async (c) => {
  let body: { token?: string } = {};
  try {
    body = await c.req.json<{ token?: string }>();
  } catch {
    body = {};
  }
  const token = body.token?.trim();

  if (!token) {
    return c.json({ ok: false, message: "token is required" }, 400);
  }

  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "hono-homework"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    return c.json(
      {
        ok: false,
        message: "GitHub API request failed",
        status: response.status,
        detail: errorText
      },
      401
    );
  }

  const user = await response.json();
  return c.json({
    ok: true,
    profile: {
      login: user.login,
      id: user.id,
      avatar_url: user.avatar_url,
      name: user.name,
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following
    }
  });
});

app.post("/api/records", async (c) => {
  await ensureDatabaseReady();

  let body: {
    githubId?: number;
    login?: string;
    avatarUrl?: string;
    name?: string | null;
    publicRepos?: number;
    followers?: number;
    following?: number;
  } = {};

  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  if (
    typeof body.githubId !== "number" ||
    typeof body.login !== "string" ||
    typeof body.avatarUrl !== "string" ||
    typeof body.publicRepos !== "number" ||
    typeof body.followers !== "number" ||
    typeof body.following !== "number"
  ) {
    return c.json({ ok: false, message: "invalid payload" }, 400);
  }

  const inserted = await db
    .insert(githubProfiles)
    .values({
      githubId: body.githubId,
      login: body.login,
      avatarUrl: body.avatarUrl,
      name: body.name ?? null,
      publicRepos: body.publicRepos,
      followers: body.followers,
      following: body.following
    })
    .returning();

  return c.json({ ok: true, record: inserted[0] }, 201);
});

app.delete("/api/records/:id", async (c) => {
  await ensureDatabaseReady();

  const id = Number(c.req.param("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ ok: false, message: "invalid id" }, 400);
  }

  const deleted = await db
    .delete(githubProfiles)
    .where(eq(githubProfiles.id, id))
    .returning();

  if (deleted.length === 0) {
    return c.json({ ok: false, message: "record not found" }, 404);
  }

  return c.json({ ok: true, record: deleted[0] });
});
