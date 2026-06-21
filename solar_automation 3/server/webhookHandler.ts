import { Request, Response } from 'express';
import { createLead } from './db';
import { checkRateLimit } from './rateLimiter';
import { getSolarData } from './googleSolarService';
import { calculateRomanianFinancials } from './googleSolarService';
import { generateExecutiveSummary } from './openaiService';
import { generateSolarProposalPDF } from './pdf';
import { upsertLead } from './hubspotService';

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
  status: 'success' | 'error' | 'timeout';
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
 * Only called if PDF buffer is not null/undefined
 */
async function sendProposalEmailAsync(
  email: string,
  companyName: string,
  proposalUrl: string,
  pdfBuffer?: Buffer
): Promise<void> {
  try {
    // PDF null guard: only send email if PDF was successfully generated
    if (!pdfBuffer) {
      console.log(`[Webhook] Skipping email: PDF buffer is null/undefined`);
      return;
    }

    // TODO: Implement Postmark email delivery
    console.log(`[Webhook] Email queued: ${email} for ${companyName}`);
  } catch (error) {
    console.error('[Webhook] Email send error (non-blocking):', error);
  }
}

/**
 * Upsert lead to HubSpot CRM (fire and forget)
 * Calls real HubSpot service with deal-contact association
 */
async function upsertLeadAsync(
  companyName: string,
  email: string,
  address: string,
  financialData: any
): Promise<void> {
  try {
    // Call real HubSpot service with deal-contact association
    const result = await upsertLead(companyName, email, address, financialData);
    
    if (result.associated) {
      console.log(`[Webhook] ✓ Lead upserted to HubSpot: contact ${result.contactId}, deal ${result.dealId}`);
    } else {
      console.warn('[Webhook] Lead upserted but association failed');
    }
  } catch (error) {
    console.error('[Webhook] CRM upsert error (non-blocking):', error);
  }
}

/**
 * Execute the entire webhook pipeline with 14-second timeout
 * Returns promise that resolves with response or rejects on timeout
 */
async function executeWebhookPipeline(
  req: Request,
  input: QualifyWebhookInput,
  clientIp: string
): Promise<QualifyWebhookResponse> {
  const startTime = Date.now();

  // STEP 2: Check rate limit
  console.log('[Webhook] Step 2: Checking rate limit...');
  const rateLimitCheck = await checkRateLimit(req);
  if (!rateLimitCheck.allowed) {
    console.log(`[Webhook] Rate limit exceeded for ${clientIp}`);
    throw { status: 429, error: 'Rate limit exceeded', errorCode: 'RATE_LIMIT_EXCEEDED' };
  }
  console.log(`[Webhook] ✓ Rate limit check passed (${rateLimitCheck.remaining} remaining)`);

  // STEP 3: Get solar data from Google Solar API
  console.log('[Webhook] Step 3: Fetching solar data...');
  const solarResponse = await getSolarData(input.address, input.clientId, input.monthlyBill);

  if (solarResponse.status !== 'success') {
    console.log(`[Webhook] Solar API failed: ${solarResponse.status}`);
    throw { status: 422, error: `Solar API error: ${solarResponse.status}`, errorCode: 'SOLAR_API_ERROR' };
  }

  console.log(`[Webhook] ✓ Solar data retrieved (cache hit: ${solarResponse.cacheHit})`);

  // STEP 4: Validate building and financial data
  console.log('[Webhook] Step 4: Validating solar data...');
  if (!solarResponse.building || !solarResponse.financial) {
    console.log('[Webhook] Missing building or financial data from solar API');
    throw { status: 422, error: 'Missing building or financial data from solar API', errorCode: 'SOLAR_DATA_ERROR' };
  }

  const financialData = solarResponse.financial;
  console.log(`[Webhook] ✓ Financial calculations complete (payback: ${financialData.paybackYears.toFixed(2)} years)`);

  // STEP 5: Generate executive summary with OpenAI
  console.log('[Webhook] Step 5: Generating executive summary...');
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
    throw { status: 422, error: `Failed to generate executive summary: ${summaryResult.status}`, errorCode: 'SUMMARY_GENERATION_ERROR' };
  }

  const executiveSummary = summaryResult.summary || '';
  console.log('[Webhook] ✓ Executive summary generated');

  // STEP 6: Generate PDF proposal
  console.log('[Webhook] Step 6: Generating PDF proposal...');
  let pdfBuffer: Buffer | undefined;
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
      pdfBuffer = pdfResult.buffer;
      console.log(`[Webhook] ✓ PDF generated (in-memory Buffer)`);
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
    throw { status: 500, error: 'Failed to create lead record', errorCode: 'DATABASE_ERROR' };
  }

  console.log(`[Webhook] ✓ Lead logged (ID: ${lead.id})`);

  // STEP 8: Fire and forget - send email and upsert CRM
  // Only send email if PDF buffer exists (PDF null guard)
  console.log('[Webhook] Step 8: Queuing async tasks (email, CRM)...');
  const proposalUrl = `https://example.com/proposals/${lead.id}`;
  sendProposalEmailAsync(input.email, input.companyName, proposalUrl, pdfBuffer).catch((err) =>
    console.error('[Webhook] Email async error:', err)
  );
  upsertLeadAsync(input.companyName, input.email, input.address, financialData).catch((err) =>
    console.error('[Webhook] CRM async error:', err)
  );

  // STEP 9: Build success response
  const duration = Date.now() - startTime;
  console.log(`[Webhook] ✓ Pipeline complete (${duration}ms)`);

  return {
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
}

/**
 * Main webhook handler for solar qualification
 * Implements full pipeline with 14-second timeout
 * Returns HTTP 503 on timeout
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

    // Wrap entire pipeline in Promise.race with 14-second timeout
    console.log('[Webhook] Starting pipeline with 14-second timeout...');
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Pipeline timeout: 14 seconds exceeded')), 14000)
    );

    const pipelinePromise = executeWebhookPipeline(req, input, clientIp);

    let response: QualifyWebhookResponse;
    try {
      response = await Promise.race([pipelinePromise, timeoutPromise]);
    } catch (error) {
      if ((error as Error).message.includes('timeout')) {
        console.error('[Webhook] Pipeline timeout (14s exceeded)');
        res.status(503).json({
          status: 'timeout',
          error: 'Pipeline timeout: request took too long to process',
          errorCode: 'PIPELINE_TIMEOUT',
        });
        return;
      }
      throw error;
    }

    res.status(200).json(response);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Handle thrown errors with status codes
    if (error?.status) {
      console.error(`[Webhook] Error (${duration}ms):`, error.error);
      res.status(error.status).json({
        status: 'error',
        error: error.error,
        errorCode: error.errorCode,
      });
      return;
    }

    // Handle unexpected errors
    console.error(`[Webhook] Unhandled error (${duration}ms):`, error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      errorCode: 'INTERNAL_ERROR',
    });
  }
}
