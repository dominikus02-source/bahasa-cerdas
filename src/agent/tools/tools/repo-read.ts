/**
 * BC Agent P4 — repo.read: bounded repository filesystem reader (§12).
 *
 * Read-only BY CONSTRUCTION: this module contains no write, delete, rename,
 * chmod, or shell code — there is no code path to call. Capability is the
 * implementation, not the metadata.
 *
 * Hard guarantees:
 * - Every resolved path must stay INSIDE the repository root (configured,
 *   not derived from __dirname). Symlinks are resolved before the
 *   confinement check (symlink-escape protection).
 * - Files larger than maxBytes are rejected, not truncated at the FS level.
 * - Binary files are refused (detection via null-byte sniff of the head).
 * - Repository content is UNTRUSTED DATA (§20): returned verbatim inside
 *   the envelope; the executor's evidence layer never quotes it.
 */

import { z } from "zod";
import path from "path";
import fs from "fs";
import { defineTool } from "../../core/tool";
import type { ToolOutputEnvelope } from "../types";
import { boundedOutput } from "./shared";

export const REPO_READ_NAME = "repo.read";

/** Defaults: 1 MiB per file, 256 KiB per response. */
export const REPO_READ_DEFAULTS = {
  maxFileBytes: 1024 * 1024,
  maxResponseBytes: 256 * 1024,
} as const;

const BINARY_SNIFF_BYTES = 8000;

export const repoReadInputSchema = z.object({
  /** Repo-relative path (POSIX separators). Absolute paths are rejected. */
  path: z
    .string()
    .min(1)
    .max(512)
    .refine((p) => !p.includes("\0"), "path contains null byte")
    .refine((p) => !path.isAbsolute(p), "path must be repo-relative"),
  /** Max bytes returned for this file (bounded by tool defaults). */
  maxBytes: z.number().int().positive().max(REPO_READ_DEFAULTS.maxFileBytes).optional(),
});

export const repoReadOutputSchema = z.object({
  data: z.object({
    path: z.string(),
    content: z.string().nullable(),
    encoding: z.literal("utf8"),
    sizeBytes: z.number().int().nonnegative(),
    isBinary: z.boolean(),
  }),
  bytes: z.number().int().nonnegative(),
  maxBytes: z.number().int().positive(),
  items: z.number().int().nonnegative(),
  truncated: z.boolean(),
  source: z.string(),
});

export type RepoReadInput = z.infer<typeof repoReadInputSchema>;
export type RepoReadOutput = z.infer<typeof repoReadOutputSchema>["data"];

/** Tool factory — the repo root is injected (never implicit). */
export function makeRepoReadTool(opts: { repoRoot: string }): import("../../core/tool").ToolDefinition & {
  input: typeof repoReadInputSchema;
  output: typeof repoReadOutputSchema;
  run: (input: RepoReadInput, ctx: { taskId: string; attemptId: string; executionId: string }) => Promise<ToolOutputEnvelope<RepoReadOutput>>;
} {
  const root = path.resolve(opts.repoRoot);

  return {
    ...defineTool({
      name: REPO_READ_NAME,
      description: "Read a single file from the repository (read-only, size-bounded, path-confined).",
      risk: "READ",
      reversible: true,
      requiresApproval: false,
      autonomyLevel: "L0",
      inputSchema: "bc.repo.read.input@1",
      outputSchema: "bc.repo.read.output@1",
      timeoutMs: 10_000,
      productionImpact: "NONE",
      category: "OBSERVE",
      idempotent: true,
    }),
    input: repoReadInputSchema,
    output: repoReadOutputSchema,
    async run(input, _ctx): Promise<ToolOutputEnvelope<RepoReadOutput>> {
      const maxBytes = input.maxBytes ?? REPO_READ_DEFAULTS.maxFileBytes;

      // Resolve + confine (symlinks resolved first — escape protection).
      const candidate = path.resolve(root, input.path);
      const realCandidate = fs.existsSync(candidate) ? fs.realpathSync(candidate) : candidate;
      const realRoot = fs.realpathSync(root);
      const relative = path.relative(realRoot, realCandidate);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new ToolPathDenied(input.path);
      }

      let stat: fs.Stats;
      try {
        stat = fs.statSync(realCandidate); // follows symlinks AFTER the realpath check
      } catch {
        throw new ToolPathDenied(input.path, "not found");
      }
      if (stat.isDirectory()) {
        throw new ToolPathDenied(input.path, "directory reads are not supported; use a file path");
      }
      if (stat.size > maxBytes) {
        throw new ToolSizeError(input.path, stat.size, maxBytes);
      }

      const head = Buffer.alloc(Math.min(BINARY_SNIFF_BYTES, stat.size));
      let fd: number | null = null;
      try {
        fd = fs.openSync(realCandidate, "r");
        fs.readSync(fd, head, 0, head.length, 0);
      } finally {
        if (fd !== null) fs.closeSync(fd);
      }
      const isBinary = head.includes(0);

      const content = isBinary ? null : fs.readFileSync(realCandidate, "utf8");
      return boundedOutput(
        {
          path: input.path,
          content,
          encoding: "utf8",
          sizeBytes: stat.size,
          isBinary,
        },
        { maxBytes: REPO_READ_DEFAULTS.maxResponseBytes, items: 1, source: `repo:${input.path}` }
      );
    },
  };
}

import { ToolRejectedError } from "../errors";

class ToolPathDenied extends ToolRejectedError {
  constructor(pathName: string, reason = "outside repository root") {
    super("TOOL_PATH_DENIED", `repo.read: "${pathName.slice(0, 200)}" — ${reason}`, REPO_READ_NAME);
  }
}

class ToolSizeError extends ToolRejectedError {
  constructor(pathName: string, sizeBytes: number, maxBytes: number) {
    super("TOOL_SIZE_LIMIT", `repo.read: "${pathName.slice(0, 200)}" is ${sizeBytes} bytes (limit ${maxBytes})`, REPO_READ_NAME);
  }
}
