/**
 * Tests for src/app/admin/projects/upload-actions.ts
 * FR-81, FR-86–FR-90, ADR-29, ADR-34, ADR-35, ADR-40
 *
 * Strict TDD: RED phase — upload-actions.ts does NOT exist yet.
 *
 * Mocks:
 *   - @/lib/supabase/admin (full storage + DB chain)
 *   - @/lib/auth/require-session
 *   - next/cache (revalidatePath)
 *   - server-only (handled by global setup.ts)
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock: requireAdminSession
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth/require-session', () => ({
  requireAdminSession: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Mock: next/cache
// ---------------------------------------------------------------------------
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase/admin
// We build a full chain that mirrors what upload-actions.ts will call.
// ---------------------------------------------------------------------------
const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockList = vi.fn();
const mockStorageFrom = vi.fn();

const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();
const mockDbSelect = vi.fn();
const mockDbEq = vi.fn();
const mockDbSingle = vi.fn();
const mockDbFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    storage: { from: mockStorageFrom },
    from: mockDbFrom,
  })),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
import { requireAdminSession } from '@/lib/auth/require-session';

// We ALSO mock next/navigation so redirect() throws (simulating auth failure path)
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
}));

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

function makeFormData(file: File, fieldName = 'file'): FormData {
  const fd = new FormData();
  fd.append(fieldName, file);
  return fd;
}

const PROJECT_ID = 'proj-123';
const BASE_URL = 'https://example.supabase.co/storage/v1/object/public/project-images';
const COVER_WEBP_URL = `${BASE_URL}/${PROJECT_ID}/cover.webp`;
const COVER_PNG_URL = `${BASE_URL}/${PROJECT_ID}/cover.png`;
// GALLERY_URL not used in assertions directly (path derived by SA from URL)

/** Default happy-path mock setup */
function setupHappyMocks({
  existingCoverUrl = null as string | null,
  galleryImages = [] as string[],
  publicUrl = COVER_WEBP_URL,
} = {}) {
  vi.clearAllMocks();

  (requireAdminSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

  mockGetPublicUrl.mockReturnValue({ data: { publicUrl } });
  mockUpload.mockResolvedValue({ data: { path: `${PROJECT_ID}/cover.webp` }, error: null });
  mockRemove.mockResolvedValue({ data: null, error: null });
  mockList.mockResolvedValue({ data: [], error: null });

  mockStorageFrom.mockReturnValue({
    upload: mockUpload,
    remove: mockRemove,
    getPublicUrl: mockGetPublicUrl,
    list: mockList,
  });

  // DB chain:
  //   doCoverUpload calls .from('projects').select('cover_image_url').eq('id', id)
  //     → returns { data: [{cover_image_url}], error }  (array, no .single())
  //   uploadGalleryFile / deleteGalleryFile call .select('gallery_images').eq().single()
  //     → returns { data: {gallery_images}, error }
  //   uploadCover also calls .update({cover_image_url}).eq()
  //   reorderGallery / deleteGalleryFile also call .update({gallery_images}).eq()
  //
  // We use mockDbEq to handle ALL .eq() calls.
  // When .single() is chained after .eq(), it returns the row-shaped data.
  // When .eq() is awaited directly, it returns the array-shaped data.

  mockDbSingle.mockResolvedValue({
    data: { cover_image_url: existingCoverUrl, gallery_images: galleryImages },
    error: null,
  });

  // .eq() itself resolves to array-shaped (used by doCoverUpload in upload-internals)
  mockDbEq.mockImplementation(() => {
    const result = {
      data: existingCoverUrl !== undefined
        ? [{ cover_image_url: existingCoverUrl, gallery_images: galleryImages }]
        : [{ cover_image_url: null, gallery_images: galleryImages }],
      error: null,
      single: mockDbSingle,
    };
    // Make it awaitable AND chainable
    const promise = Promise.resolve(result);
    return Object.assign(promise, { single: mockDbSingle });
  });

  mockDbSelect.mockReturnValue({ eq: mockDbEq });
  mockDbUpdate.mockReturnValue({ eq: mockDbEq });
  mockDbDelete.mockReturnValue({ eq: mockDbEq });
  mockDbInsert.mockResolvedValue({ data: [{ id: 'new-id' }], error: null });

  mockDbFrom.mockReturnValue({
    select: mockDbSelect,
    update: mockDbUpdate,
    delete: mockDbDelete,
    insert: mockDbInsert,
  });
}

async function getActions() {
  vi.resetModules();
  return await import('../../src/app/(admin)/admin/projects/upload-actions');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('uploadCover', () => {
  it('happy path: returns {ok:true, data:{url}}, upload called with upsert:true and DB updated', async () => {
    setupHappyMocks({ existingCoverUrl: null, publicUrl: COVER_WEBP_URL });

    const { uploadCover } = await getActions();
    const file = makeFile('cover.webp', 'image/webp', 1024);
    const fd = makeFormData(file);

    const result = await uploadCover(PROJECT_ID, fd);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result as { ok: true; data: { url: string } }).data.url).toBe(COVER_WEBP_URL);
    }
    expect(mockUpload).toHaveBeenCalledWith(
      `${PROJECT_ID}/cover.webp`,
      file,
      expect.objectContaining({ upsert: true }),
    );
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ cover_image_url: COVER_WEBP_URL }),
    );
  });

  it('oversized file: returns {ok:false, errors:{file:"File too large"}}, upload NOT called', async () => {
    setupHappyMocks();

    const { uploadCover } = await getActions();
    const file = makeFile('big.webp', 'image/webp', 5 * 1024 * 1024 + 1);
    const fd = makeFormData(file);

    const result = await uploadCover(PROJECT_ID, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.file).toMatch(/too large/i);
    }
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('wrong MIME: returns {ok:false, errors:{file:...}}, upload NOT called', async () => {
    setupHappyMocks();

    const { uploadCover } = await getActions();
    const file = makeFile('anim.gif', 'image/gif', 512);
    const fd = makeFormData(file);

    const result = await uploadCover(PROJECT_ID, fd);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.file).toBeTruthy();
    }
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('auth gate: requireAdminSession throws → SA throws, upload NOT called', async () => {
    setupHappyMocks();
    (requireAdminSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('NEXT_REDIRECT'));

    const { uploadCover } = await getActions();
    const file = makeFile('cover.webp', 'image/webp', 1024);
    const fd = makeFormData(file);

    await expect(uploadCover(PROJECT_ID, fd)).rejects.toThrow();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('same-ext replace: no remove called, only upload upsert', async () => {
    setupHappyMocks({ existingCoverUrl: COVER_WEBP_URL, publicUrl: COVER_WEBP_URL });

    const { uploadCover } = await getActions();
    const file = makeFile('cover.webp', 'image/webp', 1024);
    const fd = makeFormData(file);

    await uploadCover(PROJECT_ID, fd);

    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it('diff-ext replace: remove called first with old path, then upload with new path', async () => {
    setupHappyMocks({ existingCoverUrl: COVER_PNG_URL, publicUrl: COVER_WEBP_URL });

    const callOrder: string[] = [];
    mockRemove.mockImplementation(async () => {
      callOrder.push('remove');
      return { data: null, error: null };
    });
    mockUpload.mockImplementation(async () => {
      callOrder.push('upload');
      return { data: { path: `${PROJECT_ID}/cover.webp` }, error: null };
    });

    const { uploadCover } = await getActions();
    const file = makeFile('cover.webp', 'image/webp', 1024);
    const fd = makeFormData(file);

    await uploadCover(PROJECT_ID, fd);

    expect(mockRemove).toHaveBeenCalledWith([`${PROJECT_ID}/cover.png`]);
    expect(mockUpload).toHaveBeenCalledWith(
      `${PROJECT_ID}/cover.webp`,
      expect.anything(),
      expect.objectContaining({ upsert: true }),
    );
    expect(callOrder).toEqual(['remove', 'upload']);
  });
});

// ---------------------------------------------------------------------------
// uploadGalleryFile
// ---------------------------------------------------------------------------

describe('uploadGalleryFile', () => {
  it('happy path: UUID in path, DB update appends URL to gallery_images', async () => {
    const galleryUrl = `${BASE_URL}/${PROJECT_ID}/gallery/some-uuid.jpg`;
    setupHappyMocks({ galleryImages: ['existing-url'], publicUrl: galleryUrl });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: galleryUrl } });

    const { uploadGalleryFile } = await getActions();
    const file = makeFile('snap.jpg', 'image/jpeg', 512);
    const fd = makeFormData(file);

    const result = await uploadGalleryFile(PROJECT_ID, fd);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect((result as { ok: true; data: { url: string } }).data.url).toBe(galleryUrl);
    }

    // Path must match UUID pattern
    const uploadPath = mockUpload.mock.calls[0][0] as string;
    expect(uploadPath).toMatch(
      new RegExp(`^${PROJECT_ID}/gallery/[0-9a-f-]{36}\\.jpg$`),
    );

    // DB update should append the new URL
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        gallery_images: expect.arrayContaining([galleryUrl]),
      }),
    );
  });

  it('validation rejection: oversized file returns error, upload not called', async () => {
    setupHappyMocks();

    const { uploadGalleryFile } = await getActions();
    const file = makeFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1);
    const fd = makeFormData(file);

    const result = await uploadGalleryFile(PROJECT_ID, fd);

    expect(result.ok).toBe(false);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('auth gate: requireAdminSession throws → SA throws', async () => {
    setupHappyMocks();
    (requireAdminSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('NEXT_REDIRECT'));

    const { uploadGalleryFile } = await getActions();
    const file = makeFile('snap.jpg', 'image/jpeg', 512);
    const fd = makeFormData(file);

    await expect(uploadGalleryFile(PROJECT_ID, fd)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// deleteGalleryFile
// ---------------------------------------------------------------------------

describe('deleteGalleryFile', () => {
  it('happy path: remove called, DB update filters out the URL', async () => {
    const url = `${BASE_URL}/${PROJECT_ID}/gallery/some-uuid.jpg`;
    const path = `${PROJECT_ID}/gallery/some-uuid.jpg`;

    setupHappyMocks({ galleryImages: [url, 'https://other.url'] });

    const { deleteGalleryFile } = await getActions();
    const result = await deleteGalleryFile(PROJECT_ID, url);

    expect(result.ok).toBe(true);
    expect(mockRemove).toHaveBeenCalledWith([path]);
    // DB update should filter out the url
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        gallery_images: expect.not.arrayContaining([url]),
      }),
    );
  });

  it('Storage fails: DB NOT updated, returns error', async () => {
    const url = `${BASE_URL}/${PROJECT_ID}/gallery/some-uuid.jpg`;
    setupHappyMocks({ galleryImages: [url] });
    mockRemove.mockResolvedValue({ data: null, error: { message: 'Storage error' } });

    const { deleteGalleryFile } = await getActions();
    const result = await deleteGalleryFile(PROJECT_ID, url);

    expect(result.ok).toBe(false);
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it('auth gate: requireAdminSession throws → SA throws', async () => {
    setupHappyMocks();
    (requireAdminSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('NEXT_REDIRECT'));

    const { deleteGalleryFile } = await getActions();
    await expect(deleteGalleryFile(PROJECT_ID, 'some-url')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// reorderGallery
// ---------------------------------------------------------------------------

describe('reorderGallery', () => {
  it('happy path: DB update with orderedUrls, ZERO Storage calls', async () => {
    setupHappyMocks({ galleryImages: ['urlA', 'urlB', 'urlC'] });

    const { reorderGallery } = await getActions();
    const result = await reorderGallery(PROJECT_ID, ['urlC', 'urlA', 'urlB']);

    expect(result.ok).toBe(true);
    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ gallery_images: ['urlC', 'urlA', 'urlB'] }),
    );
    // Zero Storage calls (FR-89: reorder is DB-only)
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockList).not.toHaveBeenCalled();
  });

  it('auth gate: requireAdminSession throws → SA throws', async () => {
    setupHappyMocks();
    (requireAdminSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('NEXT_REDIRECT'));

    const { reorderGallery } = await getActions();
    await expect(reorderGallery(PROJECT_ID, ['urlA'])).rejects.toThrow();
  });
});
