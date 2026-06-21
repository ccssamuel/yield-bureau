import { getCachedAddress, cacheAddress, generateCacheKey as generateCacheKeyFromCache } from './cache';
import crypto from 'crypto';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCrsZqsqfolxr_kE9kzl8aOiO16JCpcdl8';
const GOOGLE_SOLAR_API_KEY = process.env.GOOGLE_SOLAR_API_KEY || 'AIzaSyCrsZqsqfolxr_kE9kzl8aOiO16JCpcdl8';

// Romanian market parameters
const RON_ELECTRICITY_PRICE_KWH = parseFloat(process.env.RON_ELECTRICITY_PRICE_KWH || '0.85');
const RON_COST_PER_KWP = parseFloat(process.env.RON_COST_PER_KWP || '5000');
const RON_GOVERNMENT_INCENTIVE = parseFloat(process.env.RON_GOVERNMENT_INCENTIVE || '20000');

export interface SolarPotential {
  maxArrayPanelsCount: number;
  maxSunshineHoursPerYear: number;
  yearlyEnergyDcKwh: number;
  yearlyEnergyAcKwh: number;
  wholeRoofStats: {
    areaMeters2: number;
  };
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
  return generateCacheKeyFromCache(clientId, address);
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

  // 2. Annual production (from Google Solar API)
  const annualProductionKwh = solarData.yearlyEnergyDcKwh;
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

  // Check required fields
  const checks = [
    { field: 'maxArrayPanelsCount', value: potential.maxArrayPanelsCount, min: 0 },
    { field: 'maxSunshineHoursPerYear', value: potential.maxSunshineHoursPerYear, min: 0 },
    { field: 'yearlyEnergyDcKwh', value: potential.yearlyEnergyDcKwh, min: 0 },
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
    console.log('[getSolarData] ✓ CACHE_HIT');
    return {
      ...cached,
      cacheHit: true,
    };
  }

  console.log('[getSolarData] Cache miss, proceeding to geocoding');

  // STEP 2: Geocode address
  const coords = await geocodeAddress(address);
  if (!coords) {
    console.error('[getSolarData] Geocoding failed');
    return {
      status: 'geocoding_failed',
      reason: 'Could not geocode address',
    };
  }

  // STEP 3: Call Google Solar API
  const apiResponse = await callGoogleSolarAPI(coords.lat, coords.lng);
  if (!apiResponse) {
    console.error('[getSolarData] Solar API failed');
    return {
      status: 'solar_api_failed',
      reason: 'Could not retrieve solar data',
    };
  }

  // STEP 4: Validate response
  const validation = validateSolarResponse(apiResponse);
  if (!validation.valid) {
    console.error('[getSolarData] Validation failed');
    return {
      status: 'insufficient_data',
      imageryQuality: validation.quality,
      reason: 'Solar data does not meet quality requirements',
    };
  }

  const potential = apiResponse.buildingInsights.solarPotential;

  // STEP 5: Calculate Romanian financials
  const financials = calculateRomanianFinancials(potential, monthlyBillRON);

  // STEP 6: Build response
  const response: SolarResponse = {
    status: 'success',
    cacheHit: false,
    building: {
      maxPanels: potential.maxArrayPanelsCount,
      roofAreaM2: potential.wholeRoofStats.areaMeters2,
      maxSunshineHours: potential.maxSunshineHoursPerYear,
      imageryDate: formatImageryDate(apiResponse.buildingInsights.imageryDate),
      imageryQuality: apiResponse.buildingInsights.imageryQuality,
    },
    financial: financials,
  };

  // STEP 7: Write to cache
  try {
    await cacheAddress(clientId, address, response);
    console.log(`[getSolarData] ✓ CACHE_WRITE: ${cacheKey}`);
  } catch (error) {
    console.warn('[getSolarData] Cache write failed:', error);
  }

  console.log('[getSolarData] ✓ Success');
  return response;
}
