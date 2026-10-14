import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./ai-bc-workspace.module.css";

export default function AiBcMarkdown({ content }: { content: string }) {
  return (
    <div className={`${styles.markdown} prose prose-sm max-w-none`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div
              className={styles.tableScroll}
              role="region"
              aria-label="Tabel jawaban AI"
              tabIndex={0}
            >
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content.replace(/<br\s*\/?>/gi, "\n")}
      </ReactMarkdown>
    </div>
  );
}
