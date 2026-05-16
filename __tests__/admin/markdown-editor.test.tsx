/**
 * Tests for src/components/admin/MarkdownEditor.tsx (T6)
 * FR-67, FR-68, FR-69, NFR-08, ADR-25
 *
 * Strict TDD: RED phase — written before the impl exists.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// MarkdownEditor is not implemented yet — this import will fail in RED phase.
import MarkdownEditor from '../../src/components/admin/MarkdownEditor';

const TEST_VALUE = '# Hello\n\n```ts\nconst x = 1;\n```';

describe('MarkdownEditor', () => {
  it('renders Write tab by default with the value in a textarea', () => {
    render(<MarkdownEditor value={TEST_VALUE} onChange={vi.fn()} />);

    // Write tab should be default — textarea visible
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe(TEST_VALUE);
  });

  it('clicking Preview tab shows rendered markdown (no textarea)', () => {
    render(<MarkdownEditor value={TEST_VALUE} onChange={vi.fn()} />);

    const previewBtn = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewBtn);

    // Textarea should be gone
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // Should have a heading from the markdown
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('Preview renders code block with a language class (rehype-highlight wiring)', () => {
    render(<MarkdownEditor value={TEST_VALUE} onChange={vi.fn()} />);

    const previewBtn = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewBtn);

    // rehype-highlight adds class="hljs language-ts" (or language-typescript)
    // Accept either class pattern
    const codeEl = document.querySelector('code[class]');
    expect(codeEl).toBeTruthy();
    const cls = codeEl?.className ?? '';
    const hasHighlight = cls.includes('hljs') || cls.includes('language-ts') || cls.includes('language-typescript');
    expect(hasHighlight).toBe(true);
  });

  it('switching back to Write tab from Preview preserves the textarea value', () => {
    render(<MarkdownEditor value={TEST_VALUE} onChange={vi.fn()} />);

    // Go to Preview
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // Go back to Write
    fireEvent.click(screen.getByRole('button', { name: /write/i }));
    const textarea = screen.getByRole('textbox');
    expect((textarea as HTMLTextAreaElement).value).toBe(TEST_VALUE);
  });

  it('calls onChange when text is edited', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new content' } });
    expect(onChange).toHaveBeenCalledWith('new content');
  });
});
