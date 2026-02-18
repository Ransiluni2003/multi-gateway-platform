import { z } from 'zod';

export const PaymentCompletedSchema = z.object({
  id: z.string(),
  amount: z.number(),
  method: z.string(),
  status: z.string(),
  timestamp: z.string(),
  traceId: z.string().uuid().optional(),
});

export type PaymentCompleted = z.infer<typeof PaymentCompletedSchema>;
