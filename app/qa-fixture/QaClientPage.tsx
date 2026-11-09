"use client";

import { Component, type ReactNode } from "react";
import { QA_CLIENT_PAGES } from "./client-pages";

class QaBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { error: e instanceof Error ? e.message : String(e) }; }
  render() {
    if (this.state.error) return <p data-qa-page-error>{this.state.error.slice(0, 200)}</p>;
    return this.props.children;
  }
}

/** QA fixture saja: render komponen halaman klien asli; tidak ada bypass auth. */
export function QaClientPage({ route }: { route: string }) {
  const Page = QA_CLIENT_PAGES[route];
  if (!Page) return <p data-qa-page-missing>Halaman tidak terdaftar: {route}</p>;
  return <QaBoundary><div data-qa-page={route}><Page /></div></QaBoundary>;
}
