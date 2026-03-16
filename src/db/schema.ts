import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const githubProfiles = pgTable("github_profiles", {
  id: serial("id").primaryKey(),
  githubId: integer("github_id").notNull(),
  login: text("login").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  name: text("name"),
  publicRepos: integer("public_repos").notNull(),
  followers: integer("followers").notNull(),
  following: integer("following").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull()
});

export type InsertGithubProfile = typeof githubProfiles.$inferInsert;
export type SelectGithubProfile = typeof githubProfiles.$inferSelect;
