import { describe, expect, it } from "vitest";
import axios from "axios";

/**
 * Integration tests for webhook and health check endpoints.
 * These tests verify the infrastructure is properly set up and responding.
 */

const BASE_URL = "http://localhost:3000";

describe("Webhook and Health Check Endpoints", () => {
  describe("GET /health", () => {
    it("should return HTTP 200 with status OK", async () => {
      const response = await axios.get(`${BASE_URL}/health`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("status");
      expect(response.data.status).toBe("OK");
      expect(response.data).toHaveProperty("timestamp");
    });

    it("should return a valid ISO timestamp", async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      const timestamp = new Date(response.data.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe("POST /qualify (public endpoint)", () => {
    it("should accept a valid qualification payload and return HTTP 200", async () => {
      const payload = {
        company_name: "Test Solar Company",
        street_address: "123 Main Street",
        city: "San Francisco",
        country: "USA",
        email: "contact@testsolar.com",
        avg_bill_eur: 5000,
      };

      const response = await axios.post(`${BASE_URL}/qualify`, payload);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("success");
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty("leadId");
      expect(response.data).toHaveProperty("message");
      expect(response.data.message).toContain("successfully");
    });

    it("should reject missing required fields with HTTP 400", async () => {
      const incompletePayload = {
        company_name: "Test Company",
        // Missing other required fields
      };

      try {
        await axios.post(`${BASE_URL}/qualify`, incompletePayload);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain("Missing required fields");
      }
    });

    it("should reject invalid email format with HTTP 400", async () => {
      const payload = {
        company_name: "Test Company",
        street_address: "123 Main Street",
        city: "San Francisco",
        country: "USA",
        email: "invalid-email",
        avg_bill_eur: 5000,
      };

      try {
        await axios.post(`${BASE_URL}/qualify`, payload);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain("Invalid email");
      }
    });

    it("should reject negative avg_bill_eur with HTTP 400", async () => {
      const payload = {
        company_name: "Test Company",
        street_address: "123 Main Street",
        city: "San Francisco",
        country: "USA",
        email: "contact@test.com",
        avg_bill_eur: -1000,
      };

      try {
        await axios.post(`${BASE_URL}/qualify`, payload);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error).toContain("positive number");
      }
    });

    it("should include timestamp in response", async () => {
      const payload = {
        company_name: "Test Company",
        street_address: "123 Main Street",
        city: "San Francisco",
        country: "USA",
        email: "contact@test.com",
        avg_bill_eur: 5000,
      };

      const response = await axios.post(`${BASE_URL}/qualify`, payload);

      expect(response.data).toHaveProperty("timestamp");
      const timestamp = new Date(response.data.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe("POST /api/qualify (API endpoint)", () => {
    it("should accept a valid qualification payload and return HTTP 200", async () => {
      const payload = {
        company_name: "API Test Company",
        street_address: "456 Oak Avenue",
        city: "Los Angeles",
        country: "USA",
        email: "api@test.com",
        avg_bill_eur: 3500,
      };

      const response = await axios.post(`${BASE_URL}/api/qualify`, payload);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("success");
      expect(response.data.success).toBe(true);
      expect(response.data).toHaveProperty("leadId");
      expect(response.data).toHaveProperty("message");
    });

    it("should handle the same validation as /qualify", async () => {
      const payload = {
        company_name: "Test",
        street_address: "123 St",
        city: "City",
        country: "Country",
        email: "invalid",
        avg_bill_eur: 5000,
      };

      try {
        await axios.post(`${BASE_URL}/api/qualify`, payload);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain("Invalid email");
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON gracefully on /qualify", async () => {
      try {
        await axios.post(`${BASE_URL}/qualify`, "invalid json", {
          headers: { "Content-Type": "application/json" },
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        // Should return 400 for malformed JSON
        expect([400, 500]).toContain(error.response?.status);
      }
    });

    it("should handle malformed JSON gracefully on /api/qualify", async () => {
      try {
        await axios.post(`${BASE_URL}/api/qualify`, "invalid json", {
          headers: { "Content-Type": "application/json" },
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        // Should return 400 for malformed JSON
        expect([400, 500]).toContain(error.response?.status);
      }
    });
  });
});
