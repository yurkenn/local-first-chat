import { useState, useEffect, useCallback, memo } from "react";
import { WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * OfflineBanner — shows a dismissible notification bar when the user is offline.
 * Uses navigator.onLine + 'online'/'offline' events.
 * Auto-shows when network drops, auto-hides after reconnect (with a brief success message).
 */
export const OfflineBanner = memo(function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(() =>
        typeof navigator !== "undefined" ? navigator.onLine : true
    );
    const [dismissed, setDismissed] = useState(false);
    const [justReconnected, setJustReconnected] = useState(false);

    useEffect(() => {
        const goOnline = () => {
            setIsOnline(true);
            setDismissed(false);
            setJustReconnected(true);
            // Hide "reconnected" message after 3 seconds
            const timer = setTimeout(() => setJustReconnected(false), 3000);
            return () => clearTimeout(timer);
        };
        const goOffline = () => {
            setIsOnline(false);
            setDismissed(false);
            setJustReconnected(false);
        };

        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);

        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, []);

    const handleDismiss = useCallback(() => setDismissed(true), []);

    // Nothing to show
    if (isOnline && !justReconnected) return null;
    if (dismissed) return null;

    return (
        <div
            className={cn(
                "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300 animate-fade-in",
                isOnline
                    ? "bg-emerald-600/90 text-white backdrop-blur-sm"
                    : "bg-amber-600/90 text-white backdrop-blur-sm"
            )}
            role="status"
            aria-live="assertive"
        >
            {isOnline ? (
                <>
                    <span className="inline-flex items-center gap-1.5">
                        ✓ Back online — changes synced
                    </span>
                </>
            ) : (
                <>
                    <WifiOff className="h-4 w-4 shrink-0" />
                    <span>You're offline — changes will sync when reconnected</span>
                </>
            )}
            <button
                onClick={handleDismiss}
                className="ml-2 p-0.5 rounded hover:bg-white/20 transition-colors"
                aria-label="Dismiss"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
});
