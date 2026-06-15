import { describe, it, expect } from 'vitest';

describe('Romanian Market Environment Configuration', () => {
  it('should have RON_ELECTRICITY_PRICE_KWH configured', () => {
    const value = process.env.RON_ELECTRICITY_PRICE_KWH;
    expect(value).toBeDefined();
    expect(parseFloat(value || '0')).toBeGreaterThan(0);
    console.log(`[EnvConfig] ✓ RON_ELECTRICITY_PRICE_KWH = ${value}`);
  });

  it('should have RON_COST_PER_KWP configured', () => {
    const value = process.env.RON_COST_PER_KWP;
    expect(value).toBeDefined();
    expect(parseFloat(value || '0')).toBeGreaterThan(0);
    console.log(`[EnvConfig] ✓ RON_COST_PER_KWP = ${value}`);
  });

  it('should have RON_GOVERNMENT_INCENTIVE configured', () => {
    const value = process.env.RON_GOVERNMENT_INCENTIVE;
    expect(value).toBeDefined();
    expect(parseFloat(value || '0')).toBeGreaterThan(0);
    console.log(`[EnvConfig] ✓ RON_GOVERNMENT_INCENTIVE = ${value}`);
  });

  it('should have correct Romanian parameter values', () => {
    const electricityPrice = parseFloat(process.env.RON_ELECTRICITY_PRICE_KWH || '0');
    const costPerKwp = parseFloat(process.env.RON_COST_PER_KWP || '0');
    const incentive = parseFloat(process.env.RON_GOVERNMENT_INCENTIVE || '0');

    expect(electricityPrice).toBe(0.85);
    expect(costPerKwp).toBe(5000);
    expect(incentive).toBe(20000);

    console.log('[EnvConfig] ✓ All Romanian parameters have correct values');
    console.log(`  - Electricity price: ${electricityPrice} RON/kWh`);
    console.log(`  - System cost: ${costPerKwp} RON/kWp`);
    console.log(`  - Government incentive: ${incentive} RON`);
  });
});
