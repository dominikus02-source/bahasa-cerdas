export async function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error("Database timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}
