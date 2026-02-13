import { useState } from "react";
import { usePassphraseAuth } from "jazz-tools/react";
import { wordlist } from "../wordlist";

/**
 * AuthUI — Passphrase-based authentication for desktop apps.
 *
 * Uses Jazz's usePassphraseAuth instead of WebAuthn passkeys
 * because Tauri's embedded WebView (WKWebView/WebView2) does not
 * support the WebAuthn API (navigator.credentials).
 *
 * Flow:
 *   - New user: enters a display name → clicks Sign Up → receives a passphrase to save
 *   - Returning user: pastes their passphrase → clicks Log In
 */
export function AuthUI({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState("");
    const [passphraseInput, setPassphraseInput] = useState("");
    const [showSavePassphrase, setShowSavePassphrase] = useState(false);
    const [error, setError] = useState("");

    const auth = usePassphraseAuth({ wordlist });

    // If authenticated, render children
    if (auth.state === "signedIn" && !showSavePassphrase) {
        return <>{children}</>;
    }

    // After sign-up: show passphrase to save
    if (auth.state === "signedIn" && showSavePassphrase) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo">💬</div>
                    <h1 className="auth-title">Save Your Recovery Key</h1>
                    <p className="auth-subtitle">
                        Copy this passphrase and keep it safe. You'll need it to log back in.
                    </p>

                    <textarea
                        className="auth-passphrase-display"
                        readOnly
                        value={auth.passphrase}
                        rows={3}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    />

                    <button
                        className="auth-btn auth-btn-copy"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(auth.passphrase);
                                setShowSavePassphrase(false);
                            } catch {
                                // fallback: user can manually copy
                                setShowSavePassphrase(false);
                            }
                        }}
                    >
                        I've Saved It — Continue
                    </button>
                </div>
            </div>
        );
    }

    // Login / Sign-up form
    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">💬</div>
                <h1 className="auth-title">LocalChat</h1>
                <p className="auth-subtitle">
                    Secure, local-first messaging
                </p>

                {error && <div className="auth-error">{error}</div>}

                {/* Sign Up Section */}
                <div className="auth-section">
                    <label className="auth-label">New here? Create an account</label>
                    <input
                        className="auth-input"
                        type="text"
                        placeholder="Your display name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && name.trim()) handleSignUp();
                        }}
                    />
                    <button
                        className="auth-btn auth-btn-primary"
                        onClick={handleSignUp}
                        disabled={!name.trim()}
                    >
                        Sign Up
                    </button>
                </div>

                <div className="auth-divider">
                    <span>or</span>
                </div>

                {/* Log In Section */}
                <div className="auth-section">
                    <label className="auth-label">Already have an account?</label>
                    <textarea
                        className="auth-input auth-passphrase-input"
                        placeholder="Paste your recovery passphrase..."
                        value={passphraseInput}
                        onChange={(e) => setPassphraseInput(e.target.value)}
                        rows={3}
                    />
                    <button
                        className="auth-btn auth-btn-secondary"
                        onClick={handleLogIn}
                        disabled={!passphraseInput.trim()}
                    >
                        Log In with Passphrase
                    </button>
                </div>
            </div>
        </div>
    );

    async function handleSignUp() {
        if (!name.trim()) return;
        setError("");
        try {
            await auth.signUp(name.trim());
            setShowSavePassphrase(true);
        } catch (err: any) {
            console.error("[AuthUI] Sign up failed:", err);
            setError(err?.message || "Sign up failed. Please try again.");
        }
    }

    async function handleLogIn() {
        if (!passphraseInput.trim()) return;
        setError("");
        try {
            await auth.logIn(passphraseInput.trim());
        } catch (err: any) {
            console.error("[AuthUI] Log in failed:", err);
            setError("Invalid passphrase. Please check and try again.");
        }
    }
}
