import { Component, type ReactNode, type ErrorInfo } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" style={{ textAlign: 'center', padding: '4rem 1rem', maxWidth: 480, margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>משהו השתבש</h1>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            אירעה שגיאה בטעינת הדף. נסה לרענן או לחזור לדף הבית.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '10px 24px',
              fontSize: '1rem',
              borderRadius: '10px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            חזרה לדף הבית
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
