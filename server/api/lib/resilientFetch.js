function defaultShouldRetryStatus(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isAbortError(error) {
  return (
    !!error &&
    (error.name === "AbortError" ||
      /aborted|abort|timed out|timeout/i.test(String(error.message || "")))
  );
}

function isRetryableNetworkError(error) {
  if (!error) return false;
  if (isAbortError(error)) return true;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("socket") ||
    msg.includes("econnreset") ||
    msg.includes("failed to fetch")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resilientFetch(
  url,
  init = {},
  {
    timeoutMs = 8000,
    maxAttempts = 3,
    retryDelayMs = [0, 300, 900],
    shouldRetryStatus = defaultShouldRetryStatus,
    fetchImpl = fetch,
    sleepImpl = sleep,
  } = {},
) {
  let lastError = null;
  /** @type {Response|null} */
  let lastResponse = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const delay = retryDelayMs[Math.min(attempt - 1, retryDelayMs.length - 1)];
    if (delay > 0) await sleepImpl(delay);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        ...init,
        signal: controller.signal,
      });
      lastResponse = response;

      if (
        response.ok ||
        attempt >= maxAttempts ||
        !shouldRetryStatus(response.status)
      ) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableNetworkError(error)) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error("resilientFetch failed without details");
}

