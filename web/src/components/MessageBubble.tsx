import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';

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
        <div ref={ref} className="message-content prose prose-sm max-w-none whitespace-pre-wrap">
          {renderMarkdown(content)}
        </div>
      </div>
    </div>
  );
}

// very light markdown/code fence rendering without heavy deps
function renderMarkdown(text: string) {
  // code fences ```lang\ncode\n```
  const parts: any[] = [];
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const [full, lang, code] = m;
    if (m.index > lastIndex) parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex, m.index)}</span>);
    parts.push(<pre key={`c${m.index}`}><code className={lang ? `language-${lang}` : ''}>{code}</code></pre>);
    lastIndex = m.index + full.length;
  }
  if (lastIndex < text.length) parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex)}</span>);
  return parts;
}

