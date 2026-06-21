import { describe, it, expect } from 'vitest';
import { generateCacheKey } from './cache';

describe('Redis Cache Layer (Upstash)', () => {
  const testClientId = 'test-client-123';
  const testAddress = '123 Main Street, Berlin, Germany';

  it('should generate consistent SHA256 cache keys', () => {
    const key1 = generateCacheKey(testClientId, testAddress);
    const key2 = generateCacheKey(testClientId, testAddress);
    
    expect(key1).toBe(key2);
    expect(key1).toHaveLength(64);
    expect(key1).toMatch(/^[a-f0-9]{64}$/);
    
    console.log(`[Test] Generated cache key: ${key1}`);
  });

  it('should normalize addresses for cache key generation', () => {
    const key1 = generateCacheKey(testClientId, '123 Main Street, Berlin, Germany');
    const key2 = generateCacheKey(testClientId, '123 MAIN STREET, BERLIN, GERMANY');
    const key3 = generateCacheKey(testClientId, '  123 Main Street, Berlin, Germany  ');
    
    expect(key1).toBe(key2);
    expect(key1).toBe(key3);
    
    console.log('[Test] Address normalization working correctly');
  });

  it('should generate different keys for different addresses', () => {
    const key1 = generateCacheKey(testClientId, 'Address 1');
    const key2 = generateCacheKey(testClientId, 'Address 2');
    
    expect(key1).not.toBe(key2);
    console.log('[Test] Different addresses generate different keys');
  });

  it('should generate different keys for different client IDs', () => {
    const key1 = generateCacheKey('client-1', testAddress);
    const key2 = generateCacheKey('client-2', testAddress);
    
    expect(key1).not.toBe(key2);
    console.log('[Test] Different client IDs generate different keys');
  });

  it('should handle special characters in addresses', () => {
    const specialAddress = '123 Main St. #456, Berlin, Germany (Apt. 5)';
    const key = generateCacheKey(testClientId, specialAddress);
    
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    console.log('[Test] Special characters handled correctly');
  });

  it('should handle empty strings', () => {
    const key = generateCacheKey(testClientId, '');
    
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    console.log('[Test] Empty address handled correctly');
  });

  it('should handle unicode characters', () => {
    const unicodeAddress = '123 Straße, München, Deutschland';
    const key = generateCacheKey(testClientId, unicodeAddress);
    
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    console.log('[Test] Unicode characters handled correctly');
  });

  it('should be deterministic', () => {
    const iterations = 100;
    const keys = [];
    
    for (let i = 0; i < iterations; i++) {
      keys.push(generateCacheKey(testClientId, testAddress));
    }
    
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(1);
    console.log(`[Test] Deterministic: ${iterations} iterations produced 1 unique key`);
  });
});
