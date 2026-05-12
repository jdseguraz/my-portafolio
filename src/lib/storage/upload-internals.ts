/**
 * src/lib/storage/upload-internals.ts
 * Server-only helpers for Storage I/O.
 * ADR-40: Lives in src/lib/storage/ (shared server-side helpers).
 * NOT a 'use server' file — these are plain async helpers, not Server Actions.
 *
 * Used by:
 *   - src/app/admin/projects/upload-actions.ts (SAs delegate to these)
 *   - src/app/admin/projects/actions.ts (createProject sequencing, ADR-37)
 */
import 'server-only';

import {
  validateFile,
  mimeToExt,
  buildCoverPath,
  buildGalleryPath,
  parseCoverExtFromUrl,
  ALLOWED_MIME_TYPES,
} from './upload';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Minimal slice of the Supabase admin client needed for Storage ops.
 * Using a structural type to avoid importing the full client type here.
 */
export interface StorageClient {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File | Blob,
        options?: { upsert?: boolean; contentType?: string },
      ) => Promise<{ data: { path: string } | null; error: { message: string } | null }>;
      remove: (
        paths: string[],
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (
        column: string,
        value: string,
      ) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
    };
  };
}

/** Bucket name constant — ADR-35: C-13 (immutable). */
export const BUCKET = 'project-images';

// ── doCoverUpload ──────────────────────────────────────────────────────────

/**
 * Uploads a cover image for a project. Validates the file, handles old-ext cleanup
 * if the MIME/ext changes (ADR-34), and returns the new public URL.
 *
 * Throws on validation failure or Storage error.
 * FR-86, ADR-34.
 */
export async function doCoverUpload(
  supabase: StorageClient,
  projectId: string,
  file: File,
): Promise<string> {
  // Validate file
  const validation = validateFile(file.size, file.type);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const newExt = mimeToExt(file.type);
  if (!newExt) {
    throw new Error('MIME not allowed');
  }

  // Fetch current cover_image_url to detect ext change (ADR-34)
  const { data: rows, error: selectError } = await supabase
    .from('projects')
    .select('cover_image_url')
    .eq('id', projectId);

  if (selectError) {
    throw new Error(selectError.message);
  }

  const currentUrl = (rows?.[0]?.cover_image_url as string | null | undefined) ?? null;
  if (currentUrl) {
    const oldExt = parseCoverExtFromUrl(currentUrl);
    if (oldExt && oldExt !== newExt) {
      // Old file has different ext — remove it BEFORE uploading new one (ADR-34)
      const oldPath = buildCoverPath(projectId, oldExt);
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove([oldPath]);
      if (removeError) {
        // Non-fatal: log and continue (ADR-34: orphan on failure is cosmetic)
        console.error(`[doCoverUpload] Failed to remove old cover ${oldPath}: ${removeError.message}`);
      }
    }
  }

  // Upload new cover with upsert (in-place overwrite if same ext)
  const newPath = buildCoverPath(projectId, newExt);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
  return urlData.publicUrl;
}

// ── doGalleryUpload ────────────────────────────────────────────────────────

/**
 * Uploads a gallery image for a project.
 * Derives a UUID-based path (ADR-33), uploads without upsert, returns public URL.
 *
 * Throws on validation failure or Storage error.
 * FR-88, ADR-33.
 */
export async function doGalleryUpload(
  supabase: StorageClient,
  projectId: string,
  file: File,
): Promise<string> {
  const validation = validateFile(file.size, file.type);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const ext = mimeToExt(file.type);
  if (!ext) {
    throw new Error('MIME not allowed');
  }

  const path = buildGalleryPath(projectId, ext);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

// ── removeStoragePath ──────────────────────────────────────────────────────

/**
 * Removes a single storage path. Swallows "not found" errors (idempotent).
 * Throws on real Storage errors.
 * FR-90, ADR-35.
 */
export async function removeStoragePath(
  supabase: StorageClient,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    // Swallow not-found errors — removal is idempotent
    const msg = error.message?.toLowerCase() ?? '';
    if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('no such')) {
      return;
    }
    throw new Error(error.message);
  }
}

// Re-export ALLOWED_MIME_TYPES for convenience
export { ALLOWED_MIME_TYPES };
