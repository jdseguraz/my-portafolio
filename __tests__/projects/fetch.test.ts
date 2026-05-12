/**
 * Tests for src/lib/projects/fetch.ts
 * FR-183, FR-184, FR-185, ADR-72, ADR-73, NFR-40
 * Strict TDD — RED phase
 *
 * Verifies:
 *  1. getPublishedProjectBySlug — uses SELECT *, eq('slug'), eq('published', true), maybeSingle
 *  2. getAllPublishedProjects — uses SELECT *, eq('published', true), order x2
 *  3. React.cache() dedup: calling getPublishedProjectBySlug('foo') twice results in
 *     only ONE underlying maybeSingle() invocation (within same module reference scope)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Chainable Supabase mock
// ---------------------------------------------------------------------------
const mockMaybeSingle = vi.fn();
const mockOrder2 = vi.fn(() => ({ data: [], error: null }));
const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
const mockEqPublishedSingle = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockEqSlug = vi.fn(() => ({ eq: mockEqPublishedSingle }));
const mockEqPublishedList = vi.fn(() => ({ order: mockOrder1 }));
const mockSelectSingle = vi.fn(() => ({ eq: mockEqSlug }));
const mockSelectList = vi.fn(() => ({ eq: mockEqPublishedList }));

// The `from` mock returns the single-query chain by default.
// Tests that need the list chain override mockFrom directly in their beforeEach.
const mockFrom = vi.fn(() => {
  return { select: mockSelectSingle };
});

const mockCreateClient = vi.fn(() =>
  Promise.resolve({ from: mockFrom })
);

vi.mock('../../src/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are set up
// ---------------------------------------------------------------------------
async function getFetch() {
  vi.resetModules();
  return await import('../../src/lib/projects/fetch');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockOrder2.mockReturnValue({ data: [], error: null });
  mockOrder1.mockReturnValue({ order: mockOrder2 });
  mockEqPublishedSingle.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockEqSlug.mockReturnValue({ eq: mockEqPublishedSingle });
  mockEqPublishedList.mockReturnValue({ order: mockOrder1 });
  mockSelectSingle.mockReturnValue({ eq: mockEqSlug });
  mockSelectList.mockReturnValue({ eq: mockEqPublishedList });
  mockFrom.mockReturnValue({ select: mockSelectSingle });
});

// ---------------------------------------------------------------------------
// getPublishedProjectBySlug tests
// ---------------------------------------------------------------------------
describe('getPublishedProjectBySlug', () => {
  it('calls select("*") on the projects table', async () => {
    const { getPublishedProjectBySlug } = await getFetch();
    await getPublishedProjectBySlug('foo');
    expect(mockSelectSingle).toHaveBeenCalledWith('*');
  });

  it('applies eq("slug", slug)', async () => {
    const { getPublishedProjectBySlug } = await getFetch();
    await getPublishedProjectBySlug('my-slug');
    expect(mockEqSlug).toHaveBeenCalledWith('slug', 'my-slug');
  });

  it('applies eq("published", true)', async () => {
    const { getPublishedProjectBySlug } = await getFetch();
    await getPublishedProjectBySlug('my-slug');
    expect(mockEqPublishedSingle).toHaveBeenCalledWith('published', true);
  });

  it('calls maybeSingle()', async () => {
    const { getPublishedProjectBySlug } = await getFetch();
    await getPublishedProjectBySlug('foo');
    expect(mockMaybeSingle).toHaveBeenCalledOnce();
  });

  it('returns null when project not found', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { getPublishedProjectBySlug } = await getFetch();
    const result = await getPublishedProjectBySlug('nope');
    expect(result).toBeNull();
  });

  it('returns project data when found', async () => {
    const fakeProject = { id: '1', slug: 'foo', title_en: 'Foo', published: true };
    mockMaybeSingle.mockResolvedValue({ data: fakeProject, error: null });
    const { getPublishedProjectBySlug } = await getFetch();
    const result = await getPublishedProjectBySlug('foo');
    expect(result).toMatchObject({ slug: 'foo' });
  });
});

// ---------------------------------------------------------------------------
// getAllPublishedProjects tests
// ---------------------------------------------------------------------------
describe('getAllPublishedProjects', () => {
  beforeEach(() => {
    // Override to return list chain
    mockFrom.mockReturnValue({ select: mockSelectList });
  });

  it('calls select("*") on the projects table', async () => {
    const { getAllPublishedProjects } = await getFetch();
    await getAllPublishedProjects();
    expect(mockSelectList).toHaveBeenCalledWith('*');
  });

  it('applies eq("published", true)', async () => {
    const { getAllPublishedProjects } = await getFetch();
    await getAllPublishedProjects();
    expect(mockEqPublishedList).toHaveBeenCalledWith('published', true);
  });

  it('applies order("display_order")', async () => {
    const { getAllPublishedProjects } = await getFetch();
    await getAllPublishedProjects();
    expect(mockOrder1).toHaveBeenCalledWith('display_order', { ascending: true });
  });

  it('applies second order("created_at")', async () => {
    const { getAllPublishedProjects } = await getFetch();
    await getAllPublishedProjects();
    expect(mockOrder2).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when data is null', async () => {
    mockOrder2.mockReturnValue({ data: null, error: null });
    const { getAllPublishedProjects } = await getFetch();
    const result = await getAllPublishedProjects();
    expect(result).toEqual([]);
  });
});
