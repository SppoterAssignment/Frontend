import { Component } from 'react'

/**
 * Catches render errors in its children and shows a fallback instead of a
 * blank page. Error boundaries must be class components: there is no hook
 * equivalent of componentDidCatch / getDerivedStateFromError.
 */
export default class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error) {
    return { error }
  }

  // New data may fix the problem, so clear the error when resetKey changes.
  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <p>{this.props.message ?? 'This part of the page failed to load.'}</p>
          <button type="button" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}
