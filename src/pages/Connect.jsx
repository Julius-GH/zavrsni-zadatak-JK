import { createSignal, createEffect, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { currentUser } from "../services/auth";
import { userService, coupleService } from "../services/db";
import { ConnectCodeSchema } from "../lib/schemas";
import { addToast } from "../components/Toast.jsx";

export default function Connect() {
    const navigate = useNavigate();
    const [code, setCode] = createSignal("");
    const [error, setError] = createSignal("");
    const [loading, setLoading] = createSignal(false);
    const [userDoc, setUserDoc] = createSignal(null);

    createEffect(async () => {
        const u = currentUser();
        if (!u) return;
        const data = await userService.getUser(u.uid);
        setUserDoc(data);
    });

    async function handleConnect(e) {
        e.preventDefault();
        setError("");

        const result = ConnectCodeSchema.safeParse({ code: code().trim().toUpperCase() });
        if (!result.success) {
            setError(result.error.errors[0].message);
            return;
        }

        setLoading(true);
        try {
            const u = currentUser();
            await coupleService.connectWithCode(u.uid, code().trim().toUpperCase());
            addToast("Uspješno spojeni s partnerom!", "success");
            navigate("/");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function handleCodeInput(e) {
        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        setCode(val);
    }

    async function copyCode() {
        const doc = userDoc();
        if (!doc?.connectCode) return;
        await navigator.clipboard.writeText(doc.connectCode);
    }

    return (
        <div class="flex flex-col items-center justify-center min-h-[70vh] p-4">
            <div class="card bg-base-100 shadow-xl w-full max-w-md">
                <div class="card-body gap-6">

                    <Show when={userDoc()?.coupleId}>
                        <div class="text-center">
                            <div class="text-5xl mb-3">💑</div>
                            <h1 class="text-2xl font-bold">Već si spojen/a!</h1>
                            <p class="text-base-content/60 text-sm mt-3">
                                Tvoj račun je već povezan s partnerom.
                            </p>
                            <a href="/" class="btn btn-primary mt-6 w-full">Idi na početnu ❤️</a>
                        </div>
                    </Show>

                    <Show when={!userDoc()?.coupleId}>
                        <div class="text-center">
                            <div class="text-5xl mb-3">💑</div>
                            <h1 class="text-2xl font-bold">Poveži se s partnerom</h1>
                            <p class="text-base-content/60 text-sm mt-1">
                                Podijelite kodove i povežite se
                            </p>
                        </div>

                        <div class="bg-base-200 rounded-2xl p-4 text-center">
                            <p class="text-sm text-base-content/60 mb-2">Tvoj kod za spajanje</p>
                            <Show
                                when={userDoc()?.connectCode}
                                fallback={<span class="loading loading-dots loading-md" />}
                            >
                                <div class="flex items-center justify-center gap-3">
                                    <span class="text-3xl font-mono font-bold tracking-widest text-primary">
                                        {userDoc()?.connectCode}
                                    </span>
                                    <button
                                        class="btn btn-ghost btn-sm btn-square"
                                        onClick={copyCode}
                                        title="Kopiraj kod"
                                    >
                                        📋
                                    </button>
                                </div>
                            </Show>
                            <p class="text-xs text-base-content/40 mt-2">
                                Pošalji ovaj kod svom partneru
                            </p>
                        </div>

                        <div class="divider text-xs text-base-content/40">ILI UNESI PARTNEROV KOD</div>

                        <form onSubmit={handleConnect} class="flex flex-col gap-4">
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text">Partnerov kod</span>
                                </label>
                                <input
                                    type="text"
                                    class="input input-bordered text-center text-xl font-mono tracking-widest uppercase"
                                    placeholder="ABC123"
                                    maxLength={6}
                                    value={code()}
                                    onInput={handleCodeInput}
                                    autocomplete="off"
                                    autocapitalize="characters"
                                />
                                <Show when={error()}>
                                    <label class="label">
                                        <span class="label-text-alt text-error">{error()}</span>
                                    </label>
                                </Show>
                            </div>

                            <button
                                type="submit"
                                class="btn btn-primary btn-lg w-full"
                                disabled={loading() || code().length < 6}
                            >
                                <Show when={loading()} fallback="Poveži se ❤️">
                                    <span class="loading loading-spinner loading-sm" />
                                    Spajanje...
                                </Show>
                            </button>
                        </form>
                    </Show>

                </div>
            </div>
        </div>
    );
}