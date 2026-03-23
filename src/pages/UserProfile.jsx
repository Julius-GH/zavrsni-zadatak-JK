import { createSignal, createEffect, Show } from "solid-js";
import { authService, isAuthenticated } from "../services/auth";
import { updateProfile } from "firebase/auth";
import { addToast } from "../components/Toast";

export default function UserProfile() {
    const [user, setUser] = createSignal(null);
    const [loading, setLoading] = createSignal(true);
    const [editing, setEditing] = createSignal(false);
    const [newDisplayName, setNewDisplayName] = createSignal("");

    createEffect(async () => {
        if (!isAuthenticated()) return;
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);

        setLoading(false);
    });

    const handleChangeName = async () => {
        if (!newDisplayName().trim()) return;

        try {
            await updateProfile(authService.getCurrentUser(), { displayName: newDisplayName() });
            setUser({ ...user(), displayName: newDisplayName() });
            setEditing(false);
            setNewDisplayName("");
        } catch (error) {
            console.error(error.message);
            addToast("Greška promjene imena", "error");
        }
    }

    return (
        <div class="max-w-4xl mx-auto p-4">
            <h1 class="text-3xl font-bold mb-6">Moj Profil</h1>

            <Show when={loading()}>
                <span class="loading loading-infinity loading-lg"></span>
            </Show>

            <Show when={!loading() && user()}>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {/* Podaci o korisniku */}
                    <div class="card bg-base-200">
                        <div class="card-body">
                            <h2 class="card-title text-lg">👤 Profil</h2>
                            <Show when={!editing()}>
                                <div class="flex gap-2 align-bottom">
                                    <p class="max-w-fit">Ime: {user().displayName || "Nije postavljeno"}</p>
                                    <button class="btn btn-xs btn-ghost"
                                        onClick={() => {
                                            setNewDisplayName(user().displayName || "");
                                            setEditing(true);
                                        }}
                                    >✏️</button>
                                </div>
                            </Show>
                            <Show when={editing()}>
                                <div class="flex gap-2 ">
                                    <input type="text"
                                        class="input input-sm input-bordered flex-1"
                                        placeholder="Novo ime"
                                        value={newDisplayName()}
                                        onInput={(e) => setNewDisplayName(e.target.value)}
                                    />
                                    <button class="btn btn-sm btn-ghost" onClick={handleChangeName}>✔️</button>
                                    <button class="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>❌</button>
                                </div>
                            </Show>
                            <p>E-mail: {user().email}</p>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}