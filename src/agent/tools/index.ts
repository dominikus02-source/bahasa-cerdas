/**
 * BC Agent P4 — tool system barrel.
 *
 * Public surface: registry, executor, evidence factories, the four
 * read-only tools, and `makeP4Registry` (default wiring).
 */

export * from "./types";
export * from "./errors";
export { ToolRegistry } from "./registry";
export { ToolExecutor, type ToolProposal, type ToolExecutorDeps } from "./executor";
export { withDeadline, type DeadlineResult } from "./timeout";
export { redactMeta } from "./sanitize";
export {
  makeEvidence,
  factFromToolOutput,
  inference,
  recommendation,
  unknownEvidence,
} from "./evidence";
export { boundedOutput } from "./tools/shared";
export { fetchJsonBounded, HttpToolError, type HttpFailureKind } from "./tools/http";
export {
  REPO_READ_NAME,
  REPO_READ_DEFAULTS,
  makeRepoReadTool,
  repoReadInputSchema,
  repoReadOutputSchema,
  type RepoReadInput,
  type RepoReadOutput,
} from "./tools/repo-read";
export {
  GITHUB_READ_NAME,
  GITHUB_READ_LIMITS,
  makeGithubReadTool,
  githubReadInputSchema,
  githubReadOutputSchema,
  type GithubReadInput,
  type GithubReadOutput,
} from "./tools/github-read";
export {
  VERCEL_READ_NAME,
  VERCEL_READ_LIMITS,
  makeVercelReadTool,
  vercelReadInputSchema,
  vercelReadOutputSchema,
  type VercelReadInput,
  type VercelReadOutput,
} from "./tools/vercel-read";
export {
  SUPABASE_READ_NAME,
  SUPABASE_READ_LIMITS,
  makeSupabaseReadTool,
  supabaseReadInputSchema,
  supabaseReadOutputSchema,
  type SupabaseReadInput,
  type SupabaseReadOutput,
} from "./tools/supabase-read";

import type { PrismaClient } from "@prisma/client";
import { ToolRegistry } from "./registry";
import { ToolExecutor } from "./executor";
import { makeRepoReadTool } from "./tools/repo-read";
import { makeGithubReadTool } from "./tools/github-read";
import { makeVercelReadTool } from "./tools/vercel-read";
import { makeSupabaseReadTool } from "./tools/supabase-read";

/**
 * Default P4 wiring: a registry containing the four read-only tools.
 * `repoRoot` is required and explicit; the Prisma client for supabase.read
 * is injected. Callers that want a subset can build their own registry.
 */
export function makeP4Registry(opts: { repoRoot: string; prisma?: PrismaClient }): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(makeRepoReadTool({ repoRoot: opts.repoRoot }));
  registry.register(makeGithubReadTool());
  registry.register(makeVercelReadTool());
  if (opts.prisma) registry.register(makeSupabaseReadTool({ prisma: opts.prisma }));
  return registry;
}

export { ToolExecutor as default };
