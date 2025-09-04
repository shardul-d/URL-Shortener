import z from "zod";

export const LoginInputSchema = z.object({
  username: z.string().min(3),
  password: z
    .string()
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/),
});
export type LoginInput = z.infer<typeof LoginInputSchema>

