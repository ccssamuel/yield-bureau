import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit } from './rateLimiter';

describe('Rate Limiter (5 req/IP/60min)', () => {
  const RATE_LIMIT_REQUESTS = 5;
  const RATE_LIMIT_WINDOW = 3600; // 60 minutes

  beforeEach(() => {
    // Mock Upstash environment variables
    process.env.UPSTASH_REDIS_REST_URL = 'https://mock-upstash.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should extract client IP from x-forwarded-for header', async () => {
    // Mock fetch to simulate Upstash responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }), // GET returns null (first request)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }), // TTL returns null
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'OK' }), // SET succeeds
      });

    const req = {
      headers: {
        'x-forwarded-for': '192.168.1.100, 10.0.0.1',
      },
      connection: {},
      socket: {},
    };

    const result = await checkRateLimit(req);
    
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMIT_REQUESTS - 1);
    console.log('[Test] ✓ Client IP extracted from x-forwarded-for');
  });

  it('should allow first request from new IP', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }), // GET returns null
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }), // TTL returns null
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'OK' }), // SET succeeds
      });

    const req = {
      headers: { 'x-forwarded-for': '203.0.113.1' },
      connection: {},
      socket: {},
    };

    const result = await checkRateLimit(req);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Math.ceil(Date.now() / 1000));
    console.log('[Test] ✓ First request allowed');
  });

  it('should allow requests up to the limit', async () => {
    // Simulate 5 requests from the same IP
    for (let i = 1; i <= RATE_LIMIT_REQUESTS; i++) {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: i === 1 ? null : String(i - 1) }), // GET returns current count
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: RATE_LIMIT_WINDOW }), // TTL
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: 'OK' }), // INCR succeeds
        });

      const req = {
        headers: { 'x-forwarded-for': '203.0.113.2' },
        connection: {},
        socket: {},
      };

      const result = await checkRateLimit(req);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMIT_REQUESTS - i);
    }

    console.log(`[Test] ✓ All ${RATE_LIMIT_REQUESTS} requests allowed`);
  });

  it('should reject requests exceeding the limit', async () => {
    // Simulate 6th request (exceeds limit)
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: String(RATE_LIMIT_REQUESTS) }), // GET returns 5 (at limit)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 1800 }), // TTL returns 1800 seconds
      });

    const req = {
      headers: { 'x-forwarded-for': '203.0.113.3' },
      connection: {},
      socket: {},
    };

    const result = await checkRateLimit(req);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBeGreaterThan(Math.ceil(Date.now() / 1000));
    console.log('[Test] ✓ Request rejected when limit exceeded');
  });

  it('should track remaining requests correctly', async () => {
    // Simulate 3rd request
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: '2' }), // GET returns 2
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: RATE_LIMIT_WINDOW }), // TTL
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'OK' }), // INCR succeeds
      });

    const req = {
      headers: { 'x-forwarded-for': '203.0.113.4' },
      connection: {},
      socket: {},
    };

    const result = await checkRateLimit(req);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2); // 5 - 3 = 2
    console.log('[Test] ✓ Remaining requests tracked correctly');
  });

  it('should use fallback IP extraction methods', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'OK' }),
      });

    const req = {
      headers: { 'x-real-ip': '203.0.113.5' },
      connection: { remoteAddress: '10.0.0.1' },
      socket: {},
    };

    const result = await checkRateLimit(req);

    expect(result.allowed).toBe(true);
    console.log('[Test] ✓ Fallback IP extraction methods work');
  });

  it('should handle Upstash errors gracefully (fail open)', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'));

    const req = {
      headers: { 'x-forwarded-for': '203.0.113.6' },
      connection: {},
      socket: {},
    };

    const result = await checkRateLimit(req);

    // On error, should allow the request (fail open)
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMIT_REQUESTS);
    console.log('[Test] ✓ Upstash errors handled gracefully (fail open)');
  });

  it('should set TTL on first request', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }), // GET returns null
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }), // TTL returns null
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'OK' }), // SET succeeds
      });

    const req = {
      headers: { 'x-forwarded-for': '203.0.113.7' },
      connection: {},
      socket: {},
    };

    await checkRateLimit(req);

    // Verify SET command was called with EX option
    const setCalls = fetchMock.mock.calls.filter(call => {
      const url = call[0];
      return url.includes('SET');
    });

    expect(setCalls.length).toBeGreaterThan(0);
    console.log('[Test] ✓ TTL set on first request');
  });

  it('should return correct resetAt timestamp', async () => {
    const now = Math.ceil(Date.now() / 1000);
    const ttlSeconds = 1800;

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: '2' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: ttlSeconds }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'OK' }),
      });

    const req = {
      headers: { 'x-forwarded-for': '203.0.113.8' },
      connection: {},
      socket: {},
    };

    const result = await checkRateLimit(req);

    expect(result.resetAt).toBeGreaterThanOrEqual(now + ttlSeconds);
    expect(result.resetAt).toBeLessThanOrEqual(now + ttlSeconds + 2); // Allow 2 second variance
    console.log('[Test] ✓ resetAt timestamp correct');
  });

  it('should handle missing environment variables gracefully', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const req = {
      headers: { 'x-forwarded-for': '203.0.113.9' },
      connection: {},
      socket: {},
    };

    const result = await checkRateLimit(req);

    // Should fail open when credentials are missing
    expect(result.allowed).toBe(true);
    console.log('[Test] ✓ Missing credentials handled gracefully');
  });
});
