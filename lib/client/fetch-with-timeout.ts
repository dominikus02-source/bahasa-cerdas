/**
 * Browser fetch for data that controls an initial loading screen.
 *
 * A 15 second ceiling is deliberately generous for school/mobile networks,
 * while ensuring a dropped connection cannot leave a route in a permanent
 * loading state. Callers still own their success, empty, and error UI.
 */
export const INITIAL_FETCH_TIMEOUT_MS = 15_000;

export class FetchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "FetchTimeoutError";
  }
}

/**
 * Gives SDK calls that do not accept AbortSignal the same terminal-state
 * guarantee as browser fetch. The underlying SDK operation may finish later,
 * but the caller is no longer allowed to keep a loading UI open for it.
 */
export function settleWithTimeout<T>(operation: Promise<T>, timeoutMs = INITIAL_FETCH_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new FetchTimeoutError(timeoutMs)), timeoutMs);
    operation.then(resolve, reject).finally(() => clearTimeout(timeoutId));
  });
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = INITIAL_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromCaller = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abortFromCaller();
  else init.signal?.addEventListener("abort", abortFromCaller, { once: true });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new FetchTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener("abort", abortFromCaller);
  }
}
