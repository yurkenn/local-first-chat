import { useState, useRef, useCallback } from "react";
import { usePassphraseAuth } from "jazz-tools/react";
import { wordlist } from "../wordlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Shield, KeyRound } from "lucide-react";
import { handleError } from "@/lib/error-utils";

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
                    handleError(err, { context: "AuthUI" });
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
        <div className="flex items-center justify-center min-h-screen p-4 bg-[hsl(var(--background))]">
            <div className="w-full max-w-[420px] bg-[hsl(var(--card))] border border-[rgba(255,255,255,0.06)] rounded-[20px] p-8 animate-scale-in shadow-[var(--shadow-xl)]">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 rounded-[18px] bg-gradient-to-br from-[var(--organic-sage)] to-[#2B7A4B] flex items-center justify-center mb-5 shadow-[var(--shadow-lg)]">
                        <KeyRound className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-xl font-heading font-semibold text-gradient tracking-[-0.02em]">
                        Save Your Recovery Key
                    </h1>
                    <p className="text-[13px] text-muted-color text-center mt-2 leading-relaxed max-w-[300px]">
                        Copy this passphrase and keep it safe. You'll need it to log back in.
                    </p>
                </div>

                <textarea
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[14px] px-4 py-3.5 text-[13px] font-mono text-primary-color outline-none focus:border-[hsl(var(--primary)/0.4)] focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] resize-none mb-5 transition-all"
                    readOnly
                    value={passphrase}
                    rows={3}
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    aria-label="Recovery passphrase"
                />

                <Button
                    className="w-full h-[50px] rounded-[14px] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)] text-white font-semibold text-[15px] transition-all press-effect shadow-[var(--shadow-md)]"
                    onClick={onCopy}
                >
                    {copied ? (
                        <><Check className="h-4 w-4 mr-2" /> Copied — Continue</>
                    ) : (
                        <><Copy className="h-4 w-4 mr-2" /> Copy & Continue</>
                    )}
                </Button>

                <p className="text-[11px] text-muted-color text-center mt-4 flex items-center justify-center gap-1.5">
                    <Shield className="h-3 w-3" />
                    Clipboard auto-clears after 30 seconds
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
        <div className="flex items-center justify-center min-h-screen p-4 bg-[hsl(var(--background))]">
            <div className="w-full max-w-[420px] bg-[hsl(var(--card))] border border-[rgba(255,255,255,0.06)] rounded-[20px] p-8 animate-scale-in shadow-[var(--shadow-xl)]">
                {/* Brand header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="brand-logo mb-5 shadow-[var(--shadow-lg)]"><img src="/lotus-logo.png" alt="Lotus" /></div>
                    <h1 className="text-[28px] brand-title tracking-[-0.03em]">Lotus</h1>
                    <p className="text-[13px] text-muted-color mt-1.5">
                        Secure, local-first messaging
                    </p>
                </div>

                {/* Error display */}
                {error && (
                    <div className="bg-[rgba(255,69,58,0.08)] border border-[rgba(255,69,58,0.2)] text-[var(--organic-red)] text-[13px] rounded-[12px] px-4 py-3 mb-5">
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
                        className="h-[50px] rounded-[14px] bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] px-4 text-[15px] placeholder:text-muted-color focus:border-[hsl(var(--primary)/0.4)] focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] transition-all"
                    />
                    <Button
                        className="w-full h-[50px] rounded-[14px] bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.85)] text-white font-semibold text-[15px] transition-all press-effect shadow-[var(--shadow-md)]"
                        onClick={onSignUp}
                        disabled={!name.trim()}
                    >
                        Sign Up
                    </Button>
                </div>

                {/* Divider */}
                <div className="relative my-7">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[rgba(255,255,255,0.06)]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-[hsl(var(--card))] px-4 text-muted-color">or</span>
                    </div>
                </div>

                {/* Log In Section */}
                <div className="space-y-3">
                    <label className="label-section">
                        Already have an account?
                    </label>
                    <textarea
                        className="w-full h-[90px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-[14px] px-4 py-3.5 text-[15px] text-primary-color placeholder:text-muted-color outline-none focus:border-[hsl(var(--primary)/0.4)] focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] resize-none transition-all"
                        placeholder="Paste your recovery passphrase..."
                        value={passphraseInput}
                        onChange={(e) => onPassphraseChange(e.target.value)}
                        rows={3}
                        aria-label="Recovery passphrase"
                    />
                    <Button
                        variant="secondary"
                        className="w-full h-[50px] rounded-[14px] text-[15px] font-semibold press-effect"
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
