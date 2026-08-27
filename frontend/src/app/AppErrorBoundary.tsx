import { Component, type ReactNode } from 'react'
import i18n from '../i18n/config'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch() {
    // Production telemetry will be wired through the observability contract.
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="centered-state" role="alert">
          <div className="feedback-card">
            <p className="eyebrow">AI Workspace</p>
            <h1>{i18n.t('errors.unexpected')}</h1>
            <p>{i18n.t('errors.unexpectedDescription')}</p>
            <button
              type="button"
              className="primary-action"
              onClick={() => window.location.reload()}
            >
              {i18n.t('actions.retry')}
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
