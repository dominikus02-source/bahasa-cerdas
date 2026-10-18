import Link from "next/link"
import PaymentStatusPanel, { type PanelView } from "./PaymentStatusPanel"
import "./billing.css"

/** Dipisah agar bisa dipratinjau dengan data contoh. */
export default function PaymentFinishView({ view, loggedIn }: { view: PanelView; loggedIn: boolean }) {
  return (
    <main style={{ minHeight: "100dvh", background: "var(--clr-bg)", color: "var(--clr-text)", padding: "20px 16px 40px" }}>
      <div className="bp bp--narrow">
        <Link href="/" className="bp-eyebrow" style={{ textDecoration: "none", justifySelf: "start", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
          BahasaCerdas
        </Link>
        <PaymentStatusPanel initial={view} loggedIn={loggedIn} />
        <p className="bp-small" style={{ textAlign: "center", margin: 0 }}>
          Ada kendala? <Link href="/faq" className="bp-link">Bantuan</Link>
        </p>
      </div>
    </main>
  )
}
