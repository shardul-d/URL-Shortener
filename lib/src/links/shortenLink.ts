import z from "zod";

export const ShortenLinkInputSchema = z.object({
  short_url: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{5,20}$/, {message: "Custom alias must contain 5-20 characters and contain only lowercase, uppercase, numeric, underscore, hyphen characters."})
    .optional(),
  original_url: z.url({ message: "Please enter a valid URL" }),
  expires_at: z.coerce.date().refine(
      (date) => date > new Date(),
      {
        message: "Expiry time must be in the future"
      }
    ).optional(),
});
export type ShortenLinkInput = z.infer<typeof ShortenLinkInputSchema>;

export const ShortenLinkResponseSchema = z.object({
  short_url: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{5,20}$/),
});
export type ShortenLinkResponse = z.infer<typeof ShortenLinkResponseSchema>
