import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ImageLightboxProps {
    src: string;
    onClose: () => void;
}

/**
 * ImageLightbox — Full-screen image overlay.
 * Features: ESC to close, click backdrop to close, smooth scale-in.
 */
export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        },
        [onClose]
    );

    useEffect(() => {
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

            {/* Close button */}
            <button
                className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] flex items-center justify-center text-white/80 hover:text-white transition-colors"
                onClick={onClose}
                aria-label="Close lightbox"
            >
                <X className="h-5 w-5" />
            </button>

            {/* Image */}
            <img
                src={src}
                alt="Full size preview"
                className="relative z-10 max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                style={{
                    animation: "lightbox-zoom-in 0.2s cubic-bezier(0.2, 0, 0, 1)",
                }}
                onClick={(e) => e.stopPropagation()}
            />
        </div>,
        document.body
    );
}
