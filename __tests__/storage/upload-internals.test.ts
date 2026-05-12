/**
 * Tests for src/lib/storage/upload-internals.ts
 * ADR-40, ADR-34, ADR-33
 *
 * Strict TDD: RED phase — written before impl is verified green.
 * Mocks: @/lib/supabase/admin (manual stub of storage chain + from/select chain)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doCoverUpload, doGalleryUpload } from '../../src/lib/storage/upload-internals';

// ---------------------------------------------------------------------------
// Mock Supabase client
// We build a structural stub that mirrors the StorageClient interface.
// ---------------------------------------------------------------------------

const mockRemove = vi.fn();
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockStorageFrom = vi.fn();

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockDbFrom = vi.fn();

/** Reset and configure mocks to their default happy-path state. */
function resetMocks({
  existingCoverUrl = null as string | null,
  uploadError = null as { message: string } | null,
  removeError = null as { message: string } | null,
  publicUrl = 'https://example.supabase.co/storage/v1/object/public/project-images/pid/cover.webp',
} = {}) {
  vi.clearAllMocks();

  mockGetPublicUrl.mockReturnValue({ data: { publicUrl } });
  mockUpload.mockResolvedValue({ data: { path: 'pid/cover.webp' }, error: uploadError });
  mockRemove.mockResolvedValue({ data: null, error: removeError });

  mockStorageFrom.mockReturnValue({
    upload: mockUpload,
    remove: mockRemove,
    getPublicUrl: mockGetPublicUrl,
  });

  // DB chain: from('projects').select('cover_image_url').eq('id', projectId)
  mockEq.mockResolvedValue({
    data: existingCoverUrl !== null ? [{ cover_image_url: existingCoverUrl }] : [{ cover_image_url: null }],
    error: null,
  });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockDbFrom.mockReturnValue({ select: mockSelect });
}

/** Returns a mock Supabase client with configurable behaviors. */
function makeSupabase() {
  return {
    storage: { from: mockStorageFrom },
    from: mockDbFrom,
  };
}

/** Creates a minimal File object with the given type and size. */
function makeFile(
  name: string,
  type: string,
  sizeBytes: number,
): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

const PROJECT_ID = 'pid';
const BASE_PUBLIC_URL = 'https://example.supabase.co/storage/v1/object/public/project-images';

// ---------------------------------------------------------------------------
// doCoverUpload
// ---------------------------------------------------------------------------

describe('doCoverUpload', () => {
  describe('happy path — no existing cover', () => {
    it('calls upload once with upsert:true and returns the public URL', async () => {
      const pubUrl = `${BASE_PUBLIC_URL}/${PROJECT_ID}/cover.webp`;
      resetMocks({ existingCoverUrl: null, publicUrl: pubUrl });

      const file = makeFile('photo.webp', 'image/webp', 1024);
      const supabase = makeSupabase();
      const result = await doCoverUpload(supabase, PROJECT_ID, file);

      expect(result).toBe(pubUrl);
      expect(mockUpload).toHaveBeenCalledTimes(1);
      expect(mockUpload).toHaveBeenCalledWith(
        `${PROJECT_ID}/cover.webp`,
        file,
        expect.objectContaining({ upsert: true, contentType: 'image/webp' }),
      );
      // No remove call — no existing file
      expect(mockRemove).not.toHaveBeenCalled();
    });
  });

  describe('same-MIME replace (cover.webp → cover.webp)', () => {
    it('does NOT call remove — upsert overwrites in place', async () => {
      const existingUrl = `${BASE_PUBLIC_URL}/${PROJECT_ID}/cover.webp`;
      const pubUrl = `${BASE_PUBLIC_URL}/${PROJECT_ID}/cover.webp`;
      resetMocks({ existingCoverUrl: existingUrl, publicUrl: pubUrl });

      const file = makeFile('new.webp', 'image/webp', 2048);
      const supabase = makeSupabase();
      await doCoverUpload(supabase, PROJECT_ID, file);

      expect(mockRemove).not.toHaveBeenCalled();
      expect(mockUpload).toHaveBeenCalledTimes(1);
    });
  });

  describe('different-MIME replace (cover.png → cover.webp)', () => {
    it('calls remove([oldPath]) BEFORE upload with correct old path', async () => {
      const existingUrl = `${BASE_PUBLIC_URL}/${PROJECT_ID}/cover.png`;
      const pubUrl = `${BASE_PUBLIC_URL}/${PROJECT_ID}/cover.webp`;
      resetMocks({ existingCoverUrl: existingUrl, publicUrl: pubUrl });

      // Track call order
      const callOrder: string[] = [];
      mockRemove.mockImplementation(async () => {
        callOrder.push('remove');
        return { data: null, error: null };
      });
      mockUpload.mockImplementation(async () => {
        callOrder.push('upload');
        return { data: { path: `${PROJECT_ID}/cover.webp` }, error: null };
      });

      const file = makeFile('photo.webp', 'image/webp', 2048);
      const supabase = makeSupabase();
      await doCoverUpload(supabase, PROJECT_ID, file);

      // remove called with old .png path
      expect(mockRemove).toHaveBeenCalledWith([`${PROJECT_ID}/cover.png`]);
      // upload called with new .webp path
      expect(mockUpload).toHaveBeenCalledWith(
        `${PROJECT_ID}/cover.webp`,
        file,
        expect.objectContaining({ upsert: true }),
      );
      // remove before upload
      expect(callOrder).toEqual(['remove', 'upload']);
    });
  });

  describe('oversized file', () => {
    it('throws "File too large" and does NOT call upload', async () => {
      resetMocks();
      const oversized = makeFile('big.webp', 'image/webp', 5 * 1024 * 1024 + 1);
      const supabase = makeSupabase();

      await expect(doCoverUpload(supabase, PROJECT_ID, oversized)).rejects.toThrow('File too large');
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });

  describe('wrong MIME type', () => {
    it('throws and does NOT call upload', async () => {
      resetMocks();
      const gif = makeFile('anim.gif', 'image/gif', 512);
      const supabase = makeSupabase();

      await expect(doCoverUpload(supabase, PROJECT_ID, gif)).rejects.toThrow();
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// doGalleryUpload
// ---------------------------------------------------------------------------

describe('doGalleryUpload', () => {
  describe('happy path', () => {
    it('uploads to a UUID-based gallery path and returns the public URL', async () => {
      const pubUrl = `${BASE_PUBLIC_URL}/${PROJECT_ID}/gallery/some-uuid.png`;
      resetMocks({ publicUrl: pubUrl });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: pubUrl } });

      const file = makeFile('snap.png', 'image/png', 1024);
      const supabase = makeSupabase();
      const result = await doGalleryUpload(supabase, PROJECT_ID, file);

      expect(result).toBe(pubUrl);
      expect(mockUpload).toHaveBeenCalledTimes(1);

      const uploadCall = mockUpload.mock.calls[0];
      const path = uploadCall[0] as string;
      // Path must match UUID pattern: pid/gallery/{uuid}.png
      expect(path).toMatch(
        new RegExp(`^${PROJECT_ID}/gallery/[0-9a-f-]{36}\\.png$`),
      );
      // NOT upsert — gallery files always get new UUID names
      expect(uploadCall[2]).not.toEqual(expect.objectContaining({ upsert: true }));
    });
  });

  describe('unique paths per call', () => {
    it('generates distinct paths for two consecutive uploads', async () => {
      const pubUrl = `${BASE_PUBLIC_URL}/${PROJECT_ID}/gallery/some-uuid.webp`;
      resetMocks({ publicUrl: pubUrl });
      mockGetPublicUrl.mockReturnValue({ data: { publicUrl: pubUrl } });

      const file = makeFile('a.webp', 'image/webp', 512);
      const supabase = makeSupabase();

      await doGalleryUpload(supabase, PROJECT_ID, file);
      await doGalleryUpload(supabase, PROJECT_ID, file);

      const path1 = mockUpload.mock.calls[0][0] as string;
      const path2 = mockUpload.mock.calls[1][0] as string;
      expect(path1).not.toBe(path2);
    });
  });
});
