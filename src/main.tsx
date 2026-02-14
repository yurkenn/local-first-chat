import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

console.log("[LocalChat] Starting application...");

/**
 * Application entry point with comprehensive error handling.
 *
 * The Suspense boundary catches Jazz's async initialization.
 * If Jazz fails to load, we catch the error and show a fallback.
 */

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[hsl(var(--background))] text-primary-color font-sans gap-4">
      <div className="brand-logo">🪷</div>
      <h1 className="brand-title text-2xl">Lotus</h1>
      <p className="text-sm text-muted-color">
        Connecting to secure network…
      </p>
      <div className="w-10 h-10 border-3 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))] rounded-full animate-spin" />
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[LocalChat] React Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-[hsl(var(--background))] text-primary-color h-screen font-sans">
          <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
          <pre className="mt-4 p-4 bg-card-surface rounded-lg overflow-auto text-sm text-red-300 border border-red-500/20">
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2 bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-none rounded-md cursor-pointer hover:opacity-90 transition-opacity font-medium"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load the Jazz-dependent parts to catch import errors
const JazzApp = React.lazy(async () => {
  try {
    console.log("[LocalChat] Loading Jazz modules...");
    const { JazzReactProvider } = await import("jazz-tools/react");
    const { ChatAccount } = await import("./schema");
    const { AuthUI } = await import("./components/AuthUI");
    const AppModule = await import("./App");
    const App = AppModule.default;

    const apiKey = import.meta.env.VITE_JAZZ_API_KEY || "you@example.com";

    console.log("[LocalChat] Jazz modules loaded, creating provider...");

    function JazzApp() {
      return (
        <JazzReactProvider
          sync={{
            peer: `wss://cloud.jazz.tools/?key=${apiKey}`,
          }}
          AccountSchema={ChatAccount}
        >
          <AuthUI>
            <App />
          </AuthUI>
        </JazzReactProvider>
      );
    }

    return { default: JazzApp };
  } catch (err) {
    console.error("[LocalChat] Failed to load Jazz modules:", err);
    throw err;
  }
});

try {
  const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement
  );

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <JazzApp />
          <Toaster position="bottom-right" richColors />
        </Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );

  console.log("[LocalChat] React root rendered");

  // Register Service Worker for offline support (production only)
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("[LocalChat] Service Worker registered"))
      .catch((err) => console.warn("[LocalChat] SW registration failed:", err));
  }
} catch (err) {
  console.error("[LocalChat] Failed to mount React:", err);
  document.body.innerHTML = `<pre class="text-red-400 p-5">${err}</pre>`;
}
