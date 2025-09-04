import { z } from "zod";

export const RegistrationInputSchema = z.object({
  username: z.string().min(3),
  password: z
    .string()
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/),
});

export type RegistrationInput = z.infer<typeof RegistrationInputSchema>;
