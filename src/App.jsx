document.documentElement.setAttribute("data-theme", "love");

import { Router, Route, Navigate } from "@solidjs/router";
import { isAuthenticated, authLoading, currentUser } from "./services/auth.js";
import { Show, createSignal, onMount, onCleanup } from "solid-js";
import Toast from "./components/Toast.jsx";
import { userService } from "./services/db.js";

// pages
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Error from "./pages/Error";
import SignOut from "./pages/SignOut";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile.jsx";
import Connect from "./pages/Connect.jsx";

// (future pages — uncomment as you build them)
// import Question from "./pages/Question.jsx";
// import Chat from "./pages/Chat.jsx";
// import Journal from "./pages/Journal.jsx";
// import Calendar from "./pages/Calendar.jsx";

export default function App() {
  return (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/user">
        <Route path="signin" component={SignIn} />
        <Route path="signup" component={SignUp} />
        <Route path="signout" component={SignOut} />
        <Route path="resetpassword" component={ResetPassword} />
        <Route path="/profile" component={AuthBoundary}>
          <Route path="/" component={UserProfile} />
        </Route>
      </Route>

      {/* Protected app routes */}
      <Route path="/connect" component={AuthBoundary}>
        <Route path="/" component={Connect} />
      </Route>
      {/* Uncomment as you build each page:
      <Route path="/question" component={AuthBoundary}>
        <Route path="/" component={Question} />
      </Route>
      <Route path="/chat" component={AuthBoundary}>
        <Route path="/" component={Chat} />
      </Route>
      <Route path="/journal" component={AuthBoundary}>
        <Route path="/" component={Journal} />
      </Route>
      <Route path="/calendar" component={AuthBoundary}>
        <Route path="/" component={Calendar} />
      </Route>
      */}

      <Route path="/error" component={Error} />
      <Route path="*" component={NotFound} />
    </Router>
  );
}

function Layout(props) {
  // Track if current user has a partner, to show correct nav links
  const [hasCoupleId, setHasCoupleId] = createSignal(false);

  let unsub;
  onMount(() => {
    const u = currentUser();
    if (!u) return;
    unsub = userService.subscribeUser(u.uid, (data) => {
      setHasCoupleId(!!data?.coupleId);
    });
  });
  onCleanup(() => unsub?.());

  return (
    <>
      <div class="navbar bg-base-100 shadow-sm">
        <div class="navbar-start">
          <div class="dropdown">
            <div tabindex="0" role="button" class="btn btn-ghost btn-circle">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <ul tabindex="-1" class="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
              <Show when={isAuthenticated() && hasCoupleId()}>
                <li><a href="/">🏠 Početna</a></li>
                {/* Uncomment as pages are built: */}
                {/* <li><a href="/question">💬 Pitanje dana</a></li> */}
                {/* <li><a href="/chat">✉️ Chat</a></li> */}
                {/* <li><a href="/journal">📖 Dnevnik</a></li> */}
                {/* <li><a href="/calendar">📅 Kalendar</a></li> */}
              </Show>
              <Show when={isAuthenticated() && !hasCoupleId()}>
                <li><a href="/connect">💑 Poveži se s partnerom</a></li>
              </Show>
              <Show when={!isAuthenticated()}>
                <li><a href="/user/signin">Prijava</a></li>
                <li><a href="/user/signup">Registracija</a></li>
              </Show>
            </ul>
          </div>
        </div>

        <div class="navbar-center">
          <a href="/" class="btn btn-ghost text-xl">Connectify</a>
        </div>

        <div class="navbar-end">
          <Show when={!isAuthenticated()}>
            <a href="/user/signin" class="btn btn-ghost btn-square text-2xl" title="Prijava">🚹</a>
            <a href="/user/signup" class="btn btn-ghost btn-square text-2xl" title="Registracija">🚼</a>
          </Show>
          <Show when={isAuthenticated()}>
            <Show when={!hasCoupleId()}>
              <a href="/connect" class="btn btn-ghost btn-square text-2xl" title="Poveži partnera">💑</a>
            </Show>
            <a href="/user/profile" class="btn btn-ghost btn-square text-2xl" title="Profil">👤</a>
            <a href="/user/signout" class="btn btn-ghost btn-square text-2xl" title="Odjava">🚷</a>
          </Show>
        </div>
      </div>

      <main class="min-h-[65vh] p-2">{props.children}</main>

      <footer class="footer footer-horizontal footer-center bg-base-200 text-base-content rounded p-10">
        <nav class="grid grid-flow-col gap-4">
          <a class="link link-hover">O nama</a>
          <a class="link link-hover">Kontakt</a>
        </nav>
        <aside>
          <p>Copyright © {new Date().getFullYear()} - Connectify</p>
        </aside>
      </footer>
      <Toast />
    </>
  );
}

function NotFound() {
  return <Navigate href="/error" state={{ error: { title: "404", message: "Tražena stranica ne postoji." } }} />;
}

function AuthBoundary(props) {
  return (
    <Show
      when={!authLoading()}
      fallback={
        <div class="flex justify-center items-center min-h-screen">
          <span class="loading loading-spinner loading-xl" />
        </div>
      }
    >
      {isAuthenticated() ? (
        props.children
      ) : (
        <Navigate href="/error" state={{ error: { title: "401", message: "Pristup traženoj stranici nije dozvoljen." } }} />
      )}
    </Show>
  );
}