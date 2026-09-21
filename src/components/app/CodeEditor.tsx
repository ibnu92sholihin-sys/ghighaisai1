import { useMemo, useRef, type UIEvent } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const TOKEN_PATTERN =
  /(<!--[\s\S]*?-->)|(<\/?[A-Za-z][^>]*>)|("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|class|new|async|await|true|false|null|undefined)\b)|(\b\d+(?:\.\d+)?\b)/g;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function colorizeTag(tag: string) {
  return escapeHtml(tag)
    .replace(
      /\s([\w:-]+)(\s*=\s*)(&quot;.*?&quot;|'.*?'|[^\s&]+)(?=\s|&gt;)/g,
      ' <span class="code-attr">$1</span>$2<span class="code-string">$3</span>',
    )
    .replace(/^(?:&lt;)(\/)?([A-Za-z][\w:-]*)/, '&lt;$1<span class="code-tag">$2</span>');
}

function highlight(source: string) {
  let output = "";
  let cursor = 0;
  for (const match of source.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    output += escapeHtml(source.slice(cursor, index));
    const token = match[0];
    if (match[1]) output += `<span class="code-comment">${escapeHtml(token)}</span>`;
    else if (match[2]) output += colorizeTag(token);
    else if (match[3] || match[4] || match[5])
      output += `<span class="code-string">${escapeHtml(token)}</span>`;
    else if (match[6]) output += `<span class="code-keyword">${token}</span>`;
    else output += `<span class="code-number">${token}</span>`;
    cursor = index + token.length;
  }
  output += escapeHtml(source.slice(cursor));
  return `${output}\n`;
}

export function CodeEditor({ value, onChange, disabled }: Props) {
  const highlightRef = useRef<HTMLPreElement>(null);
  const html = useMemo(() => highlight(value), [value]);

  function syncScroll(event: UIEvent<HTMLTextAreaElement>) {
    if (!highlightRef.current) return;
    highlightRef.current.scrollTop = event.currentTarget.scrollTop;
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  return (
    <div className="code-editor relative min-h-[420px] flex-1 overflow-hidden bg-code">
      <pre
        ref={highlightRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre p-4 font-mono text-xs leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <textarea
        aria-label="Editor coding"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={syncScroll}
        disabled={disabled}
        spellCheck={false}
        wrap="off"
        className="absolute inset-0 size-full resize-none overflow-auto whitespace-pre border-0 bg-transparent p-4 font-mono text-xs leading-relaxed text-transparent caret-code-caret outline-none selection:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
