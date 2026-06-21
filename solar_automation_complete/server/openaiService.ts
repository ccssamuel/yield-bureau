import { invokeLLM } from './_core/llm';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'REDACTED';

export interface SolarData {
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
}

export interface SummaryResult {
  status: 'success' | 'insufficient_data' | 'openai_failed' | 'hallucination_detected';
  summary?: string;
  missing?: string[];
  reason?: string;
}

/**
 * Extract all numeric values from a string
 */
function extractNumbers(text: string): number[] {
  const numberPattern = /\d+(?:,\d{3})*(?:\.\d+)?|\d+/g;
  const matches = text.match(numberPattern) || [];
  return matches.map(m => parseFloat(m.replace(/,/g, '')));
}

/**
 * Validate solar data has all required fields
 */
function validateSolarData(solarData: SolarData): { valid: boolean; missing: string[] } {
  const requiredFields = [
    'annualProductionKwh',
    'solarCoveragePct',
    'paybackYears',
    'savings20YearsRON',
    'systemCostRON',
    'governmentIncentiveRON',
  ];

  const missing: string[] = [];

  for (const field of requiredFields) {
    const value = (solarData.financial as any)?.[field];
    if (value === null || value === undefined || value === 0) {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Detect hallucinations: check if output contains numbers not in input
 */
function detectHallucinations(inputData: SolarData, outputText: string): boolean {
  const inputNumbers = new Set<string>();

  // Collect all numbers from input
  if (inputData.financial) {
    inputNumbers.add(inputData.financial.annualProductionKwh.toString());
    inputNumbers.add(inputData.financial.solarCoveragePct.toString());
    inputNumbers.add(inputData.financial.paybackYears.toString());
    inputNumbers.add(inputData.financial.savings20YearsRON.toString());
    inputNumbers.add(inputData.financial.systemCostRON.toString());
    inputNumbers.add(inputData.financial.governmentIncentiveRON.toString());
  }

  if (inputData.building) {
    inputNumbers.add(inputData.building.maxPanels.toString());
    inputNumbers.add(inputData.building.roofAreaM2.toString());
    inputNumbers.add(inputData.building.maxSunshineHours.toString());
  }

  // Extract numbers from output
  const outputNumbers = extractNumbers(outputText);

  // Check if any output number is not in input numbers
  for (const num of outputNumbers) {
    const numStr = num.toString();
    const numInt = Math.floor(num).toString();

    if (!inputNumbers.has(numStr) && !inputNumbers.has(numInt)) {
      // Allow some tolerance for rounding (e.g., 1.5 vs 1 or 2)
      const isRounded = Array.from(inputNumbers).some(inputNum => {
        const inputVal = parseFloat(inputNum);
        return Math.abs(inputVal - num) < 1;
      });

      if (!isRounded) {
        console.warn(`[OpenAI] Hallucination detected: number ${num} not in input data`);
        return true;
      }
    }
  }

  return false;
}

/**
 * Generate executive summary using OpenAI GPT-4o
 * Supports both English and Romanian
 */
export async function generateExecutiveSummary(
  solarData: SolarData,
  prospectName: string,
  companyName: string,
  language: 'en' | 'ro' = 'en'
): Promise<SummaryResult> {
  console.log(`[OpenAI] Generating summary for: ${companyName} (language: ${language})`);

  // PRE-FLIGHT VALIDATION
  const validation = validateSolarData(solarData);
  if (!validation.valid) {
    console.warn(`[OpenAI] Pre-flight validation failed. Missing: ${validation.missing.join(', ')}`);
    return {
      status: 'insufficient_data',
      missing: validation.missing,
    };
  }

  const financial = solarData.financial!;

  // BUILD PROMPT (English or Romanian)
  let prompt: string;

  if (language === 'ro') {
    prompt = `Ești un consultant de energie solară care scrie o rezumare executivă pentru CFO-ul unei corporații.

Scrie exact 3 paragrafe adresate CFO-ului despre energia solară pentru ${companyName}.

Folosește DOAR aceste numere furnizate - nu inventa sau calcula cifre noi:
- Producția anuală de energie solară: ${financial.annualProductionKwh} kWh
- Procentaj de acoperire solară: ${financial.solarCoveragePct}%
- Perioada de rambursare a sistemului: ${financial.paybackYears} ani
- Economii pe 20 de ani: ${financial.savings20YearsRON} RON
- Cost net după incentiv: ${financial.netCostRON} RON
- Incentiv guvernamental: ${financial.governmentIncentiveRON} RON

Paragraful 1: Descrie problema costului energiei actuale și oportunitatea solară pentru ${companyName}.
Paragraful 2: Explică soluția tehnică - producția anuală, acoperire procentuală și dimensiunea sistemului.
Paragraful 3: Prezintă cazul financiar - perioada de rambursare, economii pe 20 de ani și incentivele guvernamentale.

Menține un ton profesional și bazat pe date. Referă numerele specifice furnizate mai sus.`;
  } else {
    prompt = `You are a solar energy consultant writing an executive summary for a corporate CFO.

Write exactly 3 paragraphs addressing the CFO about solar energy for ${companyName}.

Use ONLY these numbers provided - never invent or calculate new figures:
- Annual solar production: ${financial.annualProductionKwh} kWh
- Solar coverage percentage: ${financial.solarCoveragePct}%
- System payback period: ${financial.paybackYears} years
- 20-year savings: ${financial.savings20YearsRON} RON
- System cost: ${financial.systemCostRON} RON
- Government incentive: ${financial.governmentIncentiveRON} RON

Paragraph 1: Describe the current energy cost problem and the solar opportunity for ${companyName}.
Paragraph 2: Explain the technical solution - annual production, coverage percentage, and system size.
Paragraph 3: Present the financial case - payback period, 20-year savings, and government incentives.

Keep the tone professional and data-driven. Reference the specific numbers provided above.`;
  }

  try {
    console.log('[OpenAI] Calling GPT-4o API...');

    const systemMessage = language === 'ro' 
      ? 'Ești un consultant profesionist de energie solară. Furnizează rezumate precise, bazate pe date.'
      : 'You are a professional solar energy consultant. Provide accurate, data-driven summaries.';

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'executive_summary',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: language === 'ro' 
                  ? 'Rezumatul executiv (3 paragrafe)'
                  : 'The executive summary (3 paragraphs)',
              },
            },
            required: ['summary'],
            additionalProperties: false,
          },
        },
      },
    });

    console.log('[OpenAI] ✓ API response received');

    // Parse response
    let summaryText = '';
    if (response.choices && response.choices[0] && response.choices[0].message) {
      const content = response.choices[0].message.content;
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          summaryText = parsed.summary;
        } catch (e) {
          console.error('[OpenAI] Failed to parse JSON response');
          return {
            status: 'openai_failed',
            reason: 'Invalid JSON response from API',
          };
        }
      }
    }

    if (!summaryText) {
      console.error('[OpenAI] Empty summary returned');
      return {
        status: 'openai_failed',
        reason: 'Empty response from API',
      };
    }

    // HALLUCINATION DETECTION
    if (detectHallucinations(solarData, summaryText)) {
      console.warn('[OpenAI] Hallucination detected in response');
      return {
        status: 'hallucination_detected',
      };
    }

    console.log('[OpenAI] ✓ Summary generated successfully');
    return {
      status: 'success',
      summary: summaryText,
    };
  } catch (error) {
    console.error('[OpenAI] API call failed:', error);
    return {
      status: 'openai_failed',
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
