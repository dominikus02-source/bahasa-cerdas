import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Jawaban NARA (Markdown) → tipografi tenang & aman.
 *
 * Aman: HTML mentah TIDAK pernah dirender (tanpa rehype-raw, `skipHtml`),
 * hanya elemen di DIPERBOLEHKAN yang lolos (gambar, iframe, skrip, dll.
 * dibuang beserta isinya), dan tautan tidak dirender sebagai tautan (teks saja)
 * sehingga tidak ada `javascript:`/URL asing yang bisa diklik.
 * Elemen yang tidak diperbolehkan dibuka (`unwrapDisallowed`) → teksnya tetap terbaca.
 */
export const ELEMEN_DIPERBOLEHKAN = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "del", "ul", "ol", "li",
  "hr", "blockquote", "br", "code", "pre", "table", "thead", "tbody", "tr", "th", "td",
] as const;

const judul = "mt-5 first:mt-0 mb-2 font-display font-semibold tracking-tight text-foreground";
const KOMPONEN: Components = {
  h1: ({ children }) => <h3 className={`${judul} text-[17px] leading-7`}>{children}</h3>,
  h2: ({ children }) => <h3 className={`${judul} text-[16px] leading-7`}>{children}</h3>,
  h3: ({ children }) => <h4 className={`${judul} text-[15px] leading-6`}>{children}</h4>,
  h4: ({ children }) => <h5 className={`${judul} text-[14.5px] leading-6`}>{children}</h5>,
  h5: ({ children }) => <h6 className={`${judul} text-sm leading-6`}>{children}</h6>,
  h6: ({ children }) => <h6 className={`${judul} text-sm leading-6 text-muted-foreground`}>{children}</h6>,
  p: ({ children }) => <p className="my-2.5 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-2.5 list-disc space-y-1.5 pl-5 marker:text-muted-foreground/70">{children}</ul>,
  ol: ({ children }) => <ol className="my-2.5 list-decimal space-y-1.5 pl-5 marker:text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="pl-1 [&>p]:my-1">{children}</li>,
  hr: () => <hr className="my-5 border-0 border-t border-border" />,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-bc-violet/50 pl-3.5 italic text-foreground/85">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[0.92em]">{children}</code>,
  pre: ({ children }) => <pre className="my-3 overflow-x-auto whitespace-pre-wrap rounded-xl bg-muted p-3 text-[13px] leading-6">{children}</pre>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto" role="region" aria-label="Tabel saran NARA" tabIndex={0}>
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-border px-2 py-1.5 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-b border-border/60 px-2 py-1.5 align-top">{children}</td>,
};

export function NaraMarkdown({ teks, className = "" }: { teks: string; className?: string }) {
  return (
    <div data-nara-markdown className={`break-words text-[14.5px] leading-7 text-foreground/90 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        allowedElements={ELEMEN_DIPERBOLEHKAN as unknown as string[]}
        unwrapDisallowed
        components={KOMPONEN}
      >
        {teks.replace(/<br\s*\/?>/gi, "\n")}
      </ReactMarkdown>
    </div>
  );
}
