# Solar Automation Backend - TODO

## Infrastructure Setup
- [x] Initialize WebDev project with FastAPI backend
- [x] Add leads database table with schema
- [x] Configure environment variables for API keys (Google Solar API, OpenAI)
- [x] Create POST /qualify webhook endpoint
- [x] Create GET /health endpoint
- [x] Scaffold PDF generation infrastructure (WeasyPrint stub)
- [x] Deploy and verify endpoints are live

## Critical Infrastructure Blockers
- [x] ISSUE 1: Install and configure Redis for address caching (SHA256 key, 86400s TTL)
- [x] ISSUE 2: Select and confirm PDF library (Puppeteer or PDFKit)
- [x] ISSUE 3: Define permanent deployment strategy (Railway/Render/Fly.io/VPS)

## Sprint 2: Google Solar API Integration
- [x] Build googleSolarService.ts with getSolarData function
- [x] Implement cache check (SHA256 key, 86400s TTL)
- [x] Implement geocoding via Google Maps API
- [x] Implement Solar API call with 10s timeout
- [x] Implement response validation (5 required fields)
- [x] Implement financial matching logic
- [x] Write integration tests (11 tests, all passing)

## Sprint 3: OpenAI + Webhook Handler
- [ ] Build openaiService.ts with generateExecutiveSummary function
- [ ] Implement pre-flight validation gate for solar data
- [ ] Implement hallucination detection for OpenAI responses
- [ ] Build rate limiting middleware (5 req/IP/60min)
- [ ] Wire up POST /qualify webhook with full pipeline
- [ ] Input validation for webhook (email, bill, address)
- [ ] Error handling and HTTP status codes (400, 422, 429)
- [ ] Integration tests for full pipeline
- [ ] Rate limit enforcement tests
- [ ] OpenAI timeout handling tests

## Future Integrations
- [ ] PDF generation with Puppeteer (already scaffolded)
- [ ] Postmark email delivery
- [ ] CRM integration (HubSpot/Pipedrive)
- [ ] Lead qualification pipeline logic


## Sprint 4: Romanian Market Implementation
- [x] Remove US financialAnalyses matching logic from googleSolarService.ts
- [x] Add calculateRomanianFinancials function
- [x] Implement Romanian financial calculations (7 metrics)
- [x] Add environment variables for Romanian market parameters
- [x] Verify environment variables at runtime (4 tests passing)
- [x] Update openaiService.ts with language parameter (Romanian support)
- [x] Update Romanian OpenAI prompt to reference netCostRON
- [x] Create Romanian API response fixture
- [x] Write unit tests for all 7 financial calculation functions (24 tests)
- [x] Write Romanian language support tests (6 tests passing)
- [x] Verify all calculations with known input/output values
- [ ] Update PDF service for Romanian localization (Sprint 5)
- [ ] Write integration tests with Romanian fixture (Sprint 5)

## Sprint 5: PDF Generation & Webhooks
- [ ] Wire up POST /qualify webhook handler
- [ ] Integrate googleSolarService with webhook
- [ ] Integrate openaiService with webhook
- [ ] Implement pdfService.ts with Romanian localization
- [ ] PDF generation with Puppeteer
- [ ] Email delivery integration (Postmark)
- [ ] End-to-end webhook tests


## Branding: Yield Bureau
- [x] Add "Yield Bureau" to PDF footer branding
- [x] Add "Yield Bureau" to email signature templates
- [x] Add "Yield Bureau" to default service provider references
- [x] Create branding constants file for consistent usage
