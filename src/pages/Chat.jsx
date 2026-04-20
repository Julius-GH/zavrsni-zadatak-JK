import { createSignal, createEffect, Show, For, onCleanup } from "solid-js";
import { currentUser } from "../services/auth";
import { userService, chatService } from "../services/db";
import { MessageSchema } from "../lib/schemas";
import { addToast } from "../components/Toast";

export default function Chat() {
  const [userDoc, setUserDoc] = createSignal(null);
  const [partnerDoc, setPartnerDoc] = createSignal(null);
  const [messages, setMessages] = createSignal([]);
  const [text, setText] = createSignal("");
  const [loading, setLoading] = createSignal(true);
  const [sending, setSending] = createSignal(false);
  const [error, setError] = createSignal("");

  let bottomRef;
  let unsubUser, unsubPartner, unsubMessages;

  createEffect(() => {
    const u = currentUser();
    if (!u) return;

    unsubUser = userService.subscribeUser(u.uid, (data) => {
      setUserDoc(data);

      if (data?.partnerUid && !unsubPartner) {
        unsubPartner = userService.subscribeUser(data.partnerUid, (pd) => {
          setPartnerDoc(pd);
        });
      }

      if (data?.coupleId && !unsubMessages) {
        unsubMessages = chatService.subscribeMessages(data.coupleId, (msgs) => {
          setMessages(msgs);
          scrollToBottom();
        });
      }

      setLoading(false);
    });
  });

  onCleanup(() => {
    unsubUser?.();
    unsubPartner?.();
    unsubMessages?.();
  });

  function scrollToBottom() {
    setTimeout(() => bottomRef?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function handleSend(e) {
    e.preventDefault();
    setError("");

    const result = MessageSchema.safeParse({ text: text().trim() });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSending(true);
    try {
      await chatService.sendMessage(userDoc().coupleId, currentUser().uid, text().trim());
      setText("");
    } catch {
      addToast("Greška pri slanju poruke", "error");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  function formatTime(ts) {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDateSeparator(ts) {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);

    if (date.toDateString() === today.toDateString()) return "Danas";
    if (date.toDateString() === yesterday.toDateString()) return "Jučer";
    return date.toLocaleDateString("hr-HR", { day: "numeric", month: "long", year: "numeric" });
  }

  function groupedMessages() {
    const msgs = messages();
    const groups = [];
    let lastDate = null;

    for (const msg of msgs) {
      const ts = msg.createdAt;
      if (!ts) continue;
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      const dateStr = date.toDateString();

      if (dateStr !== lastDate) {
        groups.push({ type: "separator", label: formatDateSeparator(ts), key: dateStr });
        lastDate = dateStr;
      }
      groups.push({ type: "message", ...msg });
    }
    return groups;
  }

  const myUid = () => currentUser()?.uid;
  const partnerName = () => partnerDoc()?.name?.split(" ")[0] ?? "Partner";

  return (
    <div class="max-w-2xl mx-auto flex flex-col" style="height: calc(100vh - 140px);">

      <Show when={loading()}>
        <div class="flex justify-center items-center flex-1">
          <span class="loading loading-spinner loading-lg" />
        </div>
      </Show>

      <Show when={!loading()}>

        <div class="flex items-center gap-3 px-2 py-3 border-b border-base-300">
          <div class="avatar placeholder">
            <div class="bg-primary/20 text-primary rounded-full w-9">
              <span class="text-lg">{partnerDoc()?.name?.[0] ?? "?"}</span>
            </div>
          </div>
          <div>
            <p class="font-semibold leading-none">{partnerDoc()?.name ?? "Partner"}</p>
            <Show when={partnerDoc()?.mood}>
              <p class="text-xs text-base-content/50 mt-0.5">
                {partnerDoc().mood.emoji} {partnerDoc().mood.label}
              </p>
            </Show>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-1">

          <Show when={messages().length === 0}>
            <div class="flex flex-col items-center justify-center flex-1 gap-2 text-base-content/30 text-sm">
              <span class="text-4xl">💬</span>
              <p>Još nema poruka. Pozdravite se! 👋</p>
            </div>
          </Show>

          <For each={groupedMessages()}>
            {(item) => (
              <>
                <Show when={item.type === "separator"}>
                  <div class="flex items-center gap-2 my-2">
                    <div class="flex-1 h-px bg-base-300" />
                    <span class="text-xs text-base-content/40">{item.label}</span>
                    <div class="flex-1 h-px bg-base-300" />
                  </div>
                </Show>

                <Show when={item.type === "message"}>
                  <div class={`flex ${item.uid === myUid() ? "justify-end" : "justify-start"}`}>
                    <div
                      class={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed
                        ${item.uid === myUid()
                          ? "bg-primary text-primary-content rounded-br-sm"
                          : "bg-base-200 text-base-content rounded-bl-sm"
                        }`}
                    >
                      <p class="whitespace-pre-wrap wrap-break-word">{item.text}</p>
                      <p class={`text-xs mt-1 ${item.uid === myUid() ? "text-primary-content/60 text-right" : "text-base-content/40"}`}>
                        {formatTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </Show>
              </>
            )}
          </For>
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          class="flex items-end gap-2 px-2 py-3 border-t border-base-300"
        >
          <div class="flex-1 flex flex-col gap-1">
            <textarea
              class="textarea textarea-bordered w-full resize-none leading-relaxed"
              rows={1}
              placeholder={`Poruka za ${partnerName()}...`}
              maxLength={1000}
              value={text()}
              onInput={(e) => {
                setText(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={handleKeyDown}
            />
            <Show when={error()}>
              <span class="text-xs text-error">{error()}</span>
            </Show>
          </div>
          <button
            type="submit"
            class="btn btn-primary btn-square shrink-0"
            disabled={sending() || text().trim().length === 0}
            title="Pošalji (Enter)"
          >
            <Show when={sending()} fallback={
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            }>
              <span class="loading loading-spinner loading-xs" />
            </Show>
          </button>
        </form>

      </Show>
    </div>
  );
}