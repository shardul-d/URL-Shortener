import z from "zod";

export const DeleteLinkInputSchema = z.object({
  short_url: z.string().regex(/^[a-zA-Z0-9_-]{5,20}$/),
});
export type DeleteLinkInput = z.infer<typeof DeleteLinkInputSchema>;
