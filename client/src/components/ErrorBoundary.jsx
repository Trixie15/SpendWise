import { Component } from 'react';

// Catches unexpected rendering errors so the whole app doesn't go blank
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error(error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="font-display text-3xl font-extrabold">Something went wrong</p>
        <p className="mt-2 max-w-sm text-pine-soft">
          An unexpected error occurred. Your data is safe. Please reload the page to continue.
        </p>
        <button onClick={() => window.location.reload()} className="btn btn-primary mt-6">
          Reload page
        </button>
      </div>
    );
  }
}
