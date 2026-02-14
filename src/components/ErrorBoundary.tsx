import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Optional fallback UI. Defaults to built-in error card. */
    fallback?: ReactNode;
    /** Name of the section (for logging) */
    section?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary — catches uncaught errors in child components
 * and displays a recovery UI instead of a white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(
            `[ErrorBoundary${this.props.section ? `:${this.props.section}` : ""}]`,
            error,
            errorInfo.componentStack
        );
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[200px]">
                    <div className="w-12 h-12 rounded-full bg-[hsl(var(--destructive))/0.1] flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-[hsl(var(--destructive))]" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-primary-color">
                            Something went wrong
                        </h3>
                        <p className="text-xs text-muted-color max-w-xs">
                            {this.state.error?.message || "An unexpected error occurred."}
                        </p>
                    </div>
                    <button
                        onClick={this.handleRetry}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
                            bg-surface hover:bg-[hsl(var(--secondary))/0.8]
                            text-sm font-medium text-primary-color
                            transition-colors cursor-pointer"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
