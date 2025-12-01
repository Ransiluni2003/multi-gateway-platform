export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 500,
  factor = 2
): Promise<T> {
  let attempt = 0;
  let lastError: any;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      const wait = delay * Math.pow(factor, attempt);
      await new Promise((res) => setTimeout(res, wait));
      attempt++;
    }
  }
  throw lastError;
}
