import z from "zod";

export const UpdateLinkInputParamsSchema = z.object({
  short_url: z.string().regex(/^[a-zA-Z0-9_-]{5,20}$/),
});
export type UpdateLinkInputParams = z.infer<typeof UpdateLinkInputParamsSchema>;

export const UpdateLinkInputBodySchema = z.object({
  original_url: z.url(),
});
export type UpdateLinkInputBody = z.infer<typeof UpdateLinkInputBodySchema>;
