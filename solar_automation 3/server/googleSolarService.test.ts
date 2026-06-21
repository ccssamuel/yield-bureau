import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { calculateRomanianFinancials, SolarPotential } from './googleSolarService';
import { clearCachedAddress } from './cache';
import fs from 'fs/promises';
import path from 'path';

// Load fixture
const fixtureData = JSON.parse(
  require('fs').readFileSync(path.join(__dirname, 'fixtures/solarApiResponse.json'), 'utf-8')
);

describe('Google Solar API Service', () => {
  const testClientId = 'test-client-123';
  const testAddress = 'Cluj-Napoca, Romania';

  beforeEach(async () => {
    // Clear cache before each test
    await clearCachedAddress(testClientId, testAddress);
  });

  afterAll(async () => {
    // Cleanup
    try {
      await clearCachedAddress(testClientId, testAddress);
    } catch (e) {
      // Ignore cleanup errors
    }
  }, { timeout: 30000 });

  describe('Fixture Structure', () => {
    it('should have correct solarPotential structure with solarPanelConfigs array', () => {
      const potential = fixtureData.solarPotential;

      expect(potential).toBeDefined();
      expect(potential.maxArrayPanelsCount).toBe(86);
      expect(potential.maxSunshineHoursPerYear).toBe(1233.8673);
      expect(potential.wholeRoofStats.areaMeters2).toBe(291.26123);
      expect(Array.isArray(potential.solarPanelConfigs)).toBe(true);
      expect(potential.solarPanelConfigs.length).toBeGreaterThan(0);

      console.log('[Test] ✓ Fixture has correct structure');
    });

    it('should have solarPanelConfigs with panelsCount matching maxArrayPanelsCount', () => {
      const potential = fixtureData.solarPotential;
      const maxConfig = potential.solarPanelConfigs.find(
        c => c.panelsCount === potential.maxArrayPanelsCount
      );

      expect(maxConfig).toBeDefined();
      expect(maxConfig?.panelsCount).toBe(86);
      expect(maxConfig?.yearlyEnergyDcKwh).toBe(40687.145);

      console.log('[Test] ✓ Max panel config found with correct energy value');
    });

    it('should have HIGH imagery quality', () => {
      expect(fixtureData.imageryQuality).toBe('HIGH');
      console.log('[Test] ✓ Imagery quality is HIGH');
    }, { timeout: 5000 });
  });

  describe('Romanian Financial Calculations', () => {
    it('should calculate financials correctly for 86 panels (40687 kWh annual)', () => {
      const potential = fixtureData.solarPotential as SolarPotential;
      const monthlyBillRON = 500;

      const result = calculateRomanianFinancials(potential, monthlyBillRON);

      expect(result.currency).toBe('RON');
      expect(result.systemKwp).toBe(34.4); // 86 * 0.4
      expect(result.annualProductionKwh).toBe(40687); // From fixture
      expect(result.annualSavingsRON).toBe(34584); // 40687 * 0.85
      expect(result.systemCostRON).toBe(172000); // 34.4 * 5000
      expect(result.governmentIncentiveRON).toBe(20000);
      expect(result.netCostRON).toBe(152000); // 172000 - 20000
      expect(result.paybackYears).toBeCloseTo(4.4, 1); // 152000 / 34584
      expect(result.solarCoveragePct).toBe(100); // Capped at 100%

      console.log('[Test] ✓ Financial calculations correct for 86 panels');
    });

    it('should calculate financials with different monthly bill amounts', () => {
      const potential = fixtureData.solarPotential as SolarPotential;

      // Test with 250 RON monthly bill
      const result250 = calculateRomanianFinancials(potential, 250);
      expect(result250.annualSavingsRON).toBe(34584);
      expect(result250.solarCoveragePct).toBe(100);

      // Test with 1000 RON monthly bill (solar coverage still capped at 100%)
      const result1000 = calculateRomanianFinancials(potential, 1000);
      expect(result1000.annualSavingsRON).toBe(34584);
      expect(result1000.solarCoveragePct).toBeLessThanOrEqual(100);

      console.log('[Test] ✓ Financial calculations scale correctly with bill amounts');
    });

    it('should throw error if solarPanelConfigs is empty', () => {
      const invalidPotential: SolarPotential = {
        maxArrayPanelsCount: 86,
        maxSunshineHoursPerYear: 1233.8673,
        wholeRoofStats: { areaMeters2: 291.26123 },
        solarPanelConfigs: [], // Empty array
      };

      expect(() => calculateRomanianFinancials(invalidPotential, 500)).toThrow(
        'Cannot calculate financials: no valid yearlyEnergyDcKwh found in solarPanelConfigs'
      );

      console.log('[Test] ✓ Error thrown for empty solarPanelConfigs');
    });

    it('should throw error if solarPanelConfigs is missing', () => {
      const invalidPotential = {
        maxArrayPanelsCount: 86,
        maxSunshineHoursPerYear: 1233.8673,
        wholeRoofStats: { areaMeters2: 291.26123 },
        // solarPanelConfigs missing
      } as any;

      expect(() => calculateRomanianFinancials(invalidPotential, 500)).toThrow(
        'Cannot calculate financials: no valid yearlyEnergyDcKwh found in solarPanelConfigs'
      );

      console.log('[Test] ✓ Error thrown for missing solarPanelConfigs');
    });
  });

  describe('Fixture Validation', () => {
    it('should have all required fields for successful validation', () => {
      const potential = fixtureData.solarPotential;

      // Check all required fields
      expect(potential.maxArrayPanelsCount).toBeGreaterThan(0);
      expect(potential.maxSunshineHoursPerYear).toBeGreaterThan(0);
      expect(potential.wholeRoofStats.areaMeters2).toBeGreaterThan(0);

      // Check solarPanelConfigs has entries
      const maxConfig = potential.solarPanelConfigs.find(
        c => c.panelsCount === potential.maxArrayPanelsCount
      );
      expect(maxConfig?.yearlyEnergyDcKwh).toBeGreaterThan(0);

      // Check imagery quality
      expect(fixtureData.imageryQuality).toMatch(/HIGH|MEDIUM/);

      console.log('[Test] ✓ Fixture passes all validation checks');
    });
  });

  describe('Panel Config Selection', () => {
    it('should select the correct panel config for max array size', () => {
      const potential = fixtureData.solarPotential as SolarPotential;

      const maxConfig = potential.solarPanelConfigs.find(
        c => c.panelsCount === potential.maxArrayPanelsCount
      );

      expect(maxConfig).toBeDefined();
      expect(maxConfig?.panelsCount).toBe(86);
      expect(maxConfig?.yearlyEnergyDcKwh).toBe(40687.145);

      console.log('[Test] ✓ Correct panel config selected for max array');
    });

    it('should fallback to last config if exact match not found', () => {
      const potential: SolarPotential = {
        maxArrayPanelsCount: 100, // Not in configs
        maxSunshineHoursPerYear: 1233.8673,
        wholeRoofStats: { areaMeters2: 291.26123 },
        solarPanelConfigs: [
          { panelsCount: 1, yearlyEnergyDcKwh: 499.538 },
          { panelsCount: 50, yearlyEnergyDcKwh: 24035.396 },
          { panelsCount: 86, yearlyEnergyDcKwh: 40687.145 },
        ],
      };

      const maxConfig =
        potential.solarPanelConfigs.find(c => c.panelsCount === potential.maxArrayPanelsCount) ||
        potential.solarPanelConfigs[potential.solarPanelConfigs.length - 1];

      expect(maxConfig?.panelsCount).toBe(86);
      expect(maxConfig?.yearlyEnergyDcKwh).toBe(40687.145);

      console.log('[Test] ✓ Fallback to last config works correctly');
    });
  });
});
