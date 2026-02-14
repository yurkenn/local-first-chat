import { useState, useRef, useCallback } from "react";
import { usePassphraseAuth } from "jazz-tools/react";
import { wordlist } from "../wordlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Shield, KeyRound } from "lucide-react";

/**
 * AuthUI — Passphrase-based authentication for desktop apps.
 *
 * Uses Jazz's usePassphraseAuth instead of WebAuthn passkeys
 * because Tauri's embedded WebView (WKWebView/WebView2) does not
 * support the WebAuthn API (navigator.credentials).
 *
 * Security features:
 *   - Clipboard auto-clear after 30 seconds
 *   - Exponential backoff after 3 failed login attempts
 *   - Passphrase state cleared after save confirmation
 */

const MAX_ATTEMPTS_BEFORE_BACKOFF = 3;
const BASE_DELAY_MS = 2000;
const CLIPBOARD_CLEAR_DELAY_MS = 30_000;

export function AuthUI({ children }: { children: React.ReactNode }) {
    const [name, setName] = useState("");
    const [passphraseInput, setPassphraseInput] = useState("");
    const [showSavePassphrase, setShowSavePassphrase] = useState(false);
    const [error, setError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [copiedPassphrase, setCopiedPassphrase] = useState(false);

    const failedAttemptsRef = useRef(0);
    const lockoutUntilRef = useRef<number>(0);

    const auth = usePassphraseAuth({ wordlist });

    const scheduleClipboardClear = useCallback(() => {
        setTimeout(async () => {
            try {
                const clipText = await navigator.clipboard.readText();
                if (clipText === auth.passphrase) {
                    await navigator.clipboard.writeText("");
                }
            } catch {
                // Clipboard access may be denied
            }
        }, CLIPBOARD_CLEAR_DELAY_MS);
    }, [auth.passphrase]);

    // If authenticated and passphrase already saved, render children
    if (auth.state === "signedIn" && !showSavePassphrase) {
        return <>{children}</>;
    }

    // After sign-up: show passphrase to save
    if (auth.state === "signedIn" && showSavePassphrase) {
        return (
            <SavePassphraseView
                passphrase={auth.passphrase}
                copied={copiedPassphrase}
                onCopy={async () => {
                    try {
                        await navigator.clipboard.writeText(auth.passphrase);
                        setCopiedPassphrase(true);
                        scheduleClipboardClear();
                    } catch {
                        // fallback: user can manually copy
                    }
                    setShowSavePassphrase(false);
                }}
            />
        );
    }

    // Login / Sign-up form
    return (
        <AuthFormView
            name={name}
            onNameChange={setName}
            passphraseInput={passphraseInput}
            onPassphraseChange={setPassphraseInput}
            error={error}
            isLoggingIn={isLoggingIn}
            onSignUp={async () => {
                if (!name.trim()) return;
                setError("");
                try {
                    await auth.signUp(name.trim());
                    setShowSavePassphrase(true);
                } catch (err: unknown) {
                    console.error("[AuthUI] Sign up failed:", err);
                    setError(err instanceof Error ? err.message : "Sign up failed. Please try again.");
                }
            }}
            onLogIn={async () => {
                if (!passphraseInput.trim()) return;

                const now = Date.now();
                if (now < lockoutUntilRef.current) {
                    const remaining = Math.ceil((lockoutUntilRef.current - now) / 1000);
                    setError(`Too many attempts. Please wait ${remaining} seconds.`);
                    return;
                }

                setError("");
                setIsLoggingIn(true);
                try {
                    await auth.logIn(passphraseInput.trim());
                    setPassphraseInput("");
                    failedAttemptsRef.current = 0;
                } catch (err: unknown) {
                    console.error("[AuthUI] Log in failed:", err);
                    failedAttemptsRef.current += 1;

                    if (failedAttemptsRef.current >= MAX_ATTEMPTS_BEFORE_BACKOFF) {
                        const delay = BASE_DELAY_MS * Math.pow(2, failedAttemptsRef.current - MAX_ATTEMPTS_BEFORE_BACKOFF);
                        lockoutUntilRef.current = Date.now() + delay;
                        setError(`Invalid passphrase. Please wait ${Math.ceil(delay / 1000)}s before trying again.`);
                    } else {
                        setError("Invalid passphrase. Please check and try again.");
                    }
                } finally {
                    setIsLoggingIn(false);
                }
            }}
        />
    );
}

/* ─── Sub-components ─── */

/** Recovery key save screen shown after sign-up */
function SavePassphraseView({
    passphrase,
    copied,
    onCopy,
}: {
    passphrase: string;
    copied: boolean;
    onCopy: () => void;
}) {
    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md surface-elevated rounded-2xl p-8 animate-fade-in">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--organic-sage)] to-[var(--organic-green)] flex items-center justify-center mb-4">
                        <KeyRound className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-xl font-heading font-bold text-gradient">Save Your Recovery Key</h1>
                    <p className="text-sm text-muted-color text-center mt-2">
                        Copy this passphrase and keep it safe. You'll need it to log back in.
                    </p>
                </div>

                <textarea
                    className="w-full bg-surface border border-[hsl(var(--border))] rounded-lg px-4 py-3 text-sm font-mono text-primary-color outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] resize-none mb-4"
                    readOnly
                    value={passphrase}
                    rows={3}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    aria-label="Recovery passphrase"
                />

                <Button
                    className="w-full bg-[var(--organic-sage)] hover:bg-[var(--organic-sage-muted)] transition-opacity"
                    onClick={onCopy}
                >
                    {copied ? (
                        <><Check className="h-4 w-4 mr-2" /> Copied — Continue</>
                    ) : (
                        <><Copy className="h-4 w-4 mr-2" /> Copy & Continue</>
                    )}
                </Button>

                <p className="text-[10px] text-muted-color text-center mt-3 flex items-center justify-center gap-1">
                    <Shield className="h-3 w-3" />
                    Clipboard will be auto-cleared after 30 seconds for security.
                </p>
            </div>
        </div>
    );
}

/** Login / Sign-up form */
function AuthFormView({
    name,
    onNameChange,
    passphraseInput,
    onPassphraseChange,
    error,
    isLoggingIn,
    onSignUp,
    onLogIn,
}: {
    name: string;
    onNameChange: (v: string) => void;
    passphraseInput: string;
    onPassphraseChange: (v: string) => void;
    error: string;
    isLoggingIn: boolean;
    onSignUp: () => void;
    onLogIn: () => void;
}) {
    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md surface-elevated rounded-2xl p-8 animate-fade-in">
                <div className="flex flex-col items-center mb-8">
                    <div className="brand-logo mb-4">🪷</div>
                    <h1 className="text-2xl brand-title">Lotus</h1>
                    <p className="text-sm text-muted-color mt-1">
                        Secure, local-first messaging
                    </p>
                </div>

                {error && (
                    <div className="bg-[hsl(var(--destructive))/0.1] border border-[hsl(var(--destructive))/0.3] text-[hsl(var(--destructive))] text-sm rounded-lg px-4 py-2.5 mb-4">
                        {error}
                    </div>
                )}

                {/* Sign Up Section */}
                <div className="space-y-3">
                    <label className="label-section">
                        New here? Create an account
                    </label>
                    <Input
                        type="text"
                        placeholder="Your display name"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && name.trim()) onSignUp();
                        }}
                        aria-label="Display name"
                        className="input-base"
                    />
                    <Button
                        className="w-full bg-[var(--organic-sage)] hover:bg-[var(--organic-sage-muted)] transition-opacity"
                        onClick={onSignUp}
                        disabled={!name.trim()}
                    >
                        Sign Up
                    </Button>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[hsl(var(--border))]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-card-surface px-3 text-muted-color">or</span>
                    </div>
                </div>

                {/* Log In Section */}
                <div className="space-y-3">
                    <label className="label-section">
                        Already have an account?
                    </label>
                    <textarea
                        className="w-full bg-surface border border-[hsl(var(--border))] rounded-lg px-4 py-3 text-sm text-primary-color placeholder:text-muted-color outline-none focus:ring-1 focus:ring-[hsl(var(--ring))] resize-none"
                        placeholder="Paste your recovery passphrase..."
                        value={passphraseInput}
                        onChange={(e) => onPassphraseChange(e.target.value)}
                        rows={3}
                        aria-label="Recovery passphrase"
                    />
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={onLogIn}
                        disabled={!passphraseInput.trim() || isLoggingIn}
                    >
                        {isLoggingIn ? "Logging in…" : "Log In with Passphrase"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
