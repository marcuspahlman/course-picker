import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Analytics } from "@vercel/analytics/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";
import { MissingEnvScreen } from "./components/MissingEnvScreen";
import { getAuthClient } from "./lib/auth-client";
import { getClientEnv, getMissingClientEnv } from "./lib/env";
import { ThemeProvider } from "./lib/ThemeProvider";

const env = getClientEnv();
const root = createRoot(document.getElementById("root")!);

if (env === null) {
  root.render(
    <StrictMode>
      <MissingEnvScreen missing={getMissingClientEnv()} />
      <Analytics />
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(env.VITE_CONVEX_URL);
  const authClient = getAuthClient(env);

  root.render(
    <StrictMode>
      <ThemeProvider>
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
          <App />
        </ConvexBetterAuthProvider>
        <Analytics />
      </ThemeProvider>
    </StrictMode>,
  );
}
