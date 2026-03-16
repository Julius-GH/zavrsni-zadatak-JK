import { createSignal, Show } from "solid-js";
import { authService } from "../services/auth.js";
import { useNavigate } from "@solidjs/router";
import { SignInSchema } from "../lib/schemas.js";
import { addToast } from "../components/Toast.jsx";

export default function SignIn() {
    const navigate = useNavigate();

    const [validation, setValidation] = createSignal({});

    const handleSubmit = async (e) => {
        setValidation({});
        e.preventDefault();
        const data = new FormData(e.target);
        const email = data.get("email");
        const password = data.get("password");
        const formData = {
            email, password
        };

        try {
            const validated = SignInSchema.parse(formData);
            await authService.signIn(validated.email, validated.password);
            addToast("Prijava je uspjela", "success");
            navigate("/");
        } catch (error) {
            if (error.name === "ZodError") {
                const validationErrors = {};
                error.issues.forEach(e => {
                    validationErrors[e.path[0]] = e.message;
                });
                setValidation(validationErrors);
            } else {
                console.error(error.message);
                addToast("Greška prijave", "error");
            }
        }
    };

    return (
        <>
            <h1 class="text-2xl uppercase tracking-wider mb-2 w-full text-center">Prijava korisnika</h1>
            
            <form class="max-w-2xl m-auto" onSubmit={handleSubmit}>
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
                        <span>zaporka</span>
                    </label>
                    <Show when={validation().password}>
                        <p class="text-error text-xs mb-2">{validation().password}</p>
                    </Show>
                </div>


                <button type="submit" class="btn btn-primary">Potvrdi</button>
                <a class="btn btn-info ml-2" href="/user/resetpassword">Zaboravili ste zaporku?</a>
            </form>
        </>
    );
}