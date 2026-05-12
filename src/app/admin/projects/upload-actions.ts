'use server';
import 'server-only';

/**
 * Upload Server Actions for project images.
 * ADR-29: SA proxy (not signed URLs, not route handlers).
 * ADR-40: Lives in a NEW file separate from actions.ts (CRUD concerns split).
 * FR-81: Every SA MUST call requireAdminSession() as its FIRST operation.
 * FR-86–FR-90: uploadCover, uploadGalleryFile, deleteGalleryFile, reorderGallery.
 */

import { requireAdminSession } from '@/lib/auth/require-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { doCoverUpload, doGalleryUpload, BUCKET } from '@/lib/storage/upload-internals';
import { revalidatePath } from 'next/cache';

// ── Types ──────────────────────────────────────────────────────────────────

type UploadResult =
  | { ok: true; data: { url: string } }
  | { ok: false; errors: Record<string, string> };

type ActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> };

/**
 * Extracts the bucket-relative storage path from a public Supabase Storage URL.
 * e.g. "https://…/project-images/pid/gallery/uuid.jpg" → "pid/gallery/uuid.jpg"
 */
function extractStoragePath(url: string): string {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return url; // fallback: return as-is
  return url.slice(idx + marker.length);
}

// ---------------------------------------------------------------------------
// uploadCover
// ---------------------------------------------------------------------------

/**
 * Uploads (or replaces) the cover image for a project.
 * FR-81: requireAdminSession FIRST.
 * FR-86: Validate → old-ext cleanup if needed → upload upsert → DB update.
 */
export async function uploadCover(
  projectId: string,
  formData: FormData,
): Promise<UploadResult> {
  await requireAdminSession(); // FR-81: FIRST

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return { ok: false, errors: { file: 'No file provided' } };
  }

  const supabase = createAdminClient();

  let url: string;
  try {
    url = await doCoverUpload(supabase, projectId, file);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    if (msg === 'File too large') {
      return { ok: false, errors: { file: 'File too large' } };
    }
    if (msg === 'MIME not allowed' || msg === 'Empty file') {
      return { ok: false, errors: { file: msg } };
    }
    return { ok: false, errors: { file: msg } };
  }

  // Update cover_image_url in DB (FR-86 step 7)
  const { error: dbError } = await supabase
    .from('projects')
    .update({ cover_image_url: url })
    .eq('id', projectId);

  if (dbError) {
    return { ok: false, errors: { _form: dbError.message } };
  }

  revalidatePath('/admin/projects');
  return { ok: true, data: { url } };
}

// ---------------------------------------------------------------------------
// uploadGalleryFile
// ---------------------------------------------------------------------------

/**
 * Uploads a single gallery image for a project.
 * FR-81: requireAdminSession FIRST.
 * FR-88: Validate → UUID path → upload → append to gallery_images.
 */
export async function uploadGalleryFile(
  projectId: string,
  formData: FormData,
): Promise<UploadResult> {
  await requireAdminSession(); // FR-81: FIRST

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return { ok: false, errors: { file: 'No file provided' } };
  }

  const supabase = createAdminClient();

  let url: string;
  try {
    url = await doGalleryUpload(supabase, projectId, file);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    if (msg === 'File too large') {
      return { ok: false, errors: { file: 'File too large' } };
    }
    if (msg === 'MIME not allowed' || msg === 'Empty file') {
      return { ok: false, errors: { file: msg } };
    }
    return { ok: false, errors: { file: msg } };
  }

  // Fetch current gallery_images, append, write back (FR-88 step 6)
  const { data: row, error: selectError } = await supabase
    .from('projects')
    .select('gallery_images')
    .eq('id', projectId)
    .single();

  if (selectError) {
    return { ok: false, errors: { _form: selectError.message } };
  }

  const currentGallery: string[] = (row as { gallery_images: string[] } | null)?.gallery_images ?? [];
  const updatedGallery = [...currentGallery, url];

  const { error: dbError } = await supabase
    .from('projects')
    .update({ gallery_images: updatedGallery })
    .eq('id', projectId);

  if (dbError) {
    return { ok: false, errors: { _form: dbError.message } };
  }

  revalidatePath('/admin/projects');
  return { ok: true, data: { url } };
}

// ---------------------------------------------------------------------------
// deleteGalleryFile
// ---------------------------------------------------------------------------

/**
 * Deletes a gallery image from Storage and removes it from the DB array.
 * FR-81: requireAdminSession FIRST.
 * FR-90: Storage remove → if failure return error and do NOT update DB.
 *        On success, filter URL out of gallery_images.
 * ADR-35: Storage first, abort on failure.
 */
export async function deleteGalleryFile(
  projectId: string,
  url: string,
): Promise<ActionResult> {
  await requireAdminSession(); // FR-81: FIRST

  const supabase = createAdminClient();
  const path = extractStoragePath(url);

  // 1. Remove from Storage (FR-90 step 2)
  const { error: removeError } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (removeError) {
    return { ok: false, errors: { _form: removeError.message } };
  }

  // 2. Fetch current gallery_images, filter out this URL (FR-90 step 4)
  const { data: row, error: selectError } = await supabase
    .from('projects')
    .select('gallery_images')
    .eq('id', projectId)
    .single();

  if (selectError) {
    return { ok: false, errors: { _form: selectError.message } };
  }

  const currentGallery: string[] =
    (row as { gallery_images: string[] } | null)?.gallery_images ?? [];
  const filtered = currentGallery.filter((u) => u !== url);

  const { error: dbError } = await supabase
    .from('projects')
    .update({ gallery_images: filtered })
    .eq('id', projectId);

  if (dbError) {
    return { ok: false, errors: { _form: dbError.message } };
  }

  revalidatePath('/admin/projects');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// reorderGallery
// ---------------------------------------------------------------------------

/**
 * Updates the gallery order in DB — ZERO Storage calls (FR-89).
 * FR-81: requireAdminSession FIRST.
 */
export async function reorderGallery(
  projectId: string,
  orderedUrls: string[],
): Promise<ActionResult> {
  await requireAdminSession(); // FR-81: FIRST

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('projects')
    .update({ gallery_images: orderedUrls })
    .eq('id', projectId);

  if (error) {
    return { ok: false, errors: { _form: error.message } };
  }

  revalidatePath('/admin/projects');
  return { ok: true };
}
