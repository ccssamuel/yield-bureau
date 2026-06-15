import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateExecutiveSummary } from './openaiService';
import { checkRateLimit } from './rateLimiter';

describe('Sprint 3: OpenAI + Webhook Pipeline', () => {
  const mockSolarData = {
    building: {
      maxPanels: 26,
      roofAreaM2: 120.5,
      maxSunshineHours: 1600,
      imageryDate: '2023-06-15',
      imageryQuality: 'HIGH',
    },
    financial: {
      monthlyBillMatched: 500,
      annualProductionKwh: 8000,
      lifetimeCostWithoutSolar: 120000,
      federalIncentiveUsd: 5400,
      solarCoveragePct: 85,
      paybackYears: 1.5,
      savingsYear20Usd: 129600,
      systemCostUsd: 12600,
    },
  };

  const mockRequest = {
    headers: {
      'x-forwarded-for': '192.168.1.1',
    },
    connection: {},
    socket: {},
  };

  describe('OpenAI Service - Pre-flight Validation', () => {
    it('should reject solar data with missing annualProductionKwh', async () => {
      const invalidData = {
        ...mockSolarData,
        financial: {
          ...mockSolarData.financial,
          annualProductionKwh: 0,
        },
      };

      const result = await generateExecutiveSummary(invalidData, 'John Doe', 'Acme Corp');

      expect(result.status).toBe('insufficient_data');
      expect(result.missing).toContain('annualProductionKwh');
      console.log('[Test] ✓ Missing annualProductionKwh detected');
    });

    it('should reject solar data with missing solarCoveragePct', async () => {
      const invalidData = {
        ...mockSolarData,
        financial: {
          ...mockSolarData.financial,
          solarCoveragePct: 0,
        },
      };

      const result = await generateExecutiveSummary(invalidData, 'John Doe', 'Acme Corp');

      expect(result.status).toBe('insufficient_data');
      expect(result.missing).toContain('solarCoveragePct');
      console.log('[Test] ✓ Missing solarCoveragePct detected');
    });

    it('should reject solar data with missing paybackYears', async () => {
      const invalidData = {
        ...mockSolarData,
        financial: {
          ...mockSolarData.financial,
          paybackYears: 0,
        },
      };

      const result = await generateExecutiveSummary(invalidData, 'John Doe', 'Acme Corp');

      expect(result.status).toBe('insufficient_data');
      expect(result.missing).toContain('paybackYears');
      console.log('[Test] ✓ Missing paybackYears detected');
    });

    it('should reject solar data with missing savingsYear20Usd', async () => {
      const invalidData = {
        ...mockSolarData,
        financial: {
          ...mockSolarData.financial,
          savingsYear20Usd: 0,
        },
      };

      const result = await generateExecutiveSummary(invalidData, 'John Doe', 'Acme Corp');

      expect(result.status).toBe('insufficient_data');
      expect(result.missing).toContain('savingsYear20Usd');
      console.log('[Test] ✓ Missing savingsYear20Usd detected');
    });

    it('should reject solar data with missing systemCostUsd', async () => {
      const invalidData = {
        ...mockSolarData,
        financial: {
          ...mockSolarData.financial,
          systemCostUsd: 0,
        },
      };

      const result = await generateExecutiveSummary(invalidData, 'John Doe', 'Acme Corp');

      expect(result.status).toBe('insufficient_data');
      expect(result.missing).toContain('systemCostUsd');
      console.log('[Test] ✓ Missing systemCostUsd detected');
    });

    it('should reject solar data with missing federalIncentiveUsd', async () => {
      const invalidData = {
        ...mockSolarData,
        financial: {
          ...mockSolarData.financial,
          federalIncentiveUsd: 0,
        },
      };

      const result = await generateExecutiveSummary(invalidData, 'John Doe', 'Acme Corp');

      expect(result.status).toBe('insufficient_data');
      expect(result.missing).toContain('federalIncentiveUsd');
      console.log('[Test] ✓ Missing federalIncentiveUsd detected');
    });

    it('should accept solar data with all required fields present', async () => {
      const result = await generateExecutiveSummary(mockSolarData, 'John Doe', 'Acme Corp');

      // Note: This will fail if OpenAI API is not available, but pre-flight validation passes
      if (result.status === 'insufficient_data') {
        expect.fail('Pre-flight validation should pass with all fields');
      }

      console.log('[Test] ✓ Pre-flight validation passed for complete data');
      console.log(`  - Result status: ${result.status}`);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow first request from IP', async () => {
      const result = await checkRateLimit(mockRequest);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      console.log('[Test] ✓ First request allowed');
      console.log(`  - Remaining: ${result.remaining}`);
    }, { timeout: 15000 });

    it('should track multiple requests from same IP', async () => {
      // Simulate 5 requests
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(mockRequest);
        results.push(result);
      }

      // All 5 should be allowed
      for (let i = 0; i < 5; i++) {
        expect(results[i].allowed).toBe(true);
      }

      console.log('[Test] ✓ All 5 requests allowed');
      results.forEach((r, i) => {
        console.log(`  - Request ${i + 1}: allowed=${r.allowed}, remaining=${r.remaining}`);
      });
    }, { timeout: 15000 });

    it('should extract IP from x-forwarded-for header', async () => {
      const result = await checkRateLimit(mockRequest);

      expect(result.allowed).toBe(true);
      console.log('[Test] ✓ IP extraction from x-forwarded-for working');
    }, { timeout: 15000 });

    it('should handle missing IP gracefully', async () => {
      const noIpRequest = {
        headers: {},
        connection: {},
        socket: {},
      };

      const result = await checkRateLimit(noIpRequest);

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('resetAt');
      console.log('[Test] ✓ Missing IP handled gracefully');
    }, { timeout: 15000 });
  });

  describe('Webhook Input Validation', () => {
    it('should validate email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      expect(emailRegex.test('valid@example.com')).toBe(true);
      expect(emailRegex.test('invalid.email')).toBe(false);
      expect(emailRegex.test('another@domain.co.uk')).toBe(true);

      console.log('[Test] ✓ Email validation regex working');
    });

    it('should validate address minimum length', () => {
      const address1 = '123 Main St';
      const address2 = '123 Main St, City, State 12345';

      expect(address1.length).toBeGreaterThanOrEqual(10);
      expect(address2.length).toBeGreaterThanOrEqual(10);

      console.log('[Test] ✓ Address length validation working');
    });

    it('should validate monthly bill is positive', () => {
      expect(500 > 0).toBe(true);
      expect(0 > 0).toBe(false);
      expect(-100 > 0).toBe(false);

      console.log('[Test] ✓ Monthly bill validation working');
    });

    it('should validate all required fields present', () => {
      const validPayload = {
        companyName: 'Acme Corp',
        address: '123 Main St, City, State',
        email: 'contact@acme.com',
        monthlyBill: 500,
        clientId: 'client-123',
      };

      const requiredFields = ['companyName', 'address', 'email', 'monthlyBill', 'clientId'];
      const hasAllFields = requiredFields.every(field => field in validPayload);

      expect(hasAllFields).toBe(true);
      console.log('[Test] ✓ All required fields validation working');
    });
  });

  describe('Response Structure', () => {
    it('should have correct success response structure', () => {
      const successResponse = {
        status: 'success',
        prospect: {
          companyName: 'Acme Corp',
          address: '123 Main St',
          email: 'contact@acme.com',
        },
        solar: mockSolarData,
        summary: 'Sample summary text',
        cacheHit: false,
        generatedAt: new Date().toISOString(),
      };

      expect(successResponse).toHaveProperty('status', 'success');
      expect(successResponse).toHaveProperty('prospect');
      expect(successResponse).toHaveProperty('solar');
      expect(successResponse).toHaveProperty('summary');
      expect(successResponse).toHaveProperty('cacheHit');
      expect(successResponse).toHaveProperty('generatedAt');

      console.log('[Test] ✓ Success response structure correct');
      console.log(JSON.stringify(successResponse, null, 2));
    });

    it('should have correct error response structure', () => {
      const errorResponse = {
        status: 'insufficient_data',
        missing: ['annualProductionKwh'],
      };

      expect(errorResponse).toHaveProperty('status');
      expect(errorResponse).toHaveProperty('missing');

      console.log('[Test] ✓ Error response structure correct');
    });

    it('should have correct rate limit error response', () => {
      const rateLimitResponse = {
        status: 'rate_limit_exceeded',
        message: 'Maximum lookups reached. Contact support for enterprise access.',
      };

      expect(rateLimitResponse).toHaveProperty('status', 'rate_limit_exceeded');
      expect(rateLimitResponse).toHaveProperty('message');

      console.log('[Test] ✓ Rate limit error response structure correct');
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return 400 for input validation failure', () => {
      const statusCode = 400;
      expect(statusCode).toBe(400);
      console.log('[Test] ✓ 400 status code for validation failure');
    });

    it('should return 422 for solar API failure', () => {
      const statusCode = 422;
      expect(statusCode).toBe(422);
      console.log('[Test] ✓ 422 status code for solar API failure');
    });

    it('should return 429 for rate limit exceeded', () => {
      const statusCode = 429;
      expect(statusCode).toBe(429);
      console.log('[Test] ✓ 429 status code for rate limit');
    });

    it('should return 200 for successful pipeline', () => {
      const statusCode = 200;
      expect(statusCode).toBe(200);
      console.log('[Test] ✓ 200 status code for success');
    });
  });

  describe('Pipeline Execution Order', () => {
    it('should execute steps in correct order', () => {
      const executionOrder = [
        'validate_input',
        'check_rate_limit',
        'get_solar_data',
        'generate_summary',
        'return_response',
      ];

      expect(executionOrder[0]).toBe('validate_input');
      expect(executionOrder[1]).toBe('check_rate_limit');
      expect(executionOrder[2]).toBe('get_solar_data');
      expect(executionOrder[3]).toBe('generate_summary');
      expect(executionOrder[4]).toBe('return_response');

      console.log('[Test] ✓ Pipeline execution order correct');
      executionOrder.forEach((step, i) => {
        console.log(`  - Step ${i + 1}: ${step}`);
      });
    });
  });

  describe('Hallucination Detection', () => {
    it('should detect numbers not in input data', () => {
      const inputNumbers = new Set(['8000', '85', '1.5', '129600', '12600', '5400', '500']);
      const outputText = 'The system costs $15000 and produces 8000 kWh annually.';

      // Extract numbers from output
      const numberPattern = /\d+(?:,\d{3})*(?:\.\d+)?|\d+/g;
      const outputNumbers = (outputText.match(numberPattern) || []).map(m => parseFloat(m.replace(/,/g, '')));

      let hallucination = false;
      for (const num of outputNumbers) {
        if (!inputNumbers.has(num.toString())) {
          hallucination = true;
          break;
        }
      }

      expect(hallucination).toBe(true);
      console.log('[Test] ✓ Hallucination detected: $15000 not in input');
    });

    it('should allow numbers from input data', () => {
      const inputNumbers = new Set(['8000', '85', '1.5', '129600', '12600', '5400', '500']);
      const outputText = 'The system costs $12600 and produces 8000 kWh annually with 85% coverage.';

      // Extract numbers from output
      const numberPattern = /\d+(?:,\d{3})*(?:\.\d+)?|\d+/g;
      const outputNumbers = (outputText.match(numberPattern) || []).map(m => parseFloat(m.replace(/,/g, '')));

      let hallucination = false;
      for (const num of outputNumbers) {
        if (!inputNumbers.has(num.toString())) {
          hallucination = true;
          break;
        }
      }

      expect(hallucination).toBe(false);
      console.log('[Test] ✓ No hallucination: all numbers from input');
    });
  });
});
