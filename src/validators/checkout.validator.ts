import { z } from "zod";

export const createCheckoutSchema = z.object({
  body: z.object({
    courseIds: z.array(z.string()).min(1).max(20),
    promotionCode: z.string().trim().optional(),
  }),
});
