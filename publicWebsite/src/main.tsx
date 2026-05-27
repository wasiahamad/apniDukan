import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

import "./i18n";

// Register PWA service worker (injectManifest build output).
registerSW({
	immediate: true,
});

createRoot(document.getElementById("root")!).render(
	<ThemeProvider attribute="class" defaultTheme="light" enableSystem>
		<App />
	</ThemeProvider>,
);
