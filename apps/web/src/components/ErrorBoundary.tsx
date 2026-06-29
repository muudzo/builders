import { Component, type ErrorInfo, type ReactNode } from 'react';
import './error-boundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * App-wide error boundary so a render-time crash shows a friendly recovery screen instead of a
 * blank page. (React error boundaries must still be class components in React 19.)
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // A production app forwards this to an error tracker (e.g. Sentry).
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Unhandled UI error', error, info);
    }
  }

  private handleReset = (): void => {
    window.location.assign('/');
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert" className="vk-error-boundary">
        <div className="vk-error-boundary__card">
          <p className="vk-error-boundary__mark" aria-hidden="true">
            !
          </p>
          <h1>Something went wrong</h1>
          <p>An unexpected error interrupted the page. Your data is safe.</p>
          <button type="button" onClick={this.handleReset} className="vk-error-boundary__button">
            Back to start
          </button>
        </div>
      </div>
    );
  }
}
