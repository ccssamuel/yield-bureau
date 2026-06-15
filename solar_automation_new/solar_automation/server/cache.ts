import crypto from 'crypto';

/**
 * Upstash Redis REST API client
 * Uses HTTP REST API for serverless compatibility
 * API Reference: https://upstash.com/docs/redis/features/rest-api
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.warn('[Cache] Upstash credentials not configured. Cache will be disabled.');
}

/**
 * Make a request to Upstash Redis REST API
 * Uses the /exec endpoint with command array format
 */
async function upstashRequest(command: string[]): Promise<any> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Upstash credentials not configured');
  }

  try {
    // Construct the REST endpoint URL with command
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
    console.error('[Cache] Upstash request failed:', error);
    throw error;
  }
}

/**
 * Generate cache key: SHA256(client_id + normalized_address)
 */
export function generateCacheKey(clientId: string, address: string): string {
  const normalized = `${clientId}:${address.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Cache address qualification result
 * TTL: 86400 seconds (24 hours)
 */
export async function cacheAddress(
  clientId: string,
  address: string,
  data: any
): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn('[Cache] Cache disabled - Upstash not configured');
    return false;
  }

  try {
    const key = generateCacheKey(clientId, address);
    const ttl = 86400; // 24 hours
    const value = JSON.stringify(data);

    // Use SET with EX (expire) option
    await upstashRequest(['SET', key, value, 'EX', ttl.toString()]);
    console.log(`[Cache] ✓ WRITE: ${key} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error('[Cache] Failed to cache address:', error);
    return false;
  }
}

/**
 * Retrieve cached address qualification
 */
export async function getCachedAddress(
  clientId: string,
  address: string
): Promise<any | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn('[Cache] Cache disabled - Upstash not configured');
    return null;
  }

  try {
    const key = generateCacheKey(clientId, address);
    const result = await upstashRequest(['GET', key]);

    if (result) {
      console.log(`[Cache] ✓ HIT: ${key}`);
      return JSON.parse(result);
    } else {
      console.log(`[Cache] ✗ MISS: ${key}`);
      return null;
    }
  } catch (error) {
    console.error('[Cache] Failed to retrieve cached address:', error);
    return null;
  }
}

/**
 * Clear cache entry
 */
export async function clearCachedAddress(
  clientId: string,
  address: string
): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn('[Cache] Cache disabled - Upstash not configured');
    return false;
  }

  try {
    const key = generateCacheKey(clientId, address);
    await upstashRequest(['DEL', key]);
    console.log(`[Cache] ✓ DELETE: ${key}`);
    return true;
  } catch (error) {
    console.error('[Cache] Failed to clear cache:', error);
    return false;
  }
}

/**
 * Health check - verify Redis connection
 */
export async function healthCheck(): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn('[Cache] Health check skipped - Upstash not configured');
    return false;
  }

  try {
    const result = await upstashRequest(['PING']);
    console.log('[Cache] ✓ PING:', result);
    return result === 'PONG';
  } catch (error) {
    console.error('[Cache] Health check failed:', error);
    return false;
  }
}
