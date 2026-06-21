/**
 * Yield Bureau Branding Constants
 * Used across all client-facing output (PDFs, emails, web)
 */

export const BRANDING = {
  agencyName: 'Yield Bureau',
  agencyWebsite: 'https://yieldbur eau.com',
  agencyEmail: 'hello@yieldbur eau.com',
  agencyPhone: '+40 (contact for details)',
  
  // PDF Branding
  pdfFooterText: '© 2026 Yield Bureau. All rights reserved.',
  pdfCompanyName: 'Yield Bureau',
  pdfTagline: 'Solar Investment Analysis',
  
  // Email Branding
  emailSignature: `
Yield Bureau
Solar Investment Analysis
${process.env.VITE_APP_TITLE || 'Solar Qualification Platform'}
  `.trim(),
  
  // Service Provider References
  serviceProviderName: 'Yield Bureau',
  serviceProviderDescription: 'Professional solar investment analysis and qualification services',
  
  // Colors (for PDF and email templates)
  colors: {
    primary: '#2563eb', // Blue
    secondary: '#1e40af', // Dark Blue
    accent: '#fbbf24', // Amber
    text: '#1f2937', // Dark Gray
    lightBg: '#f9fafb', // Light Gray
  },
} as const;

export type BrandingConfig = typeof BRANDING;
