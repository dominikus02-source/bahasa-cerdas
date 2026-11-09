"use client";

import { Component, type ReactNode } from "react";
import { PathParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { QA_CLIENT_PAGES } from "./client-pages";

class QaBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { error: e instanceof Error ? e.message : String(e) }; }
  render() {
    if (this.state.error) return <p data-qa-page-error>{this.state.error.slice(0, 200)}</p>;
    return this.props.children;
  }
}

// Segmen dinamis palsu: setiap nama param ([id], [paketId], ...) bernilai "qa-1".
const QA_PARAMS = new Proxy({} as Record<string, string>, {
  get: (_t, k) => (typeof k === "string" && k !== "then" ? "qa-1" : undefined),
});
const PARAMS_PROMISE = Promise.resolve(QA_PARAMS);
const SEARCH_PROMISE = Promise.resolve({});

/** QA fixture saja: render komponen halaman klien asli; tidak ada bypass auth. */
export function QaClientPage({ route }: { route: string }) {
  const Page = QA_CLIENT_PAGES[route];
  if (!Page) return <p data-qa-page-missing>Halaman tidak terdaftar: {route}</p>;
  return (
    <QaBoundary>
      <PathParamsContext.Provider value={QA_PARAMS}>
        <div data-qa-page={route}><Page params={PARAMS_PROMISE} searchParams={SEARCH_PROMISE} /></div>
      </PathParamsContext.Provider>
    </QaBoundary>
  );
}
