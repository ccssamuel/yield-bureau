import { describe, it, expect } from 'vitest';
import { calculateRomanianFinancials } from './googleSolarService';

describe('Romanian Financial Calculations', () => {
  // Test data: Standard Romanian residential property
  const standardSolarData = {
    maxArrayPanelsCount: 26,
    maxSunshineHoursPerYear: 1600,
    yearlyEnergyDcKwh: 8000,
    yearlyEnergyAcKwh: 7600,
    wholeRoofStats: {
      areaMeters2: 120.5,
    },
  };

  const monthlyBillRON = 500;

  describe('Calculation 1: System Size (kWp)', () => {
    it('should calculate system size correctly: panels * 0.4', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // 26 panels * 0.4 = 10.4 kWp
      expect(result.systemKwp).toBe(10.4);
      console.log('[Test] ✓ System size: 26 panels * 0.4 = 10.4 kWp');
    });

    it('should handle different panel counts', () => {
      const data = { ...standardSolarData, maxArrayPanelsCount: 50 };
      const result = calculateRomanianFinancials(data, monthlyBillRON);

      // 50 panels * 0.4 = 20 kWp
      expect(result.systemKwp).toBe(20);
      console.log('[Test] ✓ System size: 50 panels * 0.4 = 20 kWp');
    });
  });

  describe('Calculation 2: Annual Savings (RON)', () => {
    it('should calculate annual savings: production * price per kWh', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // 8000 kWh * 0.85 RON/kWh = 6800 RON
      expect(result.annualSavingsRON).toBe(6800);
      console.log('[Test] ✓ Annual savings: 8000 kWh * 0.85 RON/kWh = 6800 RON');
    });

    it('should handle different production amounts', () => {
      const data = { ...standardSolarData, yearlyEnergyDcKwh: 10000 };
      const result = calculateRomanianFinancials(data, monthlyBillRON);

      // 10000 kWh * 0.85 RON/kWh = 8500 RON
      expect(result.annualSavingsRON).toBe(8500);
      console.log('[Test] ✓ Annual savings: 10000 kWh * 0.85 RON/kWh = 8500 RON');
    });
  });

  describe('Calculation 3: System Cost (RON)', () => {
    it('should calculate system cost: kWp * cost per kWp', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // 10.4 kWp * 5000 RON/kWp = 52000 RON
      expect(result.systemCostRON).toBe(52000);
      console.log('[Test] ✓ System cost: 10.4 kWp * 5000 RON/kWp = 52000 RON');
    });

    it('should handle different system sizes', () => {
      const data = { ...standardSolarData, maxArrayPanelsCount: 40 };
      const result = calculateRomanianFinancials(data, monthlyBillRON);

      // 40 panels * 0.4 = 16 kWp
      // 16 kWp * 5000 RON/kWp = 80000 RON
      expect(result.systemCostRON).toBe(80000);
      console.log('[Test] ✓ System cost: 16 kWp * 5000 RON/kWp = 80000 RON');
    });
  });

  describe('Calculation 4: Net Cost After Incentive (RON)', () => {
    it('should calculate net cost: system cost - government incentive', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // 52000 RON - 20000 RON = 32000 RON
      expect(result.netCostRON).toBe(32000);
      expect(result.governmentIncentiveRON).toBe(20000);
      console.log('[Test] ✓ Net cost: 52000 RON - 20000 RON = 32000 RON');
    });

    it('should handle cases where incentive exceeds system cost', () => {
      const data = { ...standardSolarData, maxArrayPanelsCount: 10 };
      const result = calculateRomanianFinancials(data, monthlyBillRON);

      // 10 panels * 0.4 = 4 kWp
      // 4 kWp * 5000 = 20000 RON
      // 20000 - 20000 = 0 RON (net cost is zero)
      expect(result.netCostRON).toBe(0);
      console.log('[Test] ✓ Net cost: 20000 RON - 20000 RON = 0 RON');
    });
  });

  describe('Calculation 5: Payback Period (Years)', () => {
    it('should calculate payback: net cost / annual savings', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // 32000 RON / 6800 RON/year = 4.7 years
      expect(result.paybackYears).toBe(4.71);
      console.log('[Test] ✓ Payback period: 32000 RON / 6800 RON/year = 4.71 years');
    });

    it('should handle fast payback scenarios', () => {
      const data = { ...standardSolarData, yearlyEnergyDcKwh: 15000 };
      const result = calculateRomanianFinancials(data, monthlyBillRON);

      // 15000 kWh * 0.85 = 12750 RON/year
      // 32000 RON / 12750 RON/year = 2.51 years
      expect(result.paybackYears).toBe(2.51);
      console.log('[Test] ✓ Payback period: 32000 RON / 12750 RON/year = 2.51 years');
    });
  });

  describe('Calculation 6: 20-Year Savings (RON)', () => {
    it('should calculate 20-year savings: (annual * 20) - system cost', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // (6800 RON/year * 20) - 52000 RON = 136000 - 52000 = 84000 RON
      expect(result.savings20YearsRON).toBe(84000);
      console.log('[Test] ✓ 20-year savings: (6800 * 20) - 52000 = 84000 RON');
    });

    it('should handle high production scenarios', () => {
      const data = { ...standardSolarData, yearlyEnergyDcKwh: 12000 };
      const result = calculateRomanianFinancials(data, monthlyBillRON);

      // (12000 * 0.85 * 20) - 52000 = 204000 - 52000 = 152000 RON
      expect(result.savings20YearsRON).toBe(152000);
      console.log('[Test] ✓ 20-year savings: (12000 * 0.85 * 20) - 52000 = 152000 RON');
    });
  });

  describe('Calculation 7: Solar Coverage Percentage', () => {
    it('should calculate coverage: (production / consumption) * 100, capped at 100%', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // Monthly bill: 500 RON
      // Monthly consumption: 500 / 0.85 = 588.24 kWh
      // Annual consumption: 588.24 * 12 = 7058.82 kWh
      // Coverage: (8000 / 7058.82) * 100 = 113.4% → capped at 100%
      expect(result.solarCoveragePct).toBe(100);
      console.log('[Test] ✓ Solar coverage: 113.4% capped at 100%');
    });

    it('should calculate partial coverage for higher bills', () => {
      const result = calculateRomanianFinancials(standardSolarData, 1000);

      // Monthly bill: 1000 RON
      // Monthly consumption: 1000 / 0.85 = 1176.47 kWh
      // Annual consumption: 1176.47 * 12 = 14117.65 kWh
      // Coverage: (8000 / 14117.65) * 100 = 56.7%
      expect(result.solarCoveragePct).toBe(56.7);
      console.log('[Test] ✓ Solar coverage: 56.7% for 1000 RON monthly bill');
    });

    it('should calculate high coverage for lower bills', () => {
      const result = calculateRomanianFinancials(standardSolarData, 200);

      // Monthly bill: 200 RON
      // Monthly consumption: 200 / 0.85 = 235.29 kWh
      // Annual consumption: 235.29 * 12 = 2823.53 kWh
      // Coverage: (8000 / 2823.53) * 100 = 283.1% → capped at 100%
      expect(result.solarCoveragePct).toBe(100);
      console.log('[Test] ✓ Solar coverage: 283.1% capped at 100%');
    });
  });

  describe('Integration: Complete Financial Package', () => {
    it('should return complete financial object with all required fields', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      expect(result).toHaveProperty('currency', 'RON');
      expect(result).toHaveProperty('systemKwp', 10.4);
      expect(result).toHaveProperty('annualProductionKwh', 8000);
      expect(result).toHaveProperty('annualSavingsRON', 6800);
      expect(result).toHaveProperty('systemCostRON', 52000);
      expect(result).toHaveProperty('governmentIncentiveRON', 20000);
      expect(result).toHaveProperty('netCostRON', 32000);
      expect(result).toHaveProperty('paybackYears', 4.71);
      expect(result).toHaveProperty('savings20YearsRON', 84000);
      expect(result).toHaveProperty('solarCoveragePct', 100);

      console.log('[Test] ✓ Complete financial package returned');
      console.log(JSON.stringify(result, null, 2));
    });

    it('should handle edge case: very small system', () => {
      const data = { ...standardSolarData, maxArrayPanelsCount: 4 };
      const result = calculateRomanianFinancials(data, monthlyBillRON);

      // 4 panels * 0.4 = 1.6 kWp
      // 1.6 * 5000 = 8000 RON
      // 8000 - 20000 = -12000 RON (incentive exceeds cost)
      expect(result.systemKwp).toBe(1.6);
      expect(result.systemCostRON).toBe(8000);
      expect(result.netCostRON).toBe(-12000);

      console.log('[Test] ✓ Edge case handled: small system with negative net cost');
    });

    it('should handle edge case: very large system', () => {
      const data = { ...standardSolarData, maxArrayPanelsCount: 100, yearlyEnergyDcKwh: 30000 };
      const result = calculateRomanianFinancials(data, monthlyBillRON);

      // 100 panels * 0.4 = 40 kWp
      // 40 * 5000 = 200000 RON
      // 200000 - 20000 = 180000 RON
      // 30000 * 0.85 = 25500 RON/year
      // Payback: 180000 / 25500 = 7.06 years
      expect(result.systemKwp).toBe(40);
      expect(result.systemCostRON).toBe(200000);
      expect(result.netCostRON).toBe(180000);
      expect(result.paybackYears).toBe(7.06);

      console.log('[Test] ✓ Edge case handled: large system');
    });
  });

  describe('Romanian Market Parameters', () => {
    it('should use correct electricity price: 0.85 RON/kWh', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // Verify by checking annual savings calculation
      // 8000 kWh * 0.85 = 6800 RON
      expect(result.annualSavingsRON).toBe(6800);
      console.log('[Test] ✓ Electricity price: 0.85 RON/kWh');
    });

    it('should use correct system cost: 5000 RON/kWp', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // Verify by checking system cost calculation
      // 10.4 kWp * 5000 = 52000 RON
      expect(result.systemCostRON).toBe(52000);
      console.log('[Test] ✓ System cost: 5000 RON/kWp');
    });

    it('should use correct government incentive: 20000 RON', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      expect(result.governmentIncentiveRON).toBe(20000);
      console.log('[Test] ✓ Government incentive: 20000 RON');
    });
  });

  describe('Rounding and Precision', () => {
    it('should round monetary values to nearest integer', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // Check that monetary values are integers
      expect(result.annualSavingsRON).toBe(Math.round(result.annualSavingsRON));
      expect(result.systemCostRON).toBe(Math.round(result.systemCostRON));
      expect(result.netCostRON).toBe(Math.round(result.netCostRON));
      expect(result.savings20YearsRON).toBe(Math.round(result.savings20YearsRON));

      console.log('[Test] ✓ Monetary values properly rounded');
    });

    it('should round payback years to 2 decimal places', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // Check that payback years has max 2 decimal places
      const decimalPlaces = (result.paybackYears.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);

      console.log('[Test] ✓ Payback years rounded to 2 decimal places');
    });

    it('should round coverage percentage to 1 decimal place', () => {
      const result = calculateRomanianFinancials(standardSolarData, monthlyBillRON);

      // Check that coverage percentage has max 1 decimal place
      const decimalPlaces = (result.solarCoveragePct.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);

      console.log('[Test] ✓ Coverage percentage rounded to 1 decimal place');
    });
  });
});
