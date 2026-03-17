import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const LoginResponseSchema = z.object({
  ok: z.literal(true),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(["worker", "impresa"]),
  redirectTo: z.string()
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
