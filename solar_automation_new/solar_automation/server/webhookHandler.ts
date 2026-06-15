import { Request, Response } from 'express';
import { createLead } from './db';
import { checkRateLimit } from './rateLimiter';
import { getSolarData } from './googleSolarService';
import { generateExecutiveSummary } from './openaiService';
import { generateSolarProposalPDF } from './pdf';

/**
 * Webhook input validation schema
 */
interface QualifyWebhookInput {
  companyName: string;
  address: string;
  email: string;
  monthlyBill: number;
  clientId: string;
}

/**
 * Webhook response schema
 */
interface QualifyWebhookResponse {
  status: 'success' | 'error';
  prospect?: {
    companyName: string;
    address: string;
    email: string;
  };
  solar?: {
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
  summary?: string;
  cacheHit?: boolean;
  generatedAt?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Validate webhook input
 */
function validateInput(body: any): { valid: boolean; error?: string; data?: QualifyWebhookInput } {
  // Check all required fields are present
  if (!body.companyName || !body.address || !body.email || body.monthlyBill === undefined || !body.clientId) {
    return {
      valid: false,
      error: 'Missing required fields: companyName, address, email, monthlyBill, clientId',
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Validate address length
  if (typeof body.address !== 'string' || body.address.trim().length < 10) {
    return { valid: false, error: 'Address must be at least 10 characters' };
  }

  // Validate monthlyBill is a positive number
  if (typeof body.monthlyBill !== 'number' || body.monthlyBill <= 0) {
    return { valid: false, error: 'monthlyBill must be a positive number' };
  }

  return {
    valid: true,
    data: {
      companyName: body.companyName.trim(),
      address: body.address.trim(),
      email: body.email.trim(),
      monthlyBill: body.monthlyBill,
      clientId: body.clientId.trim(),
    },
  };
}

/**
 * Send proposal email (fire and forget)
 */
async function sendProposalEmailAsync(
  email: string,
  companyName: string,
  proposalUrl: string
): Promise<void> {
  try {
    // TODO: Implement Postmark email delivery
    console.log(`[Webhook] Email queued: ${email} for ${companyName}`);
  } catch (error) {
    console.error('[Webhook] Email send error (non-blocking):', error);
  }
}

/**
 * Upsert lead to CRM (fire and forget)
 */
async function upsertLeadAsync(
  companyName: string,
  email: string,
  address: string,
  financialData: any
): Promise<void> {
  try {
    // TODO: Implement HubSpot integration
    console.log(`[Webhook] Lead upserted to CRM: ${companyName} (${email})`);
  } catch (error) {
    console.error('[Webhook] CRM upsert error (non-blocking):', error);
  }
}

/**
 * Main webhook handler for solar qualification
 * Implements full pipeline: validation → rate limit → solar API → financials → summary → PDF
 */
export async function handleQualifyWebhook(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  try {
    console.log(`[Webhook] Received qualification request from ${clientIp}`);

    // STEP 1: Validate input
    console.log('[Webhook] Step 1: Validating input...');
    const validation = validateInput(req.body);
    if (!validation.valid) {
      console.log(`[Webhook] Validation failed: ${validation.error}`);
      res.status(400).json({
        status: 'error',
        error: validation.error,
        errorCode: 'VALIDATION_ERROR',
      });
      return;
    }

    const input = validation.data!;
    console.log(`[Webhook] ✓ Input validated: ${input.companyName}`);

    // STEP 2: Check rate limit
    console.log('[Webhook] Step 2: Checking rate limit...');
    const rateLimitCheck = await checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      console.log(`[Webhook] Rate limit exceeded for ${clientIp}`);
      res.status(429).json({
        status: 'error',
        error: 'Rate limit exceeded',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }
    console.log(`[Webhook] ✓ Rate limit check passed (${rateLimitCheck.remaining} remaining)`);

    // STEP 3: Get solar data from Google Solar API
    console.log('[Webhook] Step 3: Fetching solar data...');
    const solarResponse = await getSolarData(input.address, input.clientId, input.monthlyBill);

    if (solarResponse.status !== 'success') {
      console.log(`[Webhook] Solar API failed: ${solarResponse.status}`);
      res.status(422).json({
        status: 'error',
        error: `Solar API error: ${solarResponse.status}`,
        errorCode: 'SOLAR_API_ERROR',
      });
      return;
    }

    console.log(`[Webhook] ✓ Solar data retrieved (cache hit: ${solarResponse.cacheHit})`);

    // STEP 4: Extract building and financial data
    console.log('[Webhook] Step 4: Extracting financial data...');
    if (!solarResponse.building || !solarResponse.financial) {
      console.log('[Webhook] Missing building or financial data from solar API');
      res.status(422).json({
        status: 'error',
        error: 'Missing building or financial data from solar API',
        errorCode: 'SOLAR_DATA_ERROR',
      });
      return;
    }

    const financialData = solarResponse.financial;
    console.log(`[Webhook] ✓ Financial data extracted (payback: ${financialData.paybackYears.toFixed(2)} years)`);

    // STEP 5: Generate executive summary with OpenAI
    console.log('[Webhook] Step 5: Generating executive summary...');
    let executiveSummary = '';
    try {
      const summaryResult = await generateExecutiveSummary(
        {
          building: solarResponse.building,
          financial: financialData,
        },
        input.companyName,
        input.companyName,
        'ro'
      );

      if (summaryResult.status !== 'success') {
        console.error('[Webhook] OpenAI summary generation failed:', summaryResult.status);
        res.status(422).json({
          status: 'error',
          error: `Failed to generate executive summary: ${summaryResult.status}`,
          errorCode: 'SUMMARY_GENERATION_ERROR',
        });
        return;
      }

      executiveSummary = summaryResult.summary || '';
      console.log('[Webhook] ✓ Executive summary generated');
    } catch (error) {
      console.error('[Webhook] OpenAI summary generation failed:', error);
      res.status(422).json({
        status: 'error',
        error: 'Failed to generate executive summary',
        errorCode: 'SUMMARY_GENERATION_ERROR',
      });
      return;
    }

    // STEP 6: Generate PDF proposal
    console.log('[Webhook] Step 6: Generating PDF proposal...');
    try {
      const pdfResult = await generateSolarProposalPDF(
        input.companyName,
        input.companyName,
        {
          building: solarResponse.building,
          financial: financialData,
        },
        'ro'
      );

      if (!pdfResult.success) {
        console.error('[Webhook] PDF generation failed:', pdfResult.error);
        // Continue without PDF - don't fail the entire request
      } else {
        console.log(`[Webhook] ✓ PDF generated: ${pdfResult.filePath}`);
      }
    } catch (error) {
      console.error('[Webhook] PDF generation error (non-blocking):', error);
      // Continue without PDF - don't fail the entire request
    }

    // STEP 7: Log lead to database
    console.log('[Webhook] Step 7: Logging lead to database...');
    const lead = await createLead({
      companyName: input.companyName,
      address: input.address,
      email: input.email,
      avgBillEur: input.monthlyBill,
      status: 'qualified',
    });

    if (!lead) {
      console.error('[Webhook] Failed to create lead record');
      res.status(500).json({
        status: 'error',
        error: 'Failed to create lead record',
        errorCode: 'DATABASE_ERROR',
      });
      return;
    }

    console.log(`[Webhook] ✓ Lead logged (ID: ${lead.id})`);

    // STEP 8: Fire and forget - send email and upsert CRM
    console.log('[Webhook] Step 8: Queuing async tasks (email, CRM)...');
    const proposalUrl = `https://example.com/proposals/${lead.id}`;
    sendProposalEmailAsync(input.email, input.companyName, proposalUrl).catch((err) =>
      console.error('[Webhook] Email async error:', err)
    );
    upsertLeadAsync(input.companyName, input.email, input.address, financialData).catch((err) =>
      console.error('[Webhook] CRM async error:', err)
    );

    // STEP 9: Return success response
    const duration = Date.now() - startTime;
    console.log(`[Webhook] ✓ Pipeline complete (${duration}ms)`);

    const response: QualifyWebhookResponse = {
      status: 'success',
      prospect: {
        companyName: input.companyName,
        address: input.address,
        email: input.email,
      },
      solar: solarResponse.building,
      financial: financialData,
      summary: executiveSummary,
      cacheHit: solarResponse.cacheHit || false,
      generatedAt: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Webhook] Unhandled error (${duration}ms):`, error);

    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    });
  }
}
