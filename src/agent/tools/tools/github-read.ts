/**
 * BC Agent P4 — github.read: read-only GitHub access (§13).
 *
 * Implements ONLY metadata reads (repository, branches, commits, issues,
 * PRs, file contents). There is deliberately NO mutation code: no create/
 * edit/merge/push functions exist in this module — capability is the
 * implementation.
 *
 * Credentials: injected per executor context (`credentials.githubToken`).
 * The adapter takes NO env vars and NO global state — capability-scoped
 * (§16): it can only ever see the GitHub credential. Without a token it
 * runs unauthenticated (60 req/h GitHub limit) and states so in metadata.
 *
 * All GitHub content is UNTRUSTED DATA (§20): returned verbatim inside the
 * envelope; never parsed as instructions, never quoted into evidence claims.
 *
 * Pagination is bounded by `perPage` (≤20) and `maxPages` (≤3) — never an
 * unbounded history walk.
 */

import { z } from "zod";
import { defineTool } from "../../core/tool";
import type { ToolContext, ToolDefinition } from "../../core/tool";
import type { ToolOutputEnvelope } from "../types";
import { boundedOutput } from "./shared";
import { fetchJsonBounded, HttpToolError } from "./http";

export const GITHUB_READ_NAME = "github.read";

export const GITHUB_READ_LIMITS = {
  perPage: 20,
  maxPages: 3,
  maxBytes: 256 * 1024,
  timeoutMs: 15_000,
} as const;

export const githubReadInputSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("repo"), owner: GitHubName(), repo: GitHubName() }),
  z.object({ op: z.literal("branches"), owner: GitHubName(), repo: GitHubName(), page: z.number().int().min(1).max(GITHUB_READ_LIMITS.maxPages).default(1) }),
  z.object({ op: z.literal("commits"), owner: GitHubName(), repo: GitHubName(), sha: z.string().max(100).optional(), page: z.number().int().min(1).max(GITHUB_READ_LIMITS.maxPages).default(1) }),
  z.object({ op: z.literal("issues"), owner: GitHubName(), repo: GitHubName(), page: z.number().int().min(1).max(GITHUB_READ_LIMITS.maxPages).default(1) }),
  z.object({ op: z.literal("pulls"), owner: GitHubName(), repo: GitHubName(), page: z.number().int().min(1).max(GITHUB_READ_LIMITS.maxPages).default(1) }),
  z.object({ op: z.literal("file"), owner: GitHubName(), repo: GitHubName(), path: z.string().min(1).max(400), ref: z.string().max(100).optional() }),
]);

function GitHubName() {
  return z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/, "invalid name")
    .refine((s) => !s.startsWith(".") && !s.includes(".."), "path segments are not valid GitHub names");
}

export const githubReadOutputSchema = z.object({
  data: z.object({
    op: z.string(),
    authenticated: z.boolean(),
    items: z.array(z.record(z.unknown())),
    count: z.number().int().nonnegative(),
  }),
  bytes: z.number().int().nonnegative(),
  maxBytes: z.number().int().positive(),
  items: z.number().int().nonnegative(),
  truncated: z.boolean(),
  source: z.string(),
});

export type GithubReadInput = z.infer<typeof githubReadInputSchema>;
export type GithubReadOutput = z.infer<typeof githubReadOutputSchema>["data"];

/**
 * Field allowlist — GitHub metadata is trimmed to known-useful fields so
 * responses stay small and no unbounded payload objects are copied through.
 */
const FIELD_LIMITS: Record<string, readonly string[]> = {
  repo: ["full_name", "private", "default_branch", "html_url", "description", "pushed_at", "stargazers_count", "open_issues_count", "language"],
  branches: ["name", "commit"],
  commits: ["sha", "commit", "html_url"],
  issues: ["number", "title", "state", "html_url", "created_at", "user", "pull_request"],
  pulls: ["number", "title", "state", "html_url", "created_at", "user", "draft"],
  file: ["name", "path", "size", "type", "encoding", "content"],
};

function trimItem(op: string, item: Record<string, unknown>): Record<string, unknown> {
  const fields = FIELD_LIMITS[op];
  if (!fields) return item;
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (item[f] !== undefined) out[f] = item[f];
  }
  return out;
}

export function makeGithubReadTool(): ToolDefinition & {
  input: typeof githubReadInputSchema;
  output: typeof githubReadOutputSchema;
  run: (input: GithubReadInput, ctx: ToolContext) => Promise<ToolOutputEnvelope<GithubReadOutput>>;
} {
  return {
    ...defineTool({
      name: GITHUB_READ_NAME,
      description: "Read-only GitHub metadata: repository, branches, commits, issues, PRs, file contents. No mutation operations exist.",
      risk: "READ",
      reversible: true,
      requiresApproval: false,
      autonomyLevel: "L0",
      inputSchema: "bc.github.read.input@1",
      outputSchema: "bc.github.read.output@1",
      timeoutMs: GITHUB_READ_LIMITS.timeoutMs,
      productionImpact: "NONE",
      category: "OBSERVE",
      idempotent: false, // upstream API content can change between identical calls
    }),
    input: githubReadInputSchema,
    output: githubReadOutputSchema,
    async run(input, ctx): Promise<ToolOutputEnvelope<GithubReadOutput>> {
      const token = ctx.credentials?.githubToken;
      const headers: Record<string, string> = {
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const repo = `${input.owner}/${input.repo}`;

      let url: string;
      let op: string = input.op;
      let single = false;
      switch (input.op) {
        case "repo":
          url = `https://api.github.com/repos/${repo}`;
          single = true;
          break;
        case "branches":
          url = `https://api.github.com/repos/${repo}/branches?per_page=${GITHUB_READ_LIMITS.perPage}&page=${input.page}`;
          break;
        case "commits":
          url = `https://api.github.com/repos/${repo}/commits?per_page=${GITHUB_READ_LIMITS.perPage}&page=${input.page}${input.sha ? `&sha=${encodeURIComponent(input.sha)}` : ""}`;
          break;
        case "issues":
          url = `https://api.github.com/repos/${repo}/issues?state=all&per_page=${GITHUB_READ_LIMITS.perPage}&page=${input.page}`;
          break;
        case "pulls":
          url = `https://api.github.com/repos/${repo}/pulls?state=all&per_page=${GITHUB_READ_LIMITS.perPage}&page=${input.page}`;
          break;
        case "file":
          url = `https://api.github.com/repos/${repo}/contents/${encodePath(input.path)}${input.ref ? `?ref=${encodeURIComponent(input.ref)}` : ""}`;
          single = true;
          break;
      }

      const raw = await fetchJsonBounded({
        url,
        headers,
        timeoutMs: GITHUB_READ_LIMITS.timeoutMs,
        maxBytes: GITHUB_READ_LIMITS.maxBytes,
        toolName: GITHUB_READ_NAME,
      });

      // file op: contents API returns a single object with base64 content
      if (single && input.op === "file") {
        const obj = raw as { content?: string; encoding?: string; name?: string; path?: string; size?: number; type?: string };
        const content = obj.encoding === "base64" && typeof obj.content === "string" ? Buffer.from(obj.content, "base64").toString("utf8") : null;
        const items = [
          trimItem("file", {
            name: obj.name,
            path: obj.path,
            size: obj.size,
            type: obj.type,
            encoding: obj.encoding,
            content: content === null ? undefined : content.slice(0, 64 * 1024),
          }),
        ];
        return boundedOutput({ op, authenticated: Boolean(token), items, count: 1 }, { maxBytes: GITHUB_READ_LIMITS.maxBytes, items: 1, source: `github:${repo}` });
      }

      const list = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : [];
      const items = list.map((it) => trimItem(op, it));
      return boundedOutput(
        { op, authenticated: Boolean(token), items, count: items.length },
        { maxBytes: GITHUB_READ_LIMITS.maxBytes, items: items.length, source: `github:${repo}` }
      );
    },
  };
}

/** GitHub contents paths need per-segment encoding (slashes kept). */
function encodePath(p: string): string {
  return p.split("/").map(encodeURIComponent).join("/");
}

export { HttpToolError };
