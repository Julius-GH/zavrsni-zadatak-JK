import { createSignal, Show } from "solid-js";
import { authService } from "../services/auth.js";
import Message from "../components/Message.jsx";
import { SignUpSchema } from "../lib/schemas.js";
import { addToast } from "../components/Toast.jsx";

export default function SignUp() {
    const [success, setSuccess] = createSignal(false);
    const [validation, setValidation] = createSignal([]);

    const handleSubmit = async (e) => {
        setValidation({});
        e.preventDefault();
        const data = new FormData(e.target);
        const name = data.get("name");
        const email = data.get("email");
        const password = data.get("password");
        const passwordConfirm = data.get("passwordConfirm");
        const formData = {
            name, email, password, passwordConfirm
        };

        try {
            const validated = SignUpSchema.parse(formData);
            await authService.signUp(validated.email, validated.password, validated.name);
            setSuccess(true);
        } catch (error) {
            if (error.name === "ZodError") {
                const validationErrors = {};
                error.issues.forEach(e => {
                    validationErrors[e.path[0]] = e.message;
                });
                setValidation(validationErrors);
            } else {
                console.error(error.message);
                addToast("Greška registracije", "error");
            }
        }
    };

    return (
        <>
            <h1 class="text-2xl uppercase tracking-wider mb-2 w-full text-center">Registracija korisnika</h1>

            <Show when={!success()}>
                <form class="max-w-2xl m-auto" onSubmit={handleSubmit}>
                    <div>
                        <label class="floating-label mb-1 w-full">
                            <input class="input input-md w-full" type="text" name="name" placeholder="Ime" required="true" />
                            <span>Ime</span>
                        </label>
                        <Show when={validation().name}>
                            <p class="text-error text-xs mb-2">{validation().name}</p>
                        </Show>
                    </div>


                    <div>
                        <label class="floating-label mb-1 w-full">
                            <input class="input input-md w-full" type="email" name="email" placeholder="E-mail adresa" required="true" />
                            <span>E-mail adresa</span>
                        </label>
                        <Show when={validation().email}>
                            <p class="text-error text-xs mb-2">{validation().email}</p>
                        </Show>
                    </div>

                    <div>
                        <label class="floating-label mb-1">
                            <input class="input input-md w-full" type="password" name="password" placeholder="Zaporka" required="true" />
                            <span>Zaporka</span>
                        </label>
                        <Show when={validation().password}>
                            <p class="text-error text-xs mb-2">{validation().password}</p>
                        </Show>
                    </div>

                    <div>
                        <label class="floating-label mb-1">
                            <input class="input input-md w-full" type="password" name="passwordConfirm" placeholder="Potvrda zaporke" required="true" />
                            <span>Potvrda zaporke</span>
                        </label>
                        <Show when={validation().passwordConfirm}>
                            <p class="text-error text-xs mb-2">{validation().passwordConfirm}</p>
                        </Show>
                    </div>


                    <button type="submit" class="btn btn-primary">Potvrdi</button>
                </form>
            </Show>

            <Show when={success()}>
                <Message message="Uspješno ste napravili korisnički račun" />
            </Show>
        </>
    );
}