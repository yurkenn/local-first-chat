import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

console.log("[LocalChat] Starting application...");

/**
 * Application entry point with comprehensive error handling.
 *
 * The Suspense boundary catches Jazz's async initialization.
 * If Jazz fails to load, we catch the error and show a fallback.
 */

function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#1a1a2e",
        color: "#e0e0e0",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        gap: "16px",
      }}
    >
      <div style={{ fontSize: "3rem" }}>💬</div>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          margin: 0,
          background: "linear-gradient(135deg, #7c5ce0, #5eead4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        LocalChat
      </h1>
      <p style={{ color: "#888", fontSize: "0.9rem" }}>
        Connecting to secure network…
      </p>
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(124, 92, 224, 0.2)",
          borderTopColor: "#7c5ce0",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        <div
          style={{
            padding: "40px",
            background: "#1a1a2e",
            color: "#e0e0e0",
            height: "100vh",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <h1 style={{ color: "#ff6b6b" }}>Something went wrong</h1>
          <pre
            style={{
              background: "#0d0d1a",
              padding: "16px",
              borderRadius: "8px",
              overflow: "auto",
              fontSize: "0.85rem",
              color: "#ff9999",
            }}
          >
            {this.state.error?.message}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "16px",
              padding: "8px 20px",
              background: "#7c5ce0",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
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
        </Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );

  console.log("[LocalChat] React root rendered");
} catch (err) {
  console.error("[LocalChat] Failed to mount React:", err);
  document.body.innerHTML = `<pre style="color:red;padding:20px">${err}</pre>`;
}
