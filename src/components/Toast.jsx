import { createSignal, For } from "solid-js";

export const [toasts, setToasts] = createSignal([]);
let id = 0;

export const addToast = (message, type = "info", duration = 4000) => {
    const toastId = id++;
    const newToast = { id: toastId, message, type };
    setToasts([...toasts(), newToast]);

    if (duration > 0) {
        setTimeout(() => {
            setToasts(currentToasts => currentToasts.filter(toast => toast.id !== toastId));
        }, duration);
    }

    return toastId;
};

export const removeToast = (toastId) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== toastId));
};

export default function Toast() {
    return (
        <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            <For each={toasts()}>
                {(toast) => (
                    <div class={`alert alert-${toast.type}`} role="alert">
                        <span>{toast.message}</span>
                        <button onClick={() => removeToast(toast.id)} class="btn btn-sm btn-ghost">x</button>
                    </div>
                )}
            </For>
        </div>
    );
}