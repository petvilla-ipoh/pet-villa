import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  password: z.string().min(8)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const petProfileSchema = z.object({
  name: z.string().min(1),
  breed: z.string().min(1),
  weightKg: z.number().min(1).max(12),
  vaccineStatus: z.enum(["valid", "expired", "unknown"]),
  habits: z.string().optional(),
  specialNeeds: z.string().optional(),
  hasAggression: z.boolean(),
  hasFleas: z.boolean()
});

export const bookingRequestSchema = z.object({
  petId: z.string().uuid(),
  hostId: z.string().uuid(),
  serviceType: z.enum(["overnight_boarding", "daycare"]),
  startAt: z.coerce.date(),
  endAt: z.coerce.date()
}).refine((value) => value.endAt > value.startAt, {
  message: "End time must be after start time.",
  path: ["endAt"]
});
