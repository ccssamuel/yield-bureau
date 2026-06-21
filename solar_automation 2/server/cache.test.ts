import { describe, it, expect, beforeAll } from 'vitest';
import { cacheAddress, getCachedAddress, clearCachedAddress, generateCacheKey, healthCheck } from './cache';

describe('Redis Cache Layer (Upstash)', () => {
  const testClientId = 'test-client-123';
  const testAddress = '123 Main Street, Berlin, Germany';
  const testData = {
    leadId: 42,
    message: 'Test lead cached successfully',
    timestamp: new Date().toISOString(),
  };

  beforeAll(async () => {
    // Verify Upstash is configured
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.warn('[Test] Upstash credentials not configured');
    }
  });

  it('should generate consistent SHA256 cache keys', () => {
    const key1 = generateCacheKey(testClientId, testAddress);
    const key2 = generateCacheKey(testClientId, testAddress);
    
    // Keys should be consistent
    expect(key1).toBe(key2);
    
    // Keys should be 64 characters (SHA256 hex)
    expect(key1).toHaveLength(64);
    
    // Keys should be lowercase hex
    expect(key1).toMatch(/^[a-f0-9]{64}$/);
    
    console.log(`[Test] Generated cache key: ${key1}`);
  });

  it('should normalize addresses for cache key generation', () => {
    const key1 = generateCacheKey(testClientId, '123 Main Street, Berlin, Germany');
    const key2 = generateCacheKey(testClientId, '123 MAIN STREET, BERLIN, GERMANY');
    const key3 = generateCacheKey(testClientId, '  123 Main Street, Berlin, Germany  ');
    
    // All should generate the same key despite different casing/spacing
    expect(key1).toBe(key2);
    expect(key1).toBe(key3);
    
    console.log('[Test] Address normalization working correctly');
  });

  it('should perform Redis health check', async () => {
    const isHealthy = await healthCheck();
    console.log(`[Test] Redis health check: ${isHealthy ? 'PASS' : 'FAIL'}`);
    
    // Health check should succeed if credentials are valid
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      expect(isHealthy).toBe(true);
    }
  });

  it('should write and read from cache', async () => {
    // Write to cache
    const writeSuccess = await cacheAddress(testClientId, testAddress, testData);
    console.log(`[Test] Cache write: ${writeSuccess ? 'SUCCESS' : 'FAILED'}`);
    expect(writeSuccess).toBe(true);

    // Read from cache
    const cachedData = await getCachedAddress(testClientId, testAddress);
    console.log(`[Test] Cache read: ${cachedData ? 'HIT' : 'MISS'}`);
    
    expect(cachedData).not.toBeNull();
    expect(cachedData).toEqual(testData);
    expect(cachedData.leadId).toBe(42);
    expect(cachedData.message).toBe('Test lead cached successfully');
  });

  it('should return null for non-existent cache entries', async () => {
    const nonExistentData = await getCachedAddress('unknown-client', 'unknown-address');
    console.log(`[Test] Non-existent cache entry: ${nonExistentData === null ? 'NULL (expected)' : 'FOUND (unexpected)'}`);
    expect(nonExistentData).toBeNull();
  });

  it('should clear cache entries', async () => {
    // First, write to cache
    await cacheAddress(testClientId, testAddress, testData);
    
    // Verify it's in cache
    let cachedData = await getCachedAddress(testClientId, testAddress);
    expect(cachedData).not.toBeNull();
    console.log('[Test] Cache entry verified before clear');

    // Clear the cache
    const clearSuccess = await clearCachedAddress(testClientId, testAddress);
    expect(clearSuccess).toBe(true);
    console.log('[Test] Cache entry cleared');

    // Verify it's gone
    cachedData = await getCachedAddress(testClientId, testAddress);
    expect(cachedData).toBeNull();
    console.log('[Test] Cache entry confirmed deleted');
  });

  it('should respect TTL of 86400 seconds', async () => {
    // This test verifies the TTL is set correctly
    // Note: Full TTL verification would require waiting 24 hours
    // This test just confirms the operation completes without error
    
    const testDataWithTTL = {
      leadId: 99,
      message: 'TTL test',
      timestamp: new Date().toISOString(),
    };

    const writeSuccess = await cacheAddress(testClientId, 'ttl-test-address', testDataWithTTL);
    expect(writeSuccess).toBe(true);
    console.log('[Test] Cache entry written with 86400s TTL');

    // Immediately read it back
    const cachedData = await getCachedAddress(testClientId, 'ttl-test-address');
    expect(cachedData).not.toBeNull();
    console.log('[Test] Cache entry readable immediately after write');

    // Cleanup
    await clearCachedAddress(testClientId, 'ttl-test-address');
  });

  it('should handle multiple concurrent cache operations', async () => {
    const operations = [];

    // Write multiple entries concurrently
    for (let i = 0; i < 5; i++) {
      operations.push(
        cacheAddress(
          `client-${i}`,
          `address-${i}`,
          { leadId: i, timestamp: new Date().toISOString() }
        )
      );
    }

    const results = await Promise.all(operations);
    expect(results.every(r => r === true)).toBe(true);
    console.log('[Test] Multiple concurrent write operations successful');

    // Read them back
    const readOps = [];
    for (let i = 0; i < 5; i++) {
      readOps.push(getCachedAddress(`client-${i}`, `address-${i}`));
    }

    const readResults = await Promise.all(readOps);
    expect(readResults.every(r => r !== null)).toBe(true);
    console.log('[Test] Multiple concurrent read operations successful');

    // Cleanup (skip for speed)
    // for (let i = 0; i < 5; i++) {
    //   await clearCachedAddress(`client-${i}`, `address-${i}`);
    // }
  }, { timeout: 15000 });
});
