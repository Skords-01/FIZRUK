import { Component } from "react";
import { captureException } from "./sentry.js";

/**
 * Лайтвейтний корневий ErrorBoundary — zero-cost у головному бандлі.
 *
 * Навмисно не використовує `Sentry.ErrorBoundary` з `@sentry/react`, бо той
 * статично підтягує весь SDK (~30–40 KB gzip) у initial chunk — див. правило
 * 2.3 у `.agents/skills/vercel-react-best-practices/AGENTS.md`
 * («Defer Non-Critical Third-Party Libraries»).
 *
 * `captureException` з `./sentry.js` — no-op, поки Sentry не завантажений
 * динамічним імпортом. Коли SDK буде готовий (див. `initSentry`), виклики
 * автоматично перенаправляться в реальний `Sentry.captureException`.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.resetError = () => this.setState({ error: null });
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Lazy-forward: якщо Sentry SDK ще не підтягнувся, це no-op;
    // якщо вже підтягнувся — піде у Sentry.captureException.
    try {
      captureException(error, {
        contexts: { react: { componentStack: info?.componentStack } },
      });
    } catch {
      /* noop — error boundary не має ламатись через телеметрію */
    }
  }

  render() {
    const { error } = this.state;
    const { fallback: Fallback, children } = this.props;
    if (error) {
      if (typeof Fallback === "function") {
        return <Fallback error={error} resetError={this.resetError} />;
      }
      return Fallback || null;
    }
    return children;
  }
}
