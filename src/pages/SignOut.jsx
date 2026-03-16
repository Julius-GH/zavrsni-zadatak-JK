import { onMount } from "solid-js";
import { authService } from "../services/auth.js";
import { useNavigate } from "@solidjs/router";
import { addToast } from "../components/Toast.jsx";

export default function SignOut() {
    const navigate = useNavigate();

    onMount(async () => {
        await authService.signOut();
        addToast("Odjava je uspjela", "warning");
        navigate("/user/signin");
    });
}