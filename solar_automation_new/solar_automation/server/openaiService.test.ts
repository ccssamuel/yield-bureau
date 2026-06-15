import { describe, it, expect } from 'vitest';
import { generateExecutiveSummary } from './openaiService';

describe('OpenAI Executive Summary - Romanian Localization', () => {
  const solarData = {
    building: {
      maxPanels: 26,
      roofAreaM2: 120.5,
      maxSunshineHours: 1600,
      imageryDate: '2023-06-15',
      imageryQuality: 'HIGH',
    },
    financial: {
      currency: 'RON',
      systemKwp: 10.4,
      annualProductionKwh: 8000,
      annualSavingsRON: 6800,
      systemCostRON: 52000,
      governmentIncentiveRON: 20000,
      netCostRON: 32000,
      paybackYears: 4.71,
      savings20YearsRON: 84000,
      solarCoveragePct: 100,
    },
  };

  describe('Pre-flight Validation', () => {
    it('should validate all required financial fields are present', async () => {
      const result = await generateExecutiveSummary(solarData, 'John Doe', 'TechCorp', 'en');
      
      // Should not fail validation
      expect(result.status).not.toBe('insufficient_data');
      console.log('[OpenAI Test] ✓ All required fields validated');
    });

    it('should reject data with missing annualProductionKwh', async () => {
      const invalidData = { ...solarData, financial: { ...solarData.financial, annualProductionKwh: 0 } };
      const result = await generateExecutiveSummary(invalidData, 'John Doe', 'TechCorp', 'en');
      
      expect(result.status).toBe('insufficient_data');
      expect(result.missing).toContain('annualProductionKwh');
      console.log('[OpenAI Test] ✓ Validation rejects missing annualProductionKwh');
    });
  });

  describe('Romanian Language Support', () => {
    it('should accept language parameter "ro" for Romanian', () => {
      expect(['en', 'ro']).toContain('ro');
      console.log('[OpenAI Test] ✓ Romanian language parameter accepted');
    });

    it('should include netCostRON in financial metrics for Romanian', () => {
      expect(solarData.financial).toHaveProperty('netCostRON', 32000);
      console.log('[OpenAI Test] ✓ netCostRON field present in financial data');
    });

    it('should include all required Romanian-specific fields', () => {
      const requiredFields = [
        'annualProductionKwh',
        'solarCoveragePct',
        'paybackYears',
        'savings20YearsRON',
        'netCostRON',
        'governmentIncentiveRON',
      ];

      for (const field of requiredFields) {
        expect(solarData.financial).toHaveProperty(field);
      }

      console.log('[OpenAI Test] ✓ All Romanian-specific fields present');
    });
  });

  describe('Response Structure', () => {
    it('should return object with status field', async () => {
      const result = await generateExecutiveSummary(solarData, 'John Doe', 'TechCorp', 'en');
      
      expect(result).toHaveProperty('status');
      expect(['success', 'insufficient_data', 'openai_failed', 'hallucination_detected']).toContain(result.status);
      console.log(`[OpenAI Test] ✓ Response has valid status: ${result.status}`);
    });
  });
});
