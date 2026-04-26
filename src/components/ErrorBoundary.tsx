import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: any) { console.error('App crash:', error, info) }
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}
