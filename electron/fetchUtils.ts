const DEFAULT_HEADERS = {
  'User-Agent': 'SVE-Inventory/0.2',
};

function formatFetchError(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      return `${error.message} (${cause.message})`;
    }
    return error.message;
  }
  return String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = 3,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...DEFAULT_HEADERS, ...init?.headers },
      });
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(1000 * attempt);
      }
    }
  }
  throw lastError;
}

export async function fetchJsonFromUrls<T>(
  urls: readonly string[],
  label: string,
  init?: RequestInit,
): Promise<T> {
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const response = await fetchWithRetry(url, init);
      if (!response.ok) {
        errors.push(`${url}: HTTP ${response.status}`);
        continue;
      }
      return (await response.json()) as T;
    } catch (error) {
      errors.push(`${url}: ${formatFetchError(error)}`);
    }
  }

  throw new Error(
    `${label}下载失败，请检查网络连接后重试。\n${errors.join('\n')}`,
  );
}
