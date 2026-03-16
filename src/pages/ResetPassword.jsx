import { createSignal, Show } from "solid-js";
import { authService } from "../services/auth.js";
import Message from "../components/Message.jsx";
import { addToast } from "../components/Toast.jsx";

export default function ResetPassword() {
    const [success, setSuccess] = createSignal(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const email = data.get("email");

        try {
            await authService.passwordReset(email);
            setSuccess(true);
        } catch (error) {
            console.error(error.message);
            addToast("Greška promjene zaporke", "error");
        }

    };

    return (
        <>
            <h1 class="text-2xl uppercase tracking-wider mb-2 w-full text-center">Zaboravljena zaporka</h1>

            <Show when={!success()}>
                <form class="max-w-2xl m-auto" onSubmit={handleSubmit}>
                    <label class="floating-label mb-1 w-full">
                        <input class="input input-md w-full" type="email" name="email" placeholder="E-mail adresa" required="true" />
                        <span>E-mail adresa</span>
                    </label>

                    <button type="submit" class="btn btn-primary">Potvrdi</button>
                </form>
            </Show>

            <Show when={success()}>
                <Message message="Na e-mail adresu ste primili upute za ponovno postavljanje zaporke" />
            </Show>
        </>
    );
}