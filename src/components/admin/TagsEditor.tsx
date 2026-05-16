'use client';

/**
 * Chip-style tag input — client component.
 * ADR-22: NO next-intl. English-only.
 * - Press Enter or comma to add a tag.
 * - Click × or press Backspace (on empty input) to remove the last tag.
 * Controlled: accepts value: string[] + onChange: (next: string[]) => void.
 */

import { useState, useRef, KeyboardEvent } from 'react';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

export default function TagsEditor({ value, onChange }: Props) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,+$/, '').trim();
    if (!tag || value.includes(tag)) {
      setInputValue('');
      return;
    }
    onChange([...value, tag]);
    setInputValue('');
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 min-h-[40px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
            aria-label={`Remove tag ${tag}`}
            className="opacity-60 hover:opacity-100 transition-opacity leading-none"
          >
            ×
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (inputValue.trim()) addTag(inputValue); }}
        placeholder={value.length === 0 ? 'Add tags (Enter or comma)' : ''}
        className="flex-1 min-w-[140px] bg-transparent text-sm outline-none placeholder:opacity-40"
        aria-label="Add a tag"
      />
    </div>
  );
}
