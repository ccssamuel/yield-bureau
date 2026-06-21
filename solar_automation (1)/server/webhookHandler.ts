import { Request, Response } from "express";
import { createLead } from "./db";

/**
 * Webhook handler for solar qualification requests.
 * Validates payload and logs lead to database.
 */
export async function handleQualifyWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { company_name, street_address, city, country, email, avg_bill_eur } = req.body;

    // Validate required fields
    if (!company_name || !street_address || !city || !country || !email || avg_bill_eur === undefined) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: company_name, street_address, city, country, email, avg_bill_eur",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
      return;
    }

    // Validate avg_bill_eur is a positive number
    if (typeof avg_bill_eur !== "number" || avg_bill_eur <= 0) {
      res.status(400).json({
        success: false,
        error: "avg_bill_eur must be a positive number",
      });
      return;
    }

    // Log the lead to database
    const address = `${street_address}, ${city}, ${country}`;
    const lead = await createLead({
      companyName: company_name,
      address,
      email,
      avgBillEur: avg_bill_eur,
      status: "received",
    });

    if (!lead) {
      res.status(500).json({
        success: false,
        error: "Failed to create lead record",
      });
      return;
    }

    console.log(`[Webhook] Lead received: ${company_name} (ID: ${lead.id})`);

    res.status(200).json({
      success: true,
      leadId: lead.id,
      message: "Lead received and logged successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Webhook] Error processing qualification:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
