/**
 * BC Agent runtime capability protocol.
 *
 * AgentWorker.version is an informational build string in the P7 schema.
 * P9 uses a stable protocol prefix inside that string so the web control
 * plane can refuse commands that require capabilities an older worker does
 * not have. This prevents a stale-but-healthy worker from claiming a P9
 * diagnostic task and silently producing an incomplete result.
 */

export const BC_AGENT_RUNTIME_PROTOCOL = "p9-read-diagnostics-v1";

export function formatAgentWorkerVersion(buildVersion: string): string {
  const build = buildVersion.trim().slice(0, 120) || "unknown";
  return `${BC_AGENT_RUNTIME_PROTOCOL}@${build}`;
}

export function supportsAgentRuntimeProtocol(version: string | null | undefined): boolean {
  return typeof version === "string" && version.startsWith(`${BC_AGENT_RUNTIME_PROTOCOL}@`);
}
