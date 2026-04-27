import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebase";

function generateCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const userService = {
 
  async createUser(uid, { name, email }) {
    const code = generateCode();
    await setDoc(doc(db, "users", uid), {
      uid,
      name,
      email,
      coupleId: null,
      partnerUid: null,
      connectCode: code,
      mood: null,
      moodUpdatedAt: null,
      createdAt: serverTimestamp(),
    });
    return code;
  },

  async getUser(uid) {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  },

  async updateUser(uid, data) {
    await updateDoc(doc(db, "users", uid), data);
  },

  subscribeUser(uid, callback) {
    return onSnapshot(doc(db, "users", uid), (snap) => {
      callback(snap.exists() ? snap.data() : null);
    });
  },
};

export const coupleService = {
  async connectWithCode(currentUid, code) {
    const q = query(
      collection(db, "users"),
      where("connectCode", "==", code.toUpperCase()),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) throw new Error("Kod nije pronađen. Provjeri i pokušaj ponovo.");

    const partnerDoc = snap.docs[0];
    const partnerUid = partnerDoc.id;

    if (partnerUid === currentUid)
      throw new Error("Ne možeš se spojiti sam sa sobom.");

    const partnerData = partnerDoc.data();
    if (partnerData.coupleId)
      throw new Error("Ovaj korisnik je već spojen s partnerom.");

    const currentData = await userService.getUser(currentUid);
    if (currentData?.coupleId)
      throw new Error("Već si spojen s partnerom.");

    const coupleRef = await addDoc(collection(db, "couples"), {
      members: [currentUid, partnerUid],
      createdAt: serverTimestamp(),
      streak: 0,
      lastActivityDate: null,
    });
    const coupleId = coupleRef.id;

    await Promise.all([
      updateDoc(doc(db, "users", currentUid), {
        coupleId,
        partnerUid,
      }),
      updateDoc(doc(db, "users", partnerUid), {
        coupleId,
        partnerUid: currentUid,
      }),
    ]);

    return coupleId;
  },

  async getCouple(coupleId) {
    const snap = await getDoc(doc(db, "couples", coupleId));
    return snap.exists() ? snap.data() : null;
  },

  subscribeCouple(coupleId, callback) {
    return onSnapshot(doc(db, "couples", coupleId), (snap) => {
      callback(snap.exists() ? snap.data() : null);
    });
  },

  async updateStreak(coupleId) {
    const today = new Date().toISOString().split("T")[0];
    const couple = await this.getCouple(coupleId);
    if (!couple) return;

    const last = couple.lastActivityDate;
    if (last === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = last === yesterday ? (couple.streak || 0) + 1 : 1;

    await updateDoc(doc(db, "couples", coupleId), {
      streak: newStreak,
      lastActivityDate: today,
    });
  },
};

const QUESTIONS = [
  "Koje je tvoje najdraže zajedničko sjećanje sa mnom?",
  "Što te danas usrećilo?",
  "Koje mjesto na svijetu bismo trebali posjetiti zajedno?",
  "Što je nešto što bi volio/voljela znati o tebi?",
  "Koji film ili serija te je zadnji put stvarno dirnula?",
  "Kada si se zadnji put osjećao/osjećala ponosan/ponosna na sebe?",
  "Što misliš da je naša najveća snaga kao par?",
  "Koji je tvoj idealni vikend?",
  "Postoji li nešto što si oduvijek želio/željela naučiti?",
  "Što te čini voljenim/voljenom?",
  "Kada si zadnji put izašao/izašla iz komfort zone?",
  "Koji je tvoj omiljeni dio dana?",
  "Što bi napravio/napravila s neočekivanih slobodnih 24 sata?",
  "Koje je tvoje najdraže godišnje doba i zašto?",
  "Što te najviše nervira, a što te umiruje?",
  "Koji san ili cilj ti je najvažniji trenutno?",
  "Kada si se zadnji put od srca nasmijao/nasmijala?",
  "Što bi promijenio/promijenila u svom danu?",
  "Kako zamišljaš naš život za 5 godina?",
  "Što te potiče da se osjećaš sigurno u našoj vezi?",
  "Koji je tvoj omiljeni obrok koji napravim?",
  "Što ti znači dom?",
  "Postoji li pjesma koja te uvijek vrati na neko posebno sjećanje?",
  "Što je nešto što uvijek može popraviti tvoje raspoloženje?",
  "Koja bi bila tvoja supermoć?",
  "Što ti je zadalo najveći izazov ove godine?",
  "Kako se nosiš s teškim danima?",
  "Što u sebi cijeniš najviše?",
  "Koji projekt ili hobi želiš početi?",
  "Što za tebe znači savršen dan sa mnom?",
];

export const questionService = {
  getTodayIndex() {
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    return daysSinceEpoch % QUESTIONS.length;
  },

  getTodayQuestion() {
    return QUESTIONS[this.getTodayIndex()];
  },

  async saveAnswer(coupleId, uid, answer) {
    const today = new Date().toISOString().split("T")[0];
    const docId = `${coupleId}_${today}`;
    const ref = doc(db, "answers", docId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      await updateDoc(ref, { [`answers.${uid}`]: answer });
    } else {
      await setDoc(ref, {
        coupleId,
        date: today,
        questionIndex: this.getTodayIndex(),
        question: this.getTodayQuestion(),
        answers: { [uid]: answer },
        createdAt: serverTimestamp(),
      });
    }

    await coupleService.updateStreak(coupleId);
  },

  async getTodayAnswers(coupleId) {
    const today = new Date().toISOString().split("T")[0];
    const snap = await getDoc(doc(db, "answers", `${coupleId}_${today}`));
    return snap.exists() ? snap.data() : null;
  },

  subscribeTodayAnswers(coupleId, callback) {
    const today = new Date().toISOString().split("T")[0];
    return onSnapshot(doc(db, "answers", `${coupleId}_${today}`), (snap) => {
      callback(snap.exists() ? snap.data() : null);
    });
  },

  async getAnswerHistory(coupleId, count = 10) {
    const q = query(
      collection(db, "answers"),
      where("coupleId", "==", coupleId),
      orderBy("date", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  },
};

export const chatService = {
  async sendMessage(coupleId, uid, text) {
    await addDoc(collection(db, "messages"), {
      coupleId,
      uid,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    await coupleService.updateStreak(coupleId);
  },

  subscribeMessages(coupleId, callback, count = 50) {
    const q = query(
      collection(db, "messages"),
      where("coupleId", "==", coupleId),
      orderBy("createdAt", "asc"),
      limit(count)
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  },
};

export const MOODS = [
  { emoji: "😊", label: "Sretno" },
  { emoji: "😌", label: "Mirno" },
  { emoji: "🥰", label: "Zaljubljeno" },
  { emoji: "😔", label: "Tužno" },
  { emoji: "😤", label: "Uzrujano" },
  { emoji: "😴", label: "Umorno" },
  { emoji: "🤩", label: "Uzbuđeno" },
  { emoji: "😰", label: "Anksiozno" },
];

export const moodService = {
  async setMood(uid, mood) {
    await updateDoc(doc(db, "users", uid), {
      mood,
      moodUpdatedAt: serverTimestamp(),
    });
  },
};

export const journalService = {
  async addEntry(coupleId, uid, { title, text, imageUrl = null }) {
    await addDoc(collection(db, "journal"), {
      coupleId,
      uid,
      title: title.trim(),
      text: text.trim(),
      imageUrl,
      createdAt: serverTimestamp(),
    });
    await coupleService.updateStreak(coupleId);
  },

  async deleteEntry(entryId) {
    await deleteDoc(doc(db, "journal", entryId));
  },

  subscribeEntries(coupleId, callback) {
    const q = query(
      collection(db, "journal"),
      where("coupleId", "==", coupleId),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  },
};

export const activityService = {
  async getActiveDaysForMonth(coupleId, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startOfMonth = new Date(year, month, 1).toISOString().split("T")[0];
    const endOfMonth = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const q = query(
      collection(db, "answers"),
      where("coupleId", "==", coupleId),
      where("date", ">=", startOfMonth),
      where("date", "<=", endOfMonth)
    );
    const snap = await getDocs(q);
    return new Set(snap.docs.map((d) => d.data().date)); 
  },
};