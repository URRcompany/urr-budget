import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ReelBudget render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="login-screen">
          <div className="login-screen__card">
            <p className="brand">ReelBudget</p>
            <h1 className="login-screen__title">화면을 불러오지 못했습니다</h1>
            <p className="login-screen__error" role="alert">
              {this.state.error.message}
            </p>
            <p className="muted login-screen__hint">
              아래 「새로고침」 후에도 같으면, 개발자 도구(F12) → Console 탭
              오류를 확인해 주세요.
            </p>
            <div className="login-screen__actions" style={{ marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => window.location.reload()}
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
