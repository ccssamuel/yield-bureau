const RATE_LIMIT_REQUESTS = 5;
const RATE_LIMIT_WINDOW = 3600; // 60 minutes in seconds

/**
 * Get client IP from request
 */
function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/**
 * Make a request to Upstash Redis REST API
 */
async function upstashRequest(command: string[]): Promise<any> {
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Upstash credentials not configured');
  }

  try {
    const encodedCommand = command.map(arg => encodeURIComponent(arg)).join('/');
    const url = `${UPSTASH_URL}/${encodedCommand}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upstash API error: ${response.status} - ${error}`);
    }

    const result = await response.json();
    return result.result;
  } catch (error) {
    console.error('[RateLimit] Upstash request failed:', error);
    throw error;
  }
}

/**
 * Check rate limit for an IP
 * Returns: { allowed: boolean, remaining: number, resetAt: number }
 */
export async function checkRateLimit(req: any): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const clientIp = getClientIp(req);
  const key = `rate-limit:${clientIp}`;

  try {
    console.log(`[RateLimit] Checking: ${clientIp}`);

    // Get current count
    const currentStr = await upstashRequest(['GET', key]);
    const current = currentStr ? parseInt(currentStr) : 0;

    // Get TTL
    let ttlSeconds = 0;
    try {
      const ttl = await upstashRequest(['TTL', key]);
      ttlSeconds = ttl ? parseInt(ttl) : 0;
    } catch (e) {
      ttlSeconds = RATE_LIMIT_WINDOW;
    }

    if (current >= RATE_LIMIT_REQUESTS) {
      const resetAt = ttlSeconds > 0 ? Math.ceil(Date.now() / 1000) + ttlSeconds : Math.ceil(Date.now() / 1000) + RATE_LIMIT_WINDOW;
      console.log(`[RateLimit] ✗ LIMIT EXCEEDED: ${clientIp} (${current}/${RATE_LIMIT_REQUESTS})`);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Increment counter
    if (current === 0) {
      // First request, set with TTL
      try {
        await upstashRequest(['SET', key, '1', 'EX', RATE_LIMIT_WINDOW.toString()]);
      } catch (e) {
        console.warn('[RateLimit] Failed to set counter, allowing request');
      }
      console.log(`[RateLimit] ✓ ALLOWED: ${clientIp} (1/${RATE_LIMIT_REQUESTS})`);
      return {
        allowed: true,
        remaining: RATE_LIMIT_REQUESTS - 1,
        resetAt: Math.ceil(Date.now() / 1000) + RATE_LIMIT_WINDOW,
      };
    } else {
      // Increment existing counter
      try {
        await upstashRequest(['INCR', key]);
      } catch (e) {
        console.warn('[RateLimit] Failed to increment counter, allowing request');
      }
      const newCount = current + 1;
      console.log(`[RateLimit] ✓ ALLOWED: ${clientIp} (${newCount}/${RATE_LIMIT_REQUESTS})`);
      const resetAt = ttlSeconds > 0 ? Math.ceil(Date.now() / 1000) + ttlSeconds : Math.ceil(Date.now() / 1000) + RATE_LIMIT_WINDOW;
      return {
        allowed: true,
        remaining: RATE_LIMIT_REQUESTS - newCount,
        resetAt,
      };
    }
  } catch (error) {
    console.error('[RateLimit] Error checking rate limit:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: RATE_LIMIT_REQUESTS,
      resetAt: Math.ceil(Date.now() / 1000) + RATE_LIMIT_WINDOW,
    };
  }
}

export { upstashRequest };
