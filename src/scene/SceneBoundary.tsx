import { Component, type ReactNode } from 'react';

interface Props {
  readonly onError: () => void;
  readonly children: ReactNode;
}

/**
 * Catches failures inside the 3D stage (a model that will not download, a lost context) so they
 * never unmount the page: the scene simply disappears and the content stays readable.
 */
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    console.warn('3D scene disabled:', error);
    this.props.onError();
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
