export async function retry(fn, { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000 } = {}) {
  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === maxAttempts) break
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
      const jitter = delay * (0.5 + Math.random() * 0.5)
      await new Promise(resolve => setTimeout(resolve, jitter))
    }
  }
  throw lastError
}
