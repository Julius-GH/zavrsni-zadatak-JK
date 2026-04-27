import { createSignal, createEffect, Show, For, onCleanup } from "solid-js";
import { currentUser } from "../services/auth";
import { userService, activityService } from "../services/db";

export default function Calendar() {
  const [userDoc, setUserDoc] = createSignal(null);
  const [activeDays, setActiveDays] = createSignal(new Set());
  const [loading, setLoading] = createSignal(true);
  const [currentDate, setCurrentDate] = createSignal(new Date());

  let unsubUser;

  createEffect(() => {
    const u = currentUser();
    if (!u) return;

    unsubUser = userService.subscribeUser(u.uid, async (data) => {
      setUserDoc(data);
      if (data?.coupleId) {
        await loadActiveDays(data.coupleId, currentDate());
      }
      setLoading(false);
    });
  });

  onCleanup(() => unsubUser?.());

  async function loadActiveDays(coupleId, date) {
    setLoading(true);
    const days = await activityService.getActiveDaysForMonth(coupleId, date);
    setActiveDays(days);
    setLoading(false);
  }

  async function changeMonth(delta) {
    const d = new Date(currentDate());
    d.setMonth(d.getMonth() + delta);
    setCurrentDate(d);
    if (userDoc()?.coupleId) {
      await loadActiveDays(userDoc().coupleId, d);
    }
  }

  function getMonthName(date) {
    return date.toLocaleDateString("hr-HR", { month: "long", year: "numeric" });
  }

  // Build a 2D grid of weeks for the current month
  function buildCalendarGrid(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday-based week (0=Mon ... 6=Sun)
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon-based

    const days = [];

    // leading empty cells
    for (let i = 0; i < startDow; i++) days.push(null);

    // actual days
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);

    // trailing empty cells to complete last row
    while (days.length % 7 !== 0) days.push(null);

    // split into weeks
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }

  function dateStr(day) {
    const d = currentDate();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${dayStr}`;
  }

  function isToday(day) {
    if (!day) return false;
    const today = new Date();
    const d = currentDate();
    return (
      day === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }

  function isActive(day) {
    if (!day) return false;
    return activeDays().has(dateStr(day));
  }

  function isFuture(day) {
    if (!day) return false;
    const today = new Date();
    const d = currentDate();
    const cellDate = new Date(d.getFullYear(), d.getMonth(), day);
    return cellDate > today;
  }

  const DAY_LABELS = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

  // Stats for current month
  const activeCount = () => activeDays().size;
  const daysInMonth = () => new Date(
    currentDate().getFullYear(),
    currentDate().getMonth() + 1, 0
  ).getDate();
  const passedDays = () => {
    const today = new Date();
    const d = currentDate();
    const isCurrentMonth =
      today.getMonth() === d.getMonth() &&
      today.getFullYear() === d.getFullYear();
    return isCurrentMonth ? today.getDate() : daysInMonth();
  };
  const streakPercent = () =>
    passedDays() > 0 ? Math.round((activeCount() / passedDays()) * 100) : 0;

  return (
    <div class="max-w-lg mx-auto p-4 flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 class="text-2xl font-bold">Kalendar aktivnosti 📅</h1>
        <p class="text-base-content/50 text-sm mt-0.5">
          Dani kada ste bili aktivni zajedno
        </p>
      </div>

      {/* Month navigator */}
      <div class="flex items-center justify-between">
        <button
          class="btn btn-ghost btn-sm btn-square"
          onClick={() => changeMonth(-1)}
          disabled={loading()}
        >
          ‹
        </button>
        <span class="font-semibold capitalize">
          {getMonthName(currentDate())}
        </span>
        <button
          class="btn btn-ghost btn-sm btn-square"
          onClick={() => changeMonth(1)}
          disabled={loading()}
        >
          ›
        </button>
      </div>

      {/* Calendar grid */}
      <div class="card bg-base-100 shadow-sm">
        <div class="card-body p-4">

          <Show when={loading()}>
            <div class="flex justify-center py-8">
              <span class="loading loading-spinner loading-md" />
            </div>
          </Show>

          <Show when={!loading()}>
            {/* Day labels */}
            <div class="grid grid-cols-7 mb-1">
              <For each={DAY_LABELS}>
                {(label) => (
                  <div class="text-center text-xs text-base-content/40 font-medium py-1">
                    {label}
                  </div>
                )}
              </For>
            </div>

            {/* Weeks */}
            <For each={buildCalendarGrid(currentDate())}>
              {(week) => (
                <div class="grid grid-cols-7 gap-1 mb-1">
                  <For each={week}>
                    {(day) => (
                      <div
                        class={`
                          aspect-square flex items-center justify-center rounded-full text-sm
                          transition-colors select-none
                          ${!day ? "" : ""}
                          ${isToday(day)
                            ? "ring-2 ring-primary ring-offset-1 font-bold"
                            : ""}
                          ${isActive(day)
                            ? "bg-primary text-primary-content font-semibold"
                            : day && !isFuture(day)
                              ? "text-base-content/40"
                              : day
                                ? "text-base-content/20"
                                : ""}
                        `}
                      >
                        {day ?? ""}
                      </div>
                    )}
                  </For>
                </div>
              )}
            </For>

            {/* Legend */}
            <div class="flex items-center gap-4 mt-3 pt-3 border-t border-base-200">
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded-full bg-primary" />
                <span class="text-xs text-base-content/50">Aktivni dan</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded-full ring-2 ring-primary ring-offset-1" />
                <span class="text-xs text-base-content/50">Danas</span>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Stats */}
      <Show when={!loading()}>
        <div class="grid grid-cols-3 gap-3">
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body p-3 items-center text-center gap-0">
              <span class="text-2xl font-bold text-primary">{activeCount()}</span>
              <span class="text-xs text-base-content/50">aktivnih dana</span>
            </div>
          </div>
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body p-3 items-center text-center gap-0">
              <span class="text-2xl font-bold text-primary">{daysInMonth()}</span>
              <span class="text-xs text-base-content/50">dana u mjesecu</span>
            </div>
          </div>
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body p-3 items-center text-center gap-0">
              <span class="text-2xl font-bold text-primary">{streakPercent()}%</span>
              <span class="text-xs text-base-content/50">aktivnosti</span>
            </div>
          </div>
        </div>
      </Show>

      <a href="/" class="btn btn-ghost btn-sm w-fit">← Natrag na početnu</a>
    </div>
  );
}