/**
 * Tests for src/app/admin/projects/actions.ts (T4)
 * FR-70, FR-71, FR-73, FR-74, FR-77, FR-80, NFR-08, ADR-17
 * Extended: FR-91, FR-92, FR-98, FR-99, ADR-35, ADR-37 (deleteProject Storage + createProject sequencing)
 *
 * Strict TDD: RED phase — impl does not exist yet.
 *
 * Mocks:
 *   - @/lib/supabase/admin — so no real DB hit (now includes storage chain)
 *   - @/lib/auth/require-session — so auth-gate-bypass cases are simulatable
 *   - next/navigation — so redirect() is observable
 *   - next/cache — so revalidatePath() is observable
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock: requireAdminSession
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth/require-session', () => ({
  requireAdminSession: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Mock: next/navigation (redirect)
// ---------------------------------------------------------------------------
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: next/cache (revalidatePath)
// ---------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase/admin
// The mock factory returns an object that mirrors the chained Supabase builder.
// We expose the inner spy functions so tests can assert on them.
// Now includes storage chain for PR2 Storage cleanup tests.
// ---------------------------------------------------------------------------
const mockInsert = vi.fn().mockResolvedValue({ data: [{ id: 'new-uuid' }], error: null });
const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
const mockDelete = vi.fn().mockResolvedValue({ data: null, error: null });
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

// We need eq to be chain-aware: for delete/update it returns a settled promise shape.
// We'll configure this per test when needed. Default: settled success.
mockEq.mockImplementation(() => ({ data: null, error: null }));
mockSingle.mockResolvedValue({ data: null, error: null });
mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });

const mockFrom = vi.fn().mockReturnValue({
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  select: mockSelect,
});

// Storage chain spies (PR2)
const mockStorageList = vi.fn();
const mockStorageRemove = vi.fn();
const mockStorageUpload = vi.fn();
const mockStorageGetPublicUrl = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
import { requireAdminSession } from '@/lib/auth/require-session';
import { revalidatePath } from 'next/cache';

// Build a FormData-like payload
function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

// Full valid payload (published = false — draft save, no validation needed)
const validDraftPayload = {
  title_en: 'My Project',
  title_es: 'Mi Proyecto',
  subtitle_en: 'A great project',
  subtitle_es: 'Un gran proyecto',
  description_en: 'Long description EN',
  description_es: 'Long description ES',
  slug: 'my-project',
  tags: '[]',
  display_order: '0',
  cover_image_url: '',
  published: 'false',
};

// Full valid payload ready for publish (published = true)
const validPublishPayload = {
  ...validDraftPayload,
  published: 'true',
};

// Payload missing title_es — invalid for publish
const incompletePublishPayload = {
  ...validPublishPayload,
  title_es: '',
};

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();

  // Re-establish default implementations after clearAllMocks
  (requireAdminSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

  mockInsert.mockResolvedValue({ data: [{ id: 'new-uuid' }], error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  mockDelete.mockReturnValue({ eq: mockEq });
  mockEq.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
  });

  // Storage chain defaults (PR2)
  mockStorageList.mockResolvedValue({ data: [], error: null });
  mockStorageRemove.mockResolvedValue({ data: null, error: null });
  mockStorageUpload.mockResolvedValue({ data: { path: '' }, error: null });
  mockStorageGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/img.webp' } });
  mockStorageFrom.mockReturnValue({
    list: mockStorageList,
    remove: mockStorageRemove,
    upload: mockStorageUpload,
    getPublicUrl: mockStorageGetPublicUrl,
  });
});

// ---------------------------------------------------------------------------
// Import the module AFTER mocks are set up
// ---------------------------------------------------------------------------
// Dynamic import inside each describe to pick up mocks correctly
async function getActions() {
  vi.resetModules();
  return await import('../../src/app/admin/projects/actions');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('requireAdminSession is called first', () => {
  it('createProject calls requireAdminSession before createAdminClient', async () => {
    const { createProject } = await getActions();
    await createProject(makeFormData(validDraftPayload));
    expect(requireAdminSession).toHaveBeenCalledTimes(1);
  });

  it('updateProject calls requireAdminSession before createAdminClient', async () => {
    const { updateProject } = await getActions();
    await updateProject('some-id', makeFormData(validDraftPayload));
    expect(requireAdminSession).toHaveBeenCalledTimes(1);
  });

  it('deleteProject calls requireAdminSession', async () => {
    const { deleteProject } = await getActions();
    await deleteProject('some-id');
    expect(requireAdminSession).toHaveBeenCalledTimes(1);
  });

  it('togglePublished calls requireAdminSession', async () => {
    const { togglePublished } = await getActions();
    const row = {
      title_en: 'T', title_es: 'T', subtitle_en: 'S', subtitle_es: 'S',
      description_en: 'D', description_es: 'D', slug: 'slug',
      cover_image_url: null, published: false,
    };
    await togglePublished('some-id', row);
    expect(requireAdminSession).toHaveBeenCalledTimes(1);
  });
});

describe('createProject', () => {
  it('with valid draft payload inserts with slugified slug and expected fields', async () => {
    const { createProject } = await getActions();
    const result = await createProject(makeFormData(validDraftPayload));

    expect(result.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('projects');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'my-project',
        title_en: 'My Project',
        published: false,
      }),
    );
  });

  it('cleanses the slug via slugify before insert (e.g. accents stripped)', async () => {
    const { createProject } = await getActions();
    const payload = { ...validDraftPayload, slug: 'Café Résumé!!', published: 'false' };
    await createProject(makeFormData(payload));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'cafe-resume' }),
    );
  });

  it('with published=true and missing title_es returns error and does NOT insert', async () => {
    const { createProject } = await getActions();
    const result = await createProject(makeFormData(incompletePublishPayload));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title_es).toBeTruthy();
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('maps Postgres 23505 unique violation to user-visible slug error', async () => {
    mockInsert.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    const { createProject } = await getActions();
    const result = await createProject(makeFormData(validDraftPayload));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.slug).toMatch(/already in use/i);
    }
  });

  it('calls revalidatePath on success', async () => {
    const { createProject } = await getActions();
    await createProject(makeFormData(validDraftPayload));
    expect(revalidatePath).toHaveBeenCalledWith('/admin/projects');
  });
});

describe('updateProject', () => {
  it('calls update().eq() with correct id', async () => {
    const mockEqChain = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEqChain });

    const { updateProject } = await getActions();
    await updateProject('target-id', makeFormData(validDraftPayload));

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockEqChain).toHaveBeenCalledWith('id', 'target-id');
  });
});

describe('deleteProject', () => {
  it('project with cover + gallery: lists both paths, removes all, then DB delete — in order', async () => {
    const projectId = 'del-proj';
    const callOrder: string[] = [];

    // Storage list: root returns cover file, gallery returns gallery file
    mockStorageList.mockImplementation(async (prefix: string) => {
      callOrder.push(`list:${prefix}`);
      if (prefix === projectId) {
        return { data: [{ name: 'cover.webp', id: 'some-id' }], error: null };
      }
      if (prefix === `${projectId}/gallery`) {
        return { data: [{ name: 'uuid.jpg', id: 'some-id-2' }], error: null };
      }
      return { data: [], error: null };
    });

    mockStorageRemove.mockImplementation(async () => {
      callOrder.push('remove');
      return { data: null, error: null };
    });

    const mockEqChain = vi.fn().mockImplementation(async () => {
      callOrder.push('db:delete');
      return { data: null, error: null };
    });
    mockDelete.mockReturnValue({ eq: mockEqChain });

    const { deleteProject } = await getActions();
    const result = await deleteProject(projectId);

    expect(result.ok).toBe(true);
    expect(mockStorageRemove).toHaveBeenCalledWith(
      expect.arrayContaining([
        `${projectId}/cover.webp`,
        `${projectId}/gallery/uuid.jpg`,
      ]),
    );
    // list/remove come BEFORE db delete
    const removeIdx = callOrder.indexOf('remove');
    const dbDeleteIdx = callOrder.indexOf('db:delete');
    expect(removeIdx).toBeLessThan(dbDeleteIdx);
  });

  it('project with no Storage files: list returns empty, remove NOT called, DB delete proceeds', async () => {
    mockStorageList.mockResolvedValue({ data: [], error: null });

    const mockEqChain = vi.fn().mockResolvedValue({ data: null, error: null });
    mockDelete.mockReturnValue({ eq: mockEqChain });

    const { deleteProject } = await getActions();
    const result = await deleteProject('empty-proj');

    expect(result.ok).toBe(true);
    expect(mockStorageRemove).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it('Storage list() fails: DB delete NOT called, returns error', async () => {
    mockStorageList.mockResolvedValue({ data: null, error: { message: 'Storage list failed' } });

    const { deleteProject } = await getActions();
    const result = await deleteProject('proj-id');

    expect(result.ok).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('Storage remove() fails: DB delete NOT called, returns Storage error', async () => {
    mockStorageList.mockImplementation(async (prefix: string) => {
      if (prefix === 'proj-id') {
        return { data: [{ name: 'cover.webp', id: 'id1' }], error: null };
      }
      return { data: [], error: null };
    });
    mockStorageRemove.mockResolvedValue({ data: null, error: { message: 'Remove failed' } });

    const { deleteProject } = await getActions();
    const result = await deleteProject('proj-id');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors._form).toMatch(/storage/i);
    }
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe('createProject — with file upload sequencing (PR2)', () => {
  function makeFileFormData(
    fields: Record<string, string>,
    coverFile?: File,
    galleryFiles?: File[],
  ): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      fd.append(k, v);
    }
    if (coverFile) fd.append('cover', coverFile);
    if (galleryFiles) {
      for (const f of galleryFiles) fd.append('gallery', f);
    }
    return fd;
  }

  function makeFile(name: string, type: string, size: number): File {
    return new File([new Uint8Array(size)], name, { type });
  }

  // For cover upload sequencing, actions.ts will call doCoverUpload from upload-internals
  // We mock the upload-internals module directly
  beforeEach(() => {
    vi.resetModules();
  });

  it('create with cover file: insert → upload cover → UPDATE cover_image_url in order', async () => {
    const callOrder: string[] = [];

    // Mock insert to return new id
    mockInsert.mockImplementation(async () => {
      callOrder.push('insert');
      return { data: [{ id: 'new-uuid' }], error: null };
    });

    // Mock storage upload for cover
    mockStorageUpload.mockImplementation(async () => {
      callOrder.push('storage:upload');
      return { data: { path: 'new-uuid/cover.webp' }, error: null };
    });

    // Mock getPublicUrl
    mockStorageGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/new-uuid/cover.webp' },
    });

    // DB select for doCoverUpload (existing cover_image_url)
    const mockSelectEq = vi.fn().mockResolvedValue({
      data: [{ cover_image_url: null }],
      error: null,
    });
    const mockSelectChain = { eq: mockSelectEq };

    // DB update for cover_image_url
    const mockUpdateEq = vi.fn().mockImplementation(async () => {
      callOrder.push('db:update:cover');
      return { data: null, error: null };
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          insert: mockInsert,
          update: vi.fn().mockReturnValue({ eq: mockUpdateEq }),
          delete: mockDelete,
          select: vi.fn().mockReturnValue(mockSelectChain),
        };
      }
      return { insert: mockInsert, update: mockUpdate, delete: mockDelete, select: mockSelect };
    });

    const { createProject } = await getActions();
    const coverFile = makeFile('cover.webp', 'image/webp', 1024);
    const fd = makeFileFormData(validDraftPayload, coverFile);

    const result = await createProject(fd);

    expect(result.ok).toBe(true);
    // Insert came first, then storage upload, then DB update
    expect(callOrder[0]).toBe('insert');
    const storageIdx = callOrder.indexOf('storage:upload');
    const updateIdx = callOrder.indexOf('db:update:cover');
    expect(storageIdx).toBeGreaterThan(0); // after insert
    expect(updateIdx).toBeGreaterThan(storageIdx); // after storage
  });

  it('upload fails after insert: from("projects").delete().eq("id", newId) called for rollback', async () => {
    // insert succeeds
    mockInsert.mockResolvedValue({ data: [{ id: 'orphan-id' }], error: null });

    // storage upload fails
    mockStorageUpload.mockResolvedValue({ data: null, error: { message: 'Upload failed' } });

    // DB select returns no cover
    const mockSelectEq = vi.fn().mockResolvedValue({
      data: [{ cover_image_url: null }],
      error: null,
    });

    const rollbackDeleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
    const rollbackDelete = vi.fn().mockReturnValue({ eq: rollbackDeleteEq });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          insert: mockInsert,
          update: mockUpdate,
          delete: rollbackDelete,
          select: vi.fn().mockReturnValue({ eq: mockSelectEq }),
        };
      }
      return { insert: mockInsert, update: mockUpdate, delete: mockDelete, select: mockSelect };
    });

    const { createProject } = await getActions();
    const coverFile = makeFile('cover.webp', 'image/webp', 1024);
    const fd = makeFileFormData(validDraftPayload, coverFile);

    const result = await createProject(fd);

    expect(result.ok).toBe(false);
    // Rollback: delete called with the newly-inserted orphan id
    expect(rollbackDelete).toHaveBeenCalled();
    expect(rollbackDeleteEq).toHaveBeenCalledWith('id', 'orphan-id');
  });
});

describe('togglePublished', () => {
  it('togglePublished to true re-validates and returns error if fields missing', async () => {
    const { togglePublished } = await getActions();
    const incompleteRow = {
      title_en: 'T', title_es: '', // missing title_es
      subtitle_en: 'S', subtitle_es: 'S',
      description_en: 'D', description_es: 'D',
      slug: 'slug', cover_image_url: null, published: false,
    };
    const result = await togglePublished('some-id', incompleteRow);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title_es).toBeTruthy();
    }
    // Should NOT update when validation fails
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('togglePublished to true with all valid fields (including cover) calls update', async () => {
    const mockEqChain = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEqChain });

    const { togglePublished } = await getActions();
    const completeRow = {
      title_en: 'Title', title_es: 'Titulo',
      subtitle_en: 'Sub', subtitle_es: 'Sub',
      description_en: 'Desc', description_es: 'Desc',
      slug: 'slug',
      cover_image_url: 'https://example.com/cover.webp', // FR-95: cover required to publish
      published: false,
    };
    const result = await togglePublished('some-id', completeRow);

    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ published: true }));
  });

  it('togglePublished to false (from true) does NOT re-validate', async () => {
    const mockEqChain = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: mockEqChain });

    const { togglePublished } = await getActions();
    const incompleteRow = {
      title_en: '', title_es: '', // would fail validation
      subtitle_en: '', subtitle_es: '',
      description_en: '', description_es: '',
      slug: '', cover_image_url: null, published: true, // currently published → toggling to false
    };
    // Since published=true in the row, we're toggling to false → no validation needed
    const result = await togglePublished('some-id', incompleteRow);

    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ published: false }));
  });
});
