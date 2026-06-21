import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createLead, getLeads } from "./db";
import { z } from "zod";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Solar qualification webhook and leads management
  leads: router({
    // Log a new lead from webhook payload
    create: publicProcedure
      .input(
        z.object({
          companyName: z.string().min(1, "Company name is required"),
          streetAddress: z.string().min(1, "Street address is required"),
          city: z.string().min(1, "City is required"),
          country: z.string().min(1, "Country is required"),
          email: z.string().email("Valid email is required"),
          avgBillEur: z.number().positive("Average bill must be positive"),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const address = `${input.streetAddress}, ${input.city}, ${input.country}`;
          const lead = await createLead({
            companyName: input.companyName,
            address,
            email: input.email,
            avgBillEur: input.avgBillEur,
            status: "received",
          });

          if (!lead) {
            throw new Error("Failed to create lead");
          }

          return {
            success: true,
            leadId: lead.id,
            message: "Lead received and logged successfully",
          };
        } catch (error) {
          console.error("[Leads] Failed to create lead:", error);
          throw error;
        }
      }),

    // Get all leads (admin only)
    list: publicProcedure
      .input(
        z.object({
          status: z.enum(["received", "processing", "qualified", "rejected"]).optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        try {
          const leads_data = await getLeads(input?.status);
          return {
            success: true,
            count: leads_data.length,
            leads: leads_data,
          };
        } catch (error) {
          console.error("[Leads] Failed to fetch leads:", error);
          throw error;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
