'use client';

/**
 * Markdown editor with Write/Preview tabs.
 * ADR-25: react-markdown + remark-gfm + rehype-highlight (already installed, no new deps).
 * No live side-by-side render — tabs only. Preview rebuilds on tab switch.
 */

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

type Props = {
  value: string;
  onChange: (next: string) => void;
  label?: string;
};

export default function MarkdownEditor({ value, onChange, label }: Props) {
  const [tab, setTab] = useState<'write' | 'preview'>('write');

  return (
    <div className="space-y-2">
      {label && (
        <span className="block text-sm font-medium">{label}</span>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 text-xs border-b pb-1">
        <button
          type="button"
          onClick={() => setTab('write')}
          aria-pressed={tab === 'write'}
          className={`px-3 py-1 rounded-t transition-colors ${
            tab === 'write'
              ? 'bg-foreground text-background'
              : 'opacity-60 hover:opacity-90'
          }`}
        >
          Write
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          aria-pressed={tab === 'preview'}
          className={`px-3 py-1 rounded-t transition-colors ${
            tab === 'preview'
              ? 'bg-foreground text-background'
              : 'opacity-60 hover:opacity-90'
          }`}
        >
          Preview
        </button>
      </div>

      {/* Content area */}
      {tab === 'write' ? (
        <textarea
          className="w-full min-h-[300px] font-mono text-sm rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 resize-y"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
        />
      ) : (
        <div className="prose dark:prose-invert max-w-none min-h-[300px] rounded-md border px-4 py-3">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {value}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
