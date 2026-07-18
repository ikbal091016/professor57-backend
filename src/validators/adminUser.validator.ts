import { z } from "zod";

export const listUsersQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.enum(["student", "instructor", "admin"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(["student", "instructor", "admin"]),
  }),
});
