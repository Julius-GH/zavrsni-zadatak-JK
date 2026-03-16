import { z } from "zod";

export const SignUpSchema = z.object({
    name: z.string().min(2, "Ime mora imati najmanje 2 znaka"),
    email: z.email("E-mail adresa mora biti u ispravnom obliku"),
    password: z.string().min(6, "Zaporka mora imati najmanje 6 znakova"),
    passwordConfirm: z.string().min(6, "Potvrda zaporke je obavezna")
}).refine(data => data.password === data.passwordConfirm, {
    message: "Zaporke se ne podudaraju",
    path: ["passwordConfirm"]
});

export const SignInSchema = z.object({
    email: z.email("E-mail adresa mora biti u ispravnom obliku"),
    password: z.string().min(6, "Zaporka mora imati najmanje 6 znakova")
});