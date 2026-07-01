/**
 * Prisma query timeout helper.
 *
 * Wraps a Prisma query promise with a timeout.
 * If the query exceeds the timeout, rejects with a user-friendly message.
 * Does NOT abort the underlying query (Prisma has no native timeout),
 * but prevents the request from hanging indefinitely.
 */

export async function withQueryTimeout<T>(
  promise: Promise<T>,
  ms: number = 10000,
  context: string = "Database query"
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Data terlalu lama dimuat. Silakan coba lagi. (${context})`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]);
}
