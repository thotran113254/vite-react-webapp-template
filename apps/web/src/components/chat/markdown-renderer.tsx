import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

/** Renders markdown content with proper styling for chat messages. */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => <h1 className="mb-2 mt-3 text-lg font-bold first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-1.5 mt-2.5 text-sm font-semibold first:mt-0">{children}</h3>,

        // Paragraphs
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

        // Lists
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-0.5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-0.5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,

        // Code
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100 dark:bg-gray-950">
                {children}
              </code>
            );
          }
          return (
            <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-700">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="mb-2 last:mb-0">{children}</pre>,

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 underline hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
          >
            {children}
          </a>
        ),

        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="mb-2 border-l-3 border-teal-400 pl-3 italic text-gray-600 last:mb-0 dark:text-gray-400">
            {children}
          </blockquote>
        ),

        // Table
        table: ({ children }) => (
          <div className="mb-2 overflow-x-auto last:mb-0">
            <table className="min-w-full text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border-b border-gray-300 px-2 py-1 text-left font-semibold dark:border-gray-600">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-gray-200 px-2 py-1 dark:border-gray-700">{children}</td>
        ),

        // Horizontal rule
        hr: () => <hr className="my-3 border-gray-300 dark:border-gray-600" />,

        // Strong & emphasis
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
