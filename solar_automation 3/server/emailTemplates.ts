import { BRANDING } from '../shared/branding';

/**
 * Email templates with Yield Bureau branding
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Build email signature with Yield Bureau branding
 */
function getEmailSignature(language: 'en' | 'ro' = 'en'): string {
  const isRomanian = language === 'ro';
  
  return `
---
${BRANDING.agencyName}
${BRANDING.serviceProviderDescription}
${isRomanian ? 'Email' : 'Email'}: ${BRANDING.agencyEmail}
${isRomanian ? 'Telefon' : 'Phone'}: ${BRANDING.agencyPhone}
${isRomanian ? 'Website' : 'Website'}: ${BRANDING.agencyWebsite}

© 2026 ${BRANDING.agencyName}. ${isRomanian ? 'Toate drepturile rezervate.' : 'All rights reserved.'}
  `.trim();
}

/**
 * Solar proposal email template
 */
export function getSolarProposalEmail(
  prospectName: string,
  companyName: string,
  proposalUrl: string,
  language: 'en' | 'ro' = 'en'
): EmailTemplate {
  const isRomanian = language === 'ro';

  const subject = isRomanian
    ? `Analiză Investiție Solară - ${companyName}`
    : `Solar Investment Proposal - ${companyName}`;

  const greeting = isRomanian ? 'Bună,' : 'Hello,';
  const intro = isRomanian
    ? `Vă trimit în atașament analiza investiției solare pentru ${companyName}.`
    : `Please find attached the solar investment analysis for ${companyName}.`;
  
  const nextSteps = isRomanian
    ? 'Următorii pași:'
    : 'Next steps:';
  
  const review = isRomanian
    ? 'Revizuiți propunerea și contactați-mă cu întrebări'
    : 'Review the proposal and contact me with any questions';
  
  const schedule = isRomanian
    ? 'Programați o consultație pentru a discuta detaliile'
    : 'Schedule a consultation to discuss the details';

  const html = `
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          color: ${BRANDING.colors.primary};
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .content {
          margin-bottom: 30px;
        }
        .signature {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
          white-space: pre-wrap;
        }
        .brand {
          color: ${BRANDING.colors.primary};
          font-weight: bold;
        }
        ul {
          margin: 15px 0;
          padding-left: 20px;
        }
        li {
          margin: 8px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><span class="brand">${BRANDING.agencyName}</span></div>
        
        <div class="content">
          <p>${greeting}</p>
          <p>${intro}</p>
          
          <p><strong>${nextSteps}</strong></p>
          <ul>
            <li>${review}</li>
            <li>${schedule}</li>
          </ul>
        </div>

        <div class="signature">
${getEmailSignature(language)}
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${greeting}

${intro}

${nextSteps}
- ${review}
- ${schedule}

${getEmailSignature(language)}
  `.trim();

  return { subject, html, text };
}

/**
 * Lead qualification confirmation email
 */
export function getQualificationConfirmationEmail(
  prospectName: string,
  companyName: string,
  language: 'en' | 'ro' = 'en'
): EmailTemplate {
  const isRomanian = language === 'ro';

  const subject = isRomanian
    ? `Confirmarea Calificării Solare - ${companyName}`
    : `Solar Qualification Confirmation - ${companyName}`;

  const greeting = isRomanian ? 'Bună,' : 'Hello,';
  const message = isRomanian
    ? `Mulțumim că ați trimis informațiile pentru ${companyName}. Am analizat proprietatea și vă vom contacta în curând cu rezultatele.`
    : `Thank you for submitting information for ${companyName}. We have reviewed the property and will contact you soon with the results.`;
  
  const timeframe = isRomanian
    ? 'Vă vom contacta în următoarele 24-48 de ore.'
    : 'We will contact you within 24-48 hours.';

  const html = `
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          color: ${BRANDING.colors.primary};
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .content {
          margin-bottom: 30px;
        }
        .signature {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #666;
          white-space: pre-wrap;
        }
        .brand {
          color: ${BRANDING.colors.primary};
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><span class="brand">${BRANDING.agencyName}</span></div>
        
        <div class="content">
          <p>${greeting}</p>
          <p>${message}</p>
          <p><strong>${timeframe}</strong></p>
        </div>

        <div class="signature">
${getEmailSignature(language)}
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${greeting}

${message}

${timeframe}

${getEmailSignature(language)}
  `.trim();

  return { subject, html, text };
}
