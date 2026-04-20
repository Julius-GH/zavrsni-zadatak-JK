import { createSignal, createEffect, Show, onCleanup, For } from "solid-js";
import { currentUser } from "../services/auth";
import {
  userService,
  coupleService,
  questionService,
  moodService,
  MOODS,
} from "../services/db";
import { addToast } from "../components/Toast";

export default function Home() {
  const [userDoc, setUserDoc] = createSignal(null);
  const [partnerDoc, setPartnerDoc] = createSignal(null);
  const [coupleDoc, setCoupleDoc] = createSignal(null);
  const [todayAnswers, setTodayAnswers] = createSignal(null);
  const [loading, setLoading] = createSignal(true);

  let unsubUser, unsubPartner, unsubCouple, unsubAnswers;

  createEffect(() => {
    const u = currentUser();
    if (!u) return;

    unsubUser = userService.subscribeUser(u.uid, async (data) => {
      setUserDoc(data);

      if (data?.coupleId && data?.partnerUid) {
        if (!unsubPartner) {
          unsubPartner = userService.subscribeUser(data.partnerUid, (pd) => {
            setPartnerDoc(pd);
          });
        }
        if (!unsubCouple) {
          unsubCouple = coupleService.subscribeCouple(data.coupleId, (cd) => {
            setCoupleDoc(cd);
          });
        }
        if (!unsubAnswers) {
          unsubAnswers = questionService.subscribeTodayAnswers(data.coupleId, (ad) => {
            setTodayAnswers(ad);
          });
        }
      }

      setLoading(false);
    });
  });

  onCleanup(() => {
    unsubUser?.();
    unsubPartner?.();
    unsubCouple?.();
    unsubAnswers?.();
  });

  async function handleMood(mood) {
    const u = currentUser();
    if (!u) return;
    try {
      await moodService.setMood(u.uid, mood);
      addToast(`Raspoloženje postavljeno na ${mood.emoji}`, "success");
    } catch {
      addToast("Greška pri postavljanju raspoloženja", "error");
    }
  }

  const question = questionService.getTodayQuestion();

  const myUid = () => currentUser()?.uid;
  const myAnswer = () => todayAnswers()?.answers?.[myUid()];
  const partnerAnswer = () => todayAnswers()?.answers?.[userDoc()?.partnerUid];

  return (
    <div class="max-w-3xl mx-auto p-4 flex flex-col gap-6">

      <Show when={loading()}>
        <div class="flex justify-center items-center min-h-[50vh]">
          <span class="loading loading-spinner loading-lg" />
        </div>
      </Show>

      <Show when={!loading() && !userDoc()?.coupleId}>
        <div class="card bg-base-200 shadow text-center p-10">
          <div class="text-5xl mb-4">💌</div>
          <h2 class="text-xl font-bold mb-2">Još nisi spojen/a s partnerom</h2>
          <p class="text-base-content/60 mb-6 text-sm">
            Poveži se kako bi pristupio/la svim funkcijama aplikacije.
          </p>
          <a href="/connect" class="btn btn-primary w-fit mx-auto">Poveži se ❤️</a>
        </div>
      </Show>

      <Show when={!loading() && userDoc()?.coupleId}>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">
              Dobrodošao/la, {userDoc()?.name?.split(" ")[0]} 👋
            </h1>
            <p class="text-base-content/50 text-sm mt-0.5">
              {new Date().toLocaleDateString("hr-HR", {
                weekday: "long", day: "numeric", month: "long"
              })}
            </p>
          </div>

          <Show when={coupleDoc()?.streak > 0}>
            <div class="flex flex-col items-center bg-primary/10 rounded-2xl px-4 py-2">
              <span class="text-2xl">🔥</span>
              <span class="text-lg font-bold text-primary leading-none">
                {coupleDoc()?.streak}
              </span>
              <span class="text-xs text-base-content/50">
                {coupleDoc()?.streak === 1 ? "dan" : coupleDoc()?.streak < 5 ? "dana" : "dana"}
              </span>
            </div>
          </Show>
        </div>

        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-4 gap-4">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">Raspoloženja</h2>
              <div class="flex items-center gap-3 text-sm text-base-content/50">
                <span>
                  {userDoc()?.name?.split(" ")[0]}
                  {" "}
                  <span class="text-xl">{userDoc()?.mood?.emoji ?? "—"}</span>
                </span>
                <span class="text-base-content/30">·</span>
                <span>
                  {partnerDoc()?.name?.split(" ")[0] ?? "Partner"}
                  {" "}
                  <span class="text-xl">{partnerDoc()?.mood?.emoji ?? "—"}</span>
                </span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <For each={MOODS}>
                {(mood) => (
                  <button
                    class={`btn btn-sm gap-1 ${userDoc()?.mood?.emoji === mood.emoji
                      ? "btn-primary"
                      : "btn-ghost border border-base-300"}`}
                    onClick={() => handleMood(mood)}
                    title={mood.label}
                  >
                    <span>{mood.emoji}</span>
                    <span class="text-xs hidden sm:inline">{mood.label}</span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>

        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-4 gap-3">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">Pitanje dana 💬</h2>
              <Show when={myAnswer()}>
                <span class="badge badge-success badge-sm">Odgovoreno</span>
              </Show>
            </div>
            <p class="text-base-content/80 italic">"{question}"</p>

            <Show when={myAnswer() || partnerAnswer()}>
              <div class="flex flex-col gap-2 mt-1">
                <Show when={myAnswer()}>
                  <div class="bg-primary/10 rounded-xl px-3 py-2 text-sm">
                    <span class="font-medium text-primary text-xs uppercase tracking-wide">
                      Ti
                    </span>
                    <p class="mt-0.5 text-base-content/80">{myAnswer()}</p>
                  </div>
                </Show>
                <Show when={partnerAnswer()}>
                  <div class="bg-base-200 rounded-xl px-3 py-2 text-sm">
                    <span class="font-medium text-base-content/50 text-xs uppercase tracking-wide">
                      {partnerDoc()?.name?.split(" ")[0] ?? "Partner"}
                    </span>
                    <p class="mt-0.5 text-base-content/80">{partnerAnswer()}</p>
                  </div>
                </Show>
              </div>
            </Show>

            <a href="/question" class="btn btn-primary btn-sm w-fit mt-1">
              {myAnswer() ? "Pregledaj odgovore" : "Odgovori na pitanje →"}
            </a>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <a href="/chat" class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div class="card-body p-4 items-center text-center gap-2">
              <span class="text-3xl">✉️</span>
              <span class="font-semibold">Chat</span>
              <span class="text-xs text-base-content/50">Pišite si poruke</span>
            </div>
          </a>
          <a href="/journal" class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div class="card-body p-4 items-center text-center gap-2">
              <span class="text-3xl">📖</span>
              <span class="font-semibold">Dnevnik</span>
              <span class="text-xs text-base-content/50">Vaše uspomene</span>
            </div>
          </a>
          <a href="/question" class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div class="card-body p-4 items-center text-center gap-2">
              <span class="text-3xl">💬</span>
              <span class="font-semibold">Pitanje</span>
              <span class="text-xs text-base-content/50">Upoznajte se bolje</span>
            </div>
          </a>
          <a href="/calendar" class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div class="card-body p-4 items-center text-center gap-2">
              <span class="text-3xl">📅</span>
              <span class="font-semibold">Kalendar</span>
              <span class="text-xs text-base-content/50">Vaša aktivnost</span>
            </div>
          </a>
        </div>

      </Show>
    </div>
  );
}