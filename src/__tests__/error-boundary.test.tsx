import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import React from "react";

function ThrowingChild(): React.ReactElement {
    throw new Error("Test error");
}

function GoodChild() {
    return <div>All good</div>;
}

describe("ErrorBoundary", () => {
    it("renders children when no error", () => {
        const { getByText } = render(
            <ErrorBoundary>
                <GoodChild />
            </ErrorBoundary>
        );
        expect(getByText("All good")).toBeInTheDocument();
    });

    it("renders fallback UI on error", () => {
        // Suppress React error boundary console.error in test output
        const spy = vi.spyOn(console, "error").mockImplementation(() => { });

        const { getByText } = render(
            <ErrorBoundary>
                <ThrowingChild />
            </ErrorBoundary>
        );
        expect(getByText("Something went wrong")).toBeInTheDocument();
        expect(getByText("Test error")).toBeInTheDocument();
        expect(getByText("Try Again")).toBeInTheDocument();

        spy.mockRestore();
    });

    it("renders custom fallback when provided", () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => { });

        const { getByText } = render(
            <ErrorBoundary fallback={<div>Custom fallback</div>}>
                <ThrowingChild />
            </ErrorBoundary>
        );
        expect(getByText("Custom fallback")).toBeInTheDocument();

        spy.mockRestore();
    });
});
