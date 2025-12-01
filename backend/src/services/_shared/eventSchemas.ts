import { z } from 'zod';

export const PaymentCompletedSchema = z.object({
  traceId: z.string().uuid().optional(),
  paymentId: z.string(),
  amount: z.number(),
  userId: z.string(),
  status: z.enum(['succeeded','failed'])
});

export type PaymentCompleted = z.infer<typeof PaymentCompletedSchema>;
