import { describe, it, expect } from 'vitest';

describe('Markdown dependencies importability', () => {
  it('react-markdown is importable', async () => {
    const mod = await import('react-markdown');
    expect(mod).not.toBeNull();
    expect(mod.default ?? mod).toBeTruthy();
  });

  it('remark-gfm is importable', async () => {
    const mod = await import('remark-gfm');
    expect(mod).not.toBeNull();
    expect(mod.default ?? mod).toBeTruthy();
  });

  it('rehype-highlight is importable', async () => {
    const mod = await import('rehype-highlight');
    expect(mod).not.toBeNull();
    expect(mod.default ?? mod).toBeTruthy();
  });
});
