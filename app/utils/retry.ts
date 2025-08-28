/**
 * Retry utility with exponential backoff for handling rate limits
 */

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
}

interface RetryError extends Error {
  lastError: Error;
  attemptsMade: number;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

const isRateLimitError = (error: any): boolean => {
  // Check for common rate limit indicators
  if (error?.status === 429) return true;
  if (error?.code === "RATE_LIMIT_EXCEEDED") return true;
  if (error?.message?.toLowerCase().includes("rate limit")) return true;
  if (error?.message?.toLowerCase().includes("quota exceeded")) return true;
  if (error?.message?.toLowerCase().includes("too many requests")) return true;
  return false;
};

const calculateDelay = (
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitter: boolean,
): number => {
  let delay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);

  if (jitter) {
    // Add random jitter to prevent thundering herd
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.min(delay, maxDelayMs);
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's not a rate limit error
      if (!isRateLimitError(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      const delay = calculateDelay(
        attempt,
        opts.baseDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier,
        opts.jitter,
      );

      console.warn(
        `Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt}/${opts.maxAttempts})`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  if (!lastError) {
    throw new Error("Unexpected error: No attempts were made");
  }

  const retryError: RetryError = new Error(
    `Failed after ${opts.maxAttempts} attempts. Last error: ${lastError.message}`,
  ) as RetryError;
  retryError.lastError = lastError;
  retryError.attemptsMade = opts.maxAttempts;
  throw retryError;
};

export const withBatchRetry = async <T>(
  items: T[],
  processFn: (item: T) => Promise<void>,
  options: RetryOptions & { batchSize?: number } = {},
): Promise<void> => {
  const { batchSize = 5, ...retryOptions } = options;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    await Promise.all(batch.map((item) => withRetry(() => processFn(item), retryOptions)));

    // Small delay between batches to avoid overwhelming the API
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
};
