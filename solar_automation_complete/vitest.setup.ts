/**
 * Vitest setup file to configure mocks globally
 */
import { vi } from 'vitest';
import { mockRegistry } from './server/__mocks__/services';

// Mock environment variables
process.env.UPSTASH_REDIS_REST_URL = 'https://mock-redis.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
process.env.GOOGLE_SOLAR_API_KEY = 'mock-solar-key';
process.env.GOOGLE_MAPS_API_KEY = 'mock-maps-key';
process.env.OPENAI_API_KEY = 'mock-openai-key';
process.env.HUBSPOT_API_KEY = 'mock-hubspot-key';
process.env.POSTMARK_API_KEY = 'mock-postmark-key';
process.env.RON_ELECTRICITY_PRICE_KWH = '0.85';
process.env.RON_COST_PER_KWP = '5000';
process.env.RON_GOVERNMENT_INCENTIVE = '20000';

// Mock fetch globally for Redis/Upstash
global.fetch = vi.fn(async (url: string, options: any) => {
  // Mock Redis commands
  if (url.includes('upstash.io')) {
    const body = JSON.parse(options.body);
    const command = body[0];

    if (command === 'PING') {
      return new Response(JSON.stringify(['PONG']), { status: 200 });
    }
    if (command === 'SET') {
      return new Response(JSON.stringify(['OK']), { status: 200 });
    }
    if (command === 'GET') {
      return new Response(JSON.stringify([null]), { status: 200 });
    }
    if (command === 'DEL') {
      return new Response(JSON.stringify([1]), { status: 200 });
    }
  }

  return new Response('{}', { status: 200 });
});

// Reset mocks before each test
beforeEach(() => {
  mockRegistry.resetAll();
  vi.clearAllMocks();
});
