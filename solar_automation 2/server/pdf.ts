import puppeteer, { Browser } from 'puppeteer';
import chromium from '@sparticuz/chromium';
import fs from 'fs/promises';
import path from 'path';
import { BRANDING } from '../shared/branding';

/**
 * Puppeteer PDF generation module
 * Converts HTML to PDF using headless Chrome
 * Uses @sparticuz/chromium for serverless compatibility
 * Includes Yield Bureau branding in all PDFs
 */

let browserInstance: Browser | null = null;

/**
 * Get or create browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    console.log('[PDF] Launching Puppeteer browser...');
    
    const launchConfig: any = {
      headless: true,
      args: chromium.args,
      executablePath: '/usr/bin/chromium',
    };
    
    browserInstance = await puppeteer.launch(launchConfig);
    console.log('[PDF] ✓ Browser launched');
  }
  return browserInstance;
}

export interface PDFGenerationOptions {
  html: string;
  filename?: string;
  format?: 'A4' | 'Letter';
  margin?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

export interface PDFGenerationResult {
  success: boolean;
  buffer?: Buffer;
  filePath?: string;
  error?: string;
}

/**
 * Generate a PDF with Yield Bureau branding
 * Adds footer with agency name and copyright
 */
export async function generatePDF(options: PDFGenerationOptions): Promise<PDFGenerationResult> {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Add Yield Bureau branding to HTML
    const brandedHtml = addBranding(options.html);

    await page.setContent(brandedHtml);

    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      margin: options.margin || {
        top: 40,
        bottom: 60,
        left: 40,
        right: 40,
      },
      displayHeaderFooter: true,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 10px; color: #666;">
          <span>${BRANDING.pdfFooterText}</span>
        </div>
      `,
    });

    await page.close();

    if (options.filename) {
      const filePath = path.join('/tmp', options.filename);
      await fs.writeFile(filePath, pdfBuffer);
      console.log(`[PDF] ✓ PDF saved: ${filePath}`);
      return { success: true, buffer: pdfBuffer, filePath };
    }

    console.log('[PDF] ✓ PDF generated successfully');
    return { success: true, buffer: pdfBuffer };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PDF] ✗ Error generating PDF: ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

/**
 * Add Yield Bureau branding to HTML content
 */
function addBranding(html: string): string {
  // Add Yield Bureau header if not already present
  const headerHtml = `
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid ${BRANDING.colors.primary}; padding-bottom: 20px;">
      <h1 style="color: ${BRANDING.colors.primary}; margin: 0; font-size: 28px;">${BRANDING.pdfCompanyName}</h1>
      <p style="color: ${BRANDING.colors.secondary}; margin: 5px 0 0 0; font-size: 14px;">${BRANDING.pdfTagline}</p>
    </div>
  `;

  // Insert header at the beginning of body
  const modifiedHtml = html.replace(
    /<body[^>]*>/i,
    `<body style="font-family: Arial, sans-serif; color: ${BRANDING.colors.text};">` + headerHtml
  );

  return modifiedHtml;
}

/**
 * Generate a solar proposal PDF with Yield Bureau branding
 */
export async function generateSolarProposalPDF(
  prospectName: string,
  companyName: string,
  solarData: any,
  language: 'en' | 'ro' = 'en'
): Promise<PDFGenerationResult> {
  const htmlContent = buildSolarProposalHTML(prospectName, companyName, solarData, language);
  const filename = `solar-proposal-${companyName.replace(/\s+/g, '-').toLowerCase()}.pdf`;

  return generatePDF({
    html: htmlContent,
    filename,
    format: 'A4',
  });
}

/**
 * Build HTML for solar proposal with Yield Bureau branding
 */
function buildSolarProposalHTML(
  prospectName: string,
  companyName: string,
  solarData: any,
  language: 'en' | 'ro' = 'en'
): string {
  const isRomanian = language === 'ro';

  const labels = {
    en: {
      title: 'Solar Investment Proposal',
      prospectName: 'Prospect Name',
      company: 'Company',
      systemSize: 'System Size',
      annualProduction: 'Annual Production',
      annualSavings: 'Annual Savings',
      systemCost: 'System Cost',
      netCost: 'Net Cost (After Incentive)',
      payback: 'Payback Period',
      savings20: '20-Year Savings',
      coverage: 'Solar Coverage',
      preparedBy: 'Prepared by',
      date: 'Date',
    },
    ro: {
      title: 'Analiză Investiție Solară',
      prospectName: 'Prospect',
      company: 'Companie',
      systemSize: 'Dimensiune Sistem',
      annualProduction: 'Producție Anuală',
      annualSavings: 'Economii Anuale',
      systemCost: 'Cost Sistem',
      netCost: 'Cost Net (După Incentiv)',
      payback: 'Perioada Rambursare',
      savings20: 'Economii 20 Ani',
      coverage: 'Acoperire Solară',
      preparedBy: 'Pregătit de',
      date: 'Data',
    },
  };

  const l = isRomanian ? labels.ro : labels.en;
  const currency = isRomanian ? 'RON' : 'USD';
  const currentDate = new Date().toLocaleDateString(isRomanian ? 'ro-RO' : 'en-US');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          color: ${BRANDING.colors.text};
          line-height: 1.6;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid ${BRANDING.colors.primary};
          padding-bottom: 20px;
        }
        .header h1 {
          color: ${BRANDING.colors.primary};
          margin: 0;
          font-size: 28px;
        }
        .header p {
          color: ${BRANDING.colors.secondary};
          margin: 5px 0 0 0;
          font-size: 14px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section h2 {
          color: ${BRANDING.colors.primary};
          font-size: 18px;
          border-bottom: 1px solid ${BRANDING.colors.accent};
          padding-bottom: 10px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        .info-item {
          background: ${BRANDING.colors.lightBg};
          padding: 12px;
          border-radius: 4px;
        }
        .info-label {
          font-weight: bold;
          color: ${BRANDING.colors.secondary};
          font-size: 12px;
        }
        .info-value {
          font-size: 16px;
          color: ${BRANDING.colors.text};
          margin-top: 4px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .footer-brand {
          font-weight: bold;
          color: ${BRANDING.colors.primary};
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${BRANDING.pdfCompanyName}</h1>
        <p>${BRANDING.pdfTagline}</p>
      </div>

      <div class="section">
        <h2>${l.title}</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">${l.prospectName}</div>
            <div class="info-value">${prospectName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${l.company}</div>
            <div class="info-value">${companyName}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>${l.systemSize}</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">${l.systemSize}</div>
            <div class="info-value">${solarData.financial?.systemKwp || 'N/A'} kWp</div>
          </div>
          <div class="info-item">
            <div class="info-label">${l.annualProduction}</div>
            <div class="info-value">${solarData.financial?.annualProductionKwh || 'N/A'} kWh</div>
          </div>
          <div class="info-item">
            <div class="info-label">${l.coverage}</div>
            <div class="info-value">${solarData.financial?.solarCoveragePct || 'N/A'}%</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>${l.annualSavings}</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">${l.annualSavings}</div>
            <div class="info-value">${solarData.financial?.annualSavingsRON || solarData.financial?.annualSavingsUSD || 'N/A'} ${currency}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${l.savings20}</div>
            <div class="info-value">${solarData.financial?.savings20YearsRON || solarData.financial?.savings20YearsUSD || 'N/A'} ${currency}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>${l.systemCost}</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">${l.systemCost}</div>
            <div class="info-value">${solarData.financial?.systemCostRON || solarData.financial?.systemCostUSD || 'N/A'} ${currency}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${l.netCost}</div>
            <div class="info-value">${solarData.financial?.netCostRON || solarData.financial?.netCostUSD || 'N/A'} ${currency}</div>
          </div>
          <div class="info-item">
            <div class="info-label">${l.payback}</div>
            <div class="info-value">${solarData.financial?.paybackYears || 'N/A'} ${isRomanian ? 'ani' : 'years'}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p><span class="footer-brand">${BRANDING.pdfCompanyName}</span></p>
        <p>${BRANDING.pdfFooterText}</p>
        <p>${l.preparedBy}: ${BRANDING.pdfCompanyName} | ${l.date}: ${currentDate}</p>
      </div>
    </body>
    </html>
  `;
}
