import { z } from "zod";

/** The signed-in Account, as the `me` procedure returns it. */
export const accountSchema = z.object({
  id: z.string().min(1),
  email: z.email(),
});

export type Account = z.infer<typeof accountSchema>;
