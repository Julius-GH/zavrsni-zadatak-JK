import { createSignal, createEffect, Show, For, onCleanup } from "solid-js";
import { currentUser } from "../services/auth";
import { userService, journalService } from "../services/db";
import { JournalEntrySchema } from "../lib/schemas";
import { addToast } from "../components/Toast";

export default function Journal() {
  const [userDoc, setUserDoc] = createSignal(null);
  const [partnerDoc, setPartnerDoc] = createSignal(null);
  const [entries, setEntries] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [showForm, setShowForm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(null);

  const [title, setTitle] = createSignal("");
  const [text, setText] = createSignal("");
  const [imageUrl, setImageUrl] = createSignal("");
  const [errors, setErrors] = createSignal({});

  let unsubUser, unsubPartner, unsubEntries;

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

      if (data?.coupleId && !unsubEntries) {
        unsubEntries = journalService.subscribeEntries(data.coupleId, (e) => {
          setEntries(e);
        });
      }

      setLoading(false);
    });
  });

  onCleanup(() => {
    unsubUser?.();
    unsubPartner?.();
    unsubEntries?.();
  });

  function resetForm() {
    setTitle("");
    setText("");
    setImageUrl("");
    setErrors({});
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors({});

    const result = JournalEntrySchema.safeParse({
      title: title().trim(),
      text: text().trim(),
      imageUrl: imageUrl().trim() || undefined,
    });

    if (!result.success) {
      const errs = {};
      result.error.issues.forEach((i) => { errs[i.path[0]] = i.message; });
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      await journalService.addEntry(
        userDoc().coupleId,
        currentUser().uid,
        {
          title: title().trim(),
          text: text().trim(),
          imageUrl: imageUrl().trim() || null,
        }
      );
      resetForm();
      addToast("Uspomena zapisana! 📖", "success");
    } catch {
      addToast("Greška pri spremanju unosa", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId) {
    setDeleting(entryId);
    try {
      await journalService.deleteEntry(entryId);
      addToast("Unos obrisan", "info");
    } catch {
      addToast("Greška pri brisanju unosa", "error");
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(ts) {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString("hr-HR", {
      day: "numeric", month: "long", year: "numeric",
    });
  }

  function authorName(uid) {
    if (uid === currentUser()?.uid) return "Ti";
    return partnerDoc()?.name?.split(" ")[0] ?? "Partner";
  }

  const myUid = () => currentUser()?.uid;

  return (
    <div class="max-w-2xl mx-auto p-4 flex flex-col gap-6">

      <Show when={loading()}>
        <div class="flex justify-center items-center min-h-[50vh]">
          <span class="loading loading-spinner loading-lg" />
        </div>
      </Show>

      <Show when={!loading()}>

        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">Dnevnik 📖</h1>
            <p class="text-base-content/50 text-sm mt-0.5">
              Vaše zajedničke uspomene
            </p>
          </div>
          <Show when={!showForm()}>
            <button
              class="btn btn-primary btn-sm"
              onClick={() => setShowForm(true)}
            >
              + Nova uspomena
            </button>
          </Show>
        </div>

        <Show when={showForm()}>
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body p-4 gap-4">
              <h2 class="font-semibold">Nova uspomena</h2>

              <form onSubmit={handleSubmit} class="flex flex-col gap-3">

                <div class="form-control">
                  <label class="label py-0">
                    <span class="label-text text-sm">Naslov</span>
                    <span class="label-text-alt text-base-content/40">{title().length}/100</span>
                  </label>
                  <input
                    type="text"
                    class={`input input-bordered w-full ${errors().title ? "input-error" : ""}`}
                    placeholder="Npr. Naš prvi izlet..."
                    maxLength={100}
                    value={title()}
                    onInput={(e) => setTitle(e.target.value)}
                  />
                  <Show when={errors().title}>
                    <label class="label py-0">
                      <span class="label-text-alt text-error">{errors().title}</span>
                    </label>
                  </Show>
                </div>

                <div class="form-control">
                  <label class="label py-0">
                    <span class="label-text text-sm">Opis</span>
                    <span class="label-text-alt text-base-content/40">{text().length}/2000</span>
                  </label>
                  <textarea
                    class={`textarea textarea-bordered w-full resize-none ${errors().text ? "textarea-error" : ""}`}
                    rows={4}
                    placeholder="Opiši ovaj trenutak..."
                    maxLength={2000}
                    value={text()}
                    onInput={(e) => setText(e.target.value)}
                  />
                  <Show when={errors().text}>
                    <label class="label py-0">
                      <span class="label-text-alt text-error">{errors().text}</span>
                    </label>
                  </Show>
                </div>

                <div class="form-control">
                  <label class="label py-0">
                    <span class="label-text text-sm">URL slike <span class="text-base-content/40">(opcionalno)</span></span>
                  </label>
                  <input
                    type="url"
                    class={`input input-bordered w-full ${errors().imageUrl ? "input-error" : ""}`}
                    placeholder="https://..."
                    value={imageUrl()}
                    onInput={(e) => setImageUrl(e.target.value)}
                  />
                  <Show when={errors().imageUrl}>
                    <label class="label py-0">
                      <span class="label-text-alt text-error">{errors().imageUrl}</span>
                    </label>
                  </Show>
                  <Show when={imageUrl().trim().length > 0 && !errors().imageUrl}>
                    <img
                      src={imageUrl()}
                      alt="Pregled slike"
                      class="mt-2 rounded-xl max-h-48 object-cover w-full"
                      onError={(e) => e.target.style.display = "none"}
                    />
                  </Show>
                </div>

                <div class="flex gap-2 justify-end">
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    onClick={resetForm}
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    class="btn btn-primary btn-sm"
                    disabled={saving()}
                  >
                    <Show when={saving()} fallback="Spremi uspomenu">
                      <span class="loading loading-spinner loading-xs" />
                      Spremanje...
                    </Show>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        <Show when={entries().length === 0 && !showForm()}>
          <div class="flex flex-col items-center justify-center gap-3 py-16 text-base-content/30">
            <span class="text-5xl">📷</span>
            <p class="text-sm">Još nema uspomena. Dodajte prvu!</p>
          </div>
        </Show>

        <For each={entries()}>
          {(entry) => (
            <div class="card bg-base-100 shadow-sm overflow-hidden">

              <Show when={entry.imageUrl}>
                <figure>
                  <img
                    src={entry.imageUrl}
                    alt={entry.title}
                    class="w-full max-h-64 object-cover"
                    onError={(e) => e.target.parentElement.style.display = "none"}
                  />
                </figure>
              </Show>

              <div class="card-body p-4 gap-2">

                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1">
                    <h2 class="font-bold text-lg leading-snug">{entry.title}</h2>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-xs text-base-content/40">
                        {formatDate(entry.createdAt)}
                      </span>
                      <span class="text-base-content/20">·</span>
                      <span class="text-xs text-base-content/40">
                        {authorName(entry.uid)}
                      </span>
                    </div>
                  </div>

                  <Show when={entry.uid === myUid()}>
                    <button
                      class="btn btn-ghost btn-xs text-error opacity-50 hover:opacity-100"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting() === entry.id}
                      title="Obriši unos"
                    >
                      <Show when={deleting() === entry.id} fallback="🗑️">
                        <span class="loading loading-spinner loading-xs" />
                      </Show>
                    </button>
                  </Show>
                </div>

                <p class="text-base-content/80 text-sm leading-relaxed whitespace-pre-wrap">
                  {entry.text}
                </p>

              </div>
            </div>
          )}
        </For>

      </Show>
    </div>
  );
}