import { z } from "zod";

export const SignUpSchema = z.object({
  name: z.string().min(2, "Ime mora imati najmanje 2 znaka"),
  email: z.email("E-mail adresa mora biti u ispravnom obliku"),
  password: z.string().min(6, "Zaporka mora imati najmanje 6 znakova"),
  passwordConfirm: z.string().min(6, "Potvrda zaporke je obavezna"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Zaporke se ne podudaraju",
  path: ["passwordConfirm"],
});

export const SignInSchema = z.object({
  email: z.email("E-mail adresa mora biti u ispravnom obliku"),
  password: z.string().min(6, "Zaporka mora imati najmanje 6 znakova"),
});

export const ConnectCodeSchema = z.object({
  code: z
    .string()
    .min(6, "Kod mora imati 6 znakova")
    .max(6, "Kod mora imati 6 znakova")
    .regex(/^[A-Z0-9]+$/i, "Kod smije sadržavati samo slova i brojeve"),
});

export const AnswerSchema = z.object({
  answer: z
    .string()
    .min(1, "Odgovor ne smije biti prazan")
    .max(500, "Odgovor ne smije biti duži od 500 znakova"),
});

export const MessageSchema = z.object({
  text: z
    .string()
    .min(1, "Poruka ne smije biti prazna")
    .max(1000, "Poruka ne smije biti duža od 1000 znakova"),
});

export const JournalEntrySchema = z.object({
  title: z
    .string()
    .min(1, "Naslov je obavezan")
    .max(100, "Naslov ne smije biti duži od 100 znakova"),
  text: z
    .string()
    .min(1, "Tekst je obavezan")
    .max(2000, "Tekst ne smije biti duži od 2000 znakova"),
  imageUrl: z.string().url("URL slike nije ispravan").optional().or(z.literal("")),
});