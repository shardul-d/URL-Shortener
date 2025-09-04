import z from "zod";

export const RedirectParamsSchema = z.object({
  short_url: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{5,20}$/),
});
export type RedirectParams = z.infer<typeof RedirectParamsSchema>;
