import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "Unexpected render error";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Route render failed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-bold">This page couldn’t be loaded</h1>
        <p className="text-muted-foreground mt-2">{this.state.message || "Please try again."}</p>
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            className="text-primary font-medium"
            onClick={() => this.setState({ hasError: false, message: "" })}
          >
            Retry render
          </button>
          <Link to="/" className="text-primary font-medium">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }
}
