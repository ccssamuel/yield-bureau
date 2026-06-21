/**
 * Environment Configuration
 * 
 * Centralized configuration for API keys and external service credentials.
 * All sensitive values are loaded from environment variables at startup.
 */

/**
 * Solar API Configuration
 */
export const SOLAR_API_CONFIG = {
  // Google Solar API
  googleSolarApiKey: process.env.GOOGLE_SOLAR_API_KEY || "",
  googleSolarApiUrl: "https://solar.googleapis.com/v1",
  
  // Aurora Solar API (alternative)
  auroraSolarApiKey: process.env.AURORA_SOLAR_API_KEY || "",
  auroraSolarApiUrl: "https://api-sandbox.aurorasolar.com",
};

/**
 * AI/LLM Configuration
 */
export const AI_CONFIG = {
  // OpenAI GPT-4o
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: "gpt-4o",
  openaiApiUrl: "https://api.openai.com/v1",
};

/**
 * Email Delivery Configuration
 */
export const EMAIL_CONFIG = {
  // Postmark
  postmarkApiKey: process.env.POSTMARK_API_KEY || "",
  postmarkApiUrl: "https://api.postmarkapp.com",
};

/**
 * CRM Configuration
 */
export const CRM_CONFIG = {
  // HubSpot
  hubspotApiKey: process.env.HUBSPOT_API_KEY || "",
  hubspotApiUrl: "https://api.hubapi.com",
  
  // Pipedrive
  pipedriveApiKey: process.env.PIPEDRIVE_API_KEY || "",
  pipedriveApiUrl: "https://api.pipedrive.com/v1",
};

/**
 * PDF Generation Configuration
 */
export const PDF_CONFIG = {
  // Puppeteer or WeasyPrint settings
  format: "A4",
  margin: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20,
  },
};

/**
 * Webhook Configuration
 */
export const WEBHOOK_CONFIG = {
  // Webhook endpoint path
  qualifyPath: "/api/qualify",
  // Webhook timeout in milliseconds
  timeout: 30000,
};

/**
 * Validate that all required configuration is present.
 * Logs warnings for missing optional keys.
 */
export function validateConfig(): void {
  const warnings: string[] = [];

  // Check required keys
  if (!SOLAR_API_CONFIG.googleSolarApiKey && !SOLAR_API_CONFIG.auroraSolarApiKey) {
    warnings.push("No solar API key configured (GOOGLE_SOLAR_API_KEY or AURORA_SOLAR_API_KEY)");
  }

  if (!AI_CONFIG.openaiApiKey) {
    warnings.push("No OpenAI API key configured (OPENAI_API_KEY)");
  }

  if (warnings.length > 0) {
    console.warn("[Config] Configuration warnings:");
    warnings.forEach(w => console.warn(`  - ${w}`));
  }

  console.log("[Config] Environment configuration loaded successfully");
}
