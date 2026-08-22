import { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTriangleExclamation,
  faRotateRight,
  faHouse,
  faBug,
} from '@fortawesome/free-solid-svg-icons';


export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ componentStack: info?.componentStack ?? null });
    // In production you'd send to an error-tracking service (Sentry, etc.)
    console.error('[ErrorBoundary] Uncaught error:', error);
    if (info?.componentStack) console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, componentStack: null });
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, componentStack } = this.state;
    const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center shadow-sm">
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-4xl text-red-500" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              The application encountered an unexpected error. You can try
              recovering below, or go back to the dashboard.
            </p>
          </div>

          {/* Dev-only error details */}
          {isDev && error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-100 border-b border-red-200">
                <FontAwesomeIcon icon={faBug} className="text-red-600 text-sm" />
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
                  Dev — Error details
                </span>
              </div>
              <div className="p-4 overflow-x-auto">
                <p className="text-xs font-mono text-red-800 whitespace-pre-wrap break-words mb-3">
                  {error.toString()}
                </p>
                {componentStack && (
                  <details>
                    <summary className="text-xs text-red-600 cursor-pointer font-semibold mb-1">
                      Component stack
                    </summary>
                    <pre className="text-xs font-mono text-red-700 whitespace-pre-wrap break-words mt-2">
                      {componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <FontAwesomeIcon icon={faRotateRight} />
              Try Again
            </button>
            <button
              onClick={this.handleGoHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl transition-colors border border-slate-200 shadow-sm"
            >
              <FontAwesomeIcon icon={faHouse} />
              Go to Dashboard
            </button>
          </div>

          {/* Version hint */}
          <p className="text-center text-xs text-slate-400 mt-6">
            Rock Out College — School Fees v1.0
          </p>
        </div>
      </div>
    );
  }
}
