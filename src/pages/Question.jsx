import { createSignal, createEffect, Show, onCleanup } from "solid-js";
import { currentUser } from "../services/auth";
import { userService, questionService } from "../services/db";
import { AnswerSchema } from "../lib/schemas";
import { addToast } from "../components/Toast";

export default function Question() {
  const [userDoc, setUserDoc] = createSignal(null);
  const [partnerDoc, setPartnerDoc] = createSignal(null);
  const [todayAnswers, setTodayAnswers] = createSignal(null);
  const [answer, setAnswer] = createSignal("");
  const [editing, setEditing] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  let unsubUser, unsubPartner, unsubAnswers;

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

      if (data?.coupleId && !unsubAnswers) {
        unsubAnswers = questionService.subscribeTodayAnswers(data.coupleId, (ad) => {
          setTodayAnswers(ad);
          const myAnswer = ad?.answers?.[u.uid];
          if (myAnswer && !editing()) setAnswer(myAnswer);
        });
      }

      setLoading(false);
    });
  });

  onCleanup(() => {
    unsubUser?.();
    unsubPartner?.();
    unsubAnswers?.();
  });

  const question = questionService.getTodayQuestion();
  const myUid = () => currentUser()?.uid;
  const myAnswer = () => todayAnswers()?.answers?.[myUid()];
  const partnerAnswer = () => todayAnswers()?.answers?.[userDoc()?.partnerUid];
  const partnerName = () => partnerDoc()?.name?.split(" ")[0] ?? "Partner";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const result = AnswerSchema.safeParse({ answer: answer().trim() });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      await questionService.saveAnswer(
        userDoc().coupleId,
        myUid(),
        answer().trim()
      );
      setEditing(false);
      addToast("Odgovor spremljen! ✨", "success");
    } catch (err) {
      addToast("Greška pri spremanju odgovora", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="max-w-2xl mx-auto p-4 flex flex-col gap-6">

      <Show when={loading()}>
        <div class="flex justify-center items-center min-h-[50vh]">
          <span class="loading loading-spinner loading-lg" />
        </div>
      </Show>

      <Show when={!loading()}>

        <div>
          <p class="text-sm text-base-content/50 uppercase tracking-widest mb-1">
            Pitanje dana
          </p>
          <h1 class="text-2xl font-bold leading-snug">"{question}"</h1>
        </div>

        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-4 gap-3">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">
                Tvoj odgovor
              </h2>
              <Show when={myAnswer() && !editing()}>
                <button
                  class="btn btn-ghost btn-xs"
                  onClick={() => setEditing(true)}
                >
                  ✏️ Uredi
                </button>
              </Show>
            </div>

            <Show when={myAnswer() && !editing()}>
              <div class="bg-primary/10 rounded-xl px-4 py-3 text-base-content/80">
                {myAnswer()}
              </div>
            </Show>

            <Show when={!myAnswer() || editing()}>
              <form onSubmit={handleSubmit} class="flex flex-col gap-3">
                <textarea
                  class="textarea textarea-bordered w-full resize-none"
                  rows={4}
                  placeholder="Napiši svoj odgovor..."
                  maxLength={500}
                  value={answer()}
                  onInput={(e) => setAnswer(e.target.value)}
                />
                <div class="flex items-center justify-between">
                  <span class="text-xs text-base-content/40">
                    {answer().length}/500
                  </span>
                  <Show when={error()}>
                    <span class="text-xs text-error">{error()}</span>
                  </Show>
                </div>
                <div class="flex gap-2 justify-end">
                  <Show when={editing()}>
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditing(false);
                        setAnswer(myAnswer() ?? "");
                      }}
                    >
                      Odustani
                    </button>
                  </Show>
                  <button
                    type="submit"
                    class="btn btn-primary btn-sm"
                    disabled={saving() || answer().trim().length === 0}
                  >
                    <Show when={saving()} fallback="Spremi odgovor">
                      <span class="loading loading-spinner loading-xs" />
                      Spremanje...
                    </Show>
                  </button>
                </div>
              </form>
            </Show>
          </div>
        </div>

        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-4 gap-3">
            <h2 class="font-semibold">Odgovor — {partnerName()}</h2>

            <Show when={partnerAnswer()}>
              <div class="bg-base-200 rounded-xl px-4 py-3 text-base-content/80">
                {partnerAnswer()}
              </div>
            </Show>

            <Show when={!partnerAnswer()}>
              <div class="flex items-center gap-3 text-base-content/40 text-sm py-2">
                <span class="loading loading-dots loading-sm" />
                {partnerName()} još nije odgovorio/la...
              </div>
            </Show>
          </div>
        </div>

        <a href="/" class="btn btn-ghost btn-sm w-fit">
          ← Natrag na početnu
        </a>

      </Show>
    </div>
  );
}