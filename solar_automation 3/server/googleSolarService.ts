import { getCachedAddress, cacheAddress } from './cache';
import crypto from 'crypto';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'REDACTED';
const GOOGLE_SOLAR_API_KEY = process.env.GOOGLE_SOLAR_API_KEY || 'REDACTED';

// Romanian market parameters
const RON_ELECTRICITY_PRICE_KWH = parseFloat(process.env.RON_ELECTRICITY_PRICE_KWH || '0.85');
const RON_COST_PER_KWP = parseFloat(process.env.RON_COST_PER_KWP || '5000');
const RON_GOVERNMENT_INCENTIVE = parseFloat(process.env.RON_GOVERNMENT_INCENTIVE || '20000');

/**
 * Solar panel configuration with energy production
 */
export interface SolarPanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
}

/**
 * Solar potential data from Google Solar API
 */
export interface SolarPotential {
  maxArrayPanelsCount: number;
  maxSunshineHoursPerYear: number;
  wholeRoofStats: {
    areaMeters2: number;
  };
  solarPanelConfigs: SolarPanelConfig[];
}

export interface SolarResponse {
  status: 'success' | 'geocoding_failed' | 'solar_api_failed' | 'insufficient_data';
  cacheHit?: boolean;
  building?: {
    maxPanels: number;
    roofAreaM2: number;
    maxSunshineHours: number;
    imageryDate: string;
    imageryQuality: string;
  };
  financial?: {
    currency: string;
    systemKwp: number;
    annualProductionKwh: number;
    annualSavingsRON: number;
    systemCostRON: number;
    governmentIncentiveRON: number;
    netCostRON: number;
    paybackYears: number;
    savings20YearsRON: number;
    solarCoveragePct: number;
  };
  imageryQuality?: string;
  reason?: string;
}

/**
 * Generate cache key: SHA256(clientId + normalizedAddress)
 */
function generateCacheKey(clientId: string, address: string): string {
  const normalized = `${clientId}${address.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Get the yearly energy production (kWh) for the maximum panel configuration.
 * Google returns an array of configs (one per panel count); we want the
 * config matching maxArrayPanelsCount, which represents full roof utilization.
 */
function getMaxConfigEnergyKwh(potential: SolarPotential): number | null {
  if (!potential.solarPanelConfigs || potential.solarPanelConfigs.length === 0) {
    return null;
  }
  const maxConfig =
    potential.solarPanelConfigs.find(c => c.panelsCount === potential.maxArrayPanelsCount) ||
    potential.solarPanelConfigs[potential.solarPanelConfigs.length - 1];
  return maxConfig?.yearlyEnergyDcKwh ?? null;
}

/**
 * Calculate Romanian financial metrics
 */
export function calculateRomanianFinancials(
  solarData: SolarPotential,
  monthlyBillRON: number
): {
  currency: string;
  systemKwp: number;
  annualProductionKwh: number;
  annualSavingsRON: number;
  systemCostRON: number;
  governmentIncentiveRON: number;
  netCostRON: number;
  paybackYears: number;
  savings20YearsRON: number;
  solarCoveragePct: number;
} {
  console.log(`[Romanian Financials] Calculating for monthly bill: ${monthlyBillRON} RON`);

  // 1. Calculate system size in kWp
  const systemKwp = solarData.maxArrayPanelsCount * 0.4;
  console.log(`[Romanian Financials] System size: ${systemKwp} kWp`);

  // 2. Annual production (from Google Solar API solarPanelConfigs)
  const annualProductionKwh = getMaxConfigEnergyKwh(solarData);
  if (annualProductionKwh === null) {
    throw new Error('Cannot calculate financials: no valid yearlyEnergyDcKwh found in solarPanelConfigs');
  }
  console.log(`[Romanian Financials] Annual production: ${annualProductionKwh} kWh`);

  // 3. Annual savings in RON
  const annualSavingsRON = annualProductionKwh * RON_ELECTRICITY_PRICE_KWH;
  console.log(`[Romanian Financials] Annual savings: ${annualSavingsRON} RON`);

  // 4. System cost in RON
  const systemCostRON = systemKwp * RON_COST_PER_KWP;
  console.log(`[Romanian Financials] System cost: ${systemCostRON} RON`);

  // 5. Net cost after government incentive
  const netCostRON = systemCostRON - RON_GOVERNMENT_INCENTIVE;
  console.log(`[Romanian Financials] Net cost after incentive: ${netCostRON} RON`);

  // 6. Payback period in years
  const paybackYears = netCostRON / annualSavingsRON;
  console.log(`[Romanian Financials] Payback period: ${paybackYears.toFixed(2)} years`);

  // 7. 20-year savings
  const savings20YearsRON = annualSavingsRON * 20 - systemCostRON;
  console.log(`[Romanian Financials] 20-year savings: ${savings20YearsRON} RON`);

  // 8. Solar coverage percentage (capped at 100%)
  const annualEnergyConsumptionKwh = (monthlyBillRON / RON_ELECTRICITY_PRICE_KWH) * 12;
  let solarCoveragePct = (annualProductionKwh / annualEnergyConsumptionKwh) * 100;
  solarCoveragePct = Math.min(solarCoveragePct, 100);
  console.log(`[Romanian Financials] Solar coverage: ${solarCoveragePct.toFixed(1)}%`);

  return {
    currency: 'RON',
    systemKwp: Math.round(systemKwp * 100) / 100,
    annualProductionKwh: Math.round(annualProductionKwh),
    annualSavingsRON: Math.round(annualSavingsRON),
    systemCostRON: Math.round(systemCostRON),
    governmentIncentiveRON: RON_GOVERNMENT_INCENTIVE,
    netCostRON: Math.round(netCostRON),
    paybackYears: Math.round(paybackYears * 100) / 100,
    savings20YearsRON: Math.round(savings20YearsRON),
    solarCoveragePct: Math.round(solarCoveragePct * 10) / 10,
  };
}

/**
 * Geocode address using Google Maps API
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    console.log(`[Geocoding] Geocoding address: ${address}`);

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = (await response.json()) as any;

    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log(`[Geocoding] ✓ Found: ${location.lat}, ${location.lng}`);
      return { lat: location.lat, lng: location.lng };
    }

    console.warn(`[Geocoding] ✗ No results found for: ${address}`);
    return null;
  } catch (error) {
    console.error('[Geocoding] Error:', error);
    return null;
  }
}

/**
 * Call Google Solar API
 */
async function callGoogleSolarAPI(lat: number, lng: number): Promise<any | null> {
  try {
    console.log(`[Solar API] Calling buildingInsights:findClosest for ${lat}, ${lng}`);

    const url = `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${GOOGLE_SOLAR_API_KEY}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[Solar API] HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log('[Solar API] ✓ Response received');
      return data;
    } catch (e) {
      clearTimeout(timeoutId);
      if ((e as any).name === 'AbortError') {
        console.error('[Solar API] Request timed out (10s)');
      } else {
        console.error('[Solar API] Request failed:', e);
      }
      return null;
    }
  } catch (error) {
    console.error('[Solar API] Error:', error);
    return null;
  }
}

/**
 * Validate solar API response
 */
function validateSolarResponse(data: any): { valid: boolean; quality?: string } {
  if (!data.buildingInsights) {
    console.warn('[Validation] Missing buildingInsights');
    return { valid: false };
  }

  const potential = data.buildingInsights.solarPotential;

  if (!potential) {
    console.warn('[Validation] Missing solarPotential');
    return { valid: false };
  }

  const maxEnergyKwh = getMaxConfigEnergyKwh(potential);

  const checks = [
    { field: 'maxArrayPanelsCount', value: potential.maxArrayPanelsCount, min: 0 },
    { field: 'maxSunshineHoursPerYear', value: potential.maxSunshineHoursPerYear, min: 0 },
    { field: 'yearlyEnergyDcKwh (from solarPanelConfigs)', value: maxEnergyKwh, min: 0 },
    { field: 'areaMeters2', value: potential.wholeRoofStats?.areaMeters2, min: 0 },
  ];

  for (const check of checks) {
    if (check.value === null || check.value === undefined || check.value <= check.min) {
      console.warn(`[Validation] ✗ ${check.field} failed: ${check.value}`);
      return { valid: false };
    }
  }

  const quality = data.buildingInsights.imageryQuality;
  if (quality !== 'HIGH' && quality !== 'MEDIUM') {
    console.warn(`[Validation] ✗ Imagery quality too low: ${quality}`);
    return { valid: false, quality };
  }

  console.log('[Validation] ✓ All checks passed');
  return { valid: true, quality };
}

/**
 * Format imagery date
 */
function formatImageryDate(dateObj: any): string {
  if (!dateObj || !dateObj.year) return 'Unknown';
  const date = new Date(dateObj.year, (dateObj.month || 1) - 1, dateObj.day || 1);
  return date.toISOString().split('T')[0];
}

/**
 * Main function: Get solar data with cache, geocoding, API call, and Romanian financial calculations
 */
export async function getSolarData(address: string, clientId: string, monthlyBillRON: number): Promise<SolarResponse> {
  console.log(`[getSolarData] Starting for: ${address}`);

  // STEP 1: Cache check
  const cacheKey = generateCacheKey(clientId, address);
  console.log(`[getSolarData] Cache key: ${cacheKey}`);

  const cached = await getCachedAddress(clientId, address);
  if (cached) {
    console.log('[getSolarData] ✓ Cache HIT');
    return { ...cached, cacheHit: true };
  }

  console.log('[getSolarData] Cache MISS - proceeding with API calls');

  // STEP 2: Geocode address
  const coords = await geocodeAddress(address);
  if (!coords) {
    console.error('[getSolarData] Geocoding failed');
    return { status: 'geocoding_failed', reason: 'Unable to geocode address' };
  }

  // STEP 3: Call Google Solar API
  const solarData = await callGoogleSolarAPI(coords.lat, coords.lng);
  if (!solarData) {
    console.error('[getSolarData] Solar API call failed');
    return { status: 'solar_api_failed', reason: 'Solar API request failed' };
  }

  // STEP 4: Validate response
  const validation = validateSolarResponse(solarData);
  if (!validation.valid) {
    console.error('[getSolarData] Validation failed');
    return {
      status: 'insufficient_data',
      imageryQuality: validation.quality,
      reason: 'Solar data validation failed',
    };
  }

  // STEP 5: Extract building data
  const potential = solarData.buildingInsights.solarPotential;
  const buildingData = {
    maxPanels: potential.maxArrayPanelsCount,
    roofAreaM2: potential.wholeRoofStats.areaMeters2,
    maxSunshineHours: potential.maxSunshineHoursPerYear,
    imageryDate: formatImageryDate(solarData.imageryDate),
    imageryQuality: solarData.buildingInsights.imageryQuality,
  };

  // STEP 6: Calculate Romanian financials
  let financialData;
  try {
    financialData = calculateRomanianFinancials(potential, monthlyBillRON);
  } catch (error) {
    console.error('[getSolarData] Financial calculation failed:', error);
    return { status: 'insufficient_data', reason: 'Financial calculation failed' };
  }

  // STEP 7: Cache the result
  const result: SolarResponse = {
    status: 'success',
    cacheHit: false,
    building: buildingData,
    financial: financialData,
  };

  await cacheAddress(clientId, address, result);
  console.log('[getSolarData] ✓ Result cached');

  return result;
}
