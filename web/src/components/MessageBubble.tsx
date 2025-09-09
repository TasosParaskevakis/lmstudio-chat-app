import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';

type Props = {
  role: 'user'|'assistant'|'system';
  content: string;
}

export function MessageBubble({ role, content }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.querySelectorAll('pre code').forEach((el) => {
      hljs.highlightElement(el as HTMLElement);
    });
  }, [content]);

  const isUser = role === 'user';
  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} my-2`}>
      <div className={`${isUser ? 'bg-blue-600 text-white' : 'bg-white'} max-w-[75%] rounded-lg shadow px-4 py-2`}>
        <div ref={ref} className={`message-content prose prose-sm max-w-none ${isUser ? 'prose-invert text-white' : ''}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkBreaks]}
            components={{
              code({inline, className, children, ...props}) {
                const language = /language-/.test(className || '') ? className : undefined;
                if (inline) {
                  return <code className={className} {...props}>{children}</code>;
                }
                return (
                  <pre><code className={language} {...props}>{children}</code></pre>
                );
              },
              a({href, children, ...props}) {
                return <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>;
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
 
