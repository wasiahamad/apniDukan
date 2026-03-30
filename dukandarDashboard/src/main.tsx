import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent dark->light flash on refresh for dashboard routes only.
try {
	const isDashboard = window.location.pathname === "/dashboard" || window.location.pathname.startsWith("/dashboard/");
	if (isDashboard) {
		const theme = localStorage.getItem("dukaansetu:theme");
		document.documentElement.classList.toggle("dark", theme === "dark");
	}
} catch {
	// ignore storage access errors
}

createRoot(document.getElementById("root")!).render(<App />);
