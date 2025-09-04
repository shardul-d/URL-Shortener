import z from "zod";

export const GetLinkStatsByCountryInputSchema = z.object({
  short_url: z.string().regex(/^[a-zA-Z0-9_-]{5,20}$/),
});
export type GetLinkStatsByCountryInput = z.infer<
  typeof GetLinkStatsByCountryInputSchema
>;

export const GetLinkStatsByCountryResponseSchema = z.array(
  z.object({
    countryName: z.string(),
    clicks: z.number(),
  })
);
export type GetLinkStatsByCountry = z.infer<typeof GetLinkStatsByCountryResponseSchema>;