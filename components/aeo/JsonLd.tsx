import { headers } from "next/headers";

interface JsonLdProps {
  data: Record<string, unknown>;
}

// Server component. Reads the CSP nonce (set by middleware) so the inline
// JSON-LD block passes the strict Content-Security-Policy.
export default async function JsonLd({ data }: JsonLdProps) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      nonce={nonce}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
