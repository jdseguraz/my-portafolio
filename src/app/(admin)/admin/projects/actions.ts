'use server';
import 'server-only';

/**
 * Project CRUD Server Actions.
 * ADR-17: requireAdminSession() MUST be the first call in every action.
 * ADR-20: validateForPublish() is called before any DB operation when published=true.
 * ADR-19: slugify() is applied server-side before insert/update (trust nothing from client).
 * DR-12: This file lives at src/app/admin/projects/actions.ts (route-colocated).
 * FR-91: deleteProject cleans Storage BEFORE DB row (ADR-35).
 * FR-98, FR-99: createProject handles cover/gallery upload sequencing with rollback.
 */

import { requireAdminSession } from '@/lib/auth/require-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/projects/slug';
import { validateForPublish } from '@/lib/projects/validation';
import { doCoverUpload, doGalleryUpload, BUCKET, type StorageClient } from '@/lib/storage/upload-internals';
import { validateFile } from '@/lib/storage/upload';
import { revalidatePath } from 'next/cache';

type ActionResult =
  | { ok: true; data: { id: string } }
  | { ok: false; errors: Record<string, string> };

/** Parses a FormData field as string, trimming whitespace. Returns '' if missing. */
function str(fd: FormData, key: string): string {
  return (fd.get(key) as string | null)?.trim() ?? '';
}

/** Parses a FormData field as boolean ('true' → true, anything else → false). */
function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'true';
}

/** Parses a FormData field as integer. Returns 0 if missing or not a valid number. */
function int(fd: FormData, key: string): number {
  const val = fd.get(key);
  if (val === null) return 0;
  const parsed = parseInt(val as string, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/** Parses the tags field (JSON-encoded string array). Returns [] on any error. */
function parseTags(fd: FormData): string[] {
  try {
    const raw = fd.get('tags') as string | null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === 'string');
  } catch {
    return [];
  }
}

/** Maps a Supabase error to an ActionResult. Handles 23505 (unique slug). */
function mapDbError(error: { code?: string; message?: string }): ActionResult {
  if (error.code === '23505') {
    return { ok: false, errors: { slug: 'Slug already in use' } };
  }
  return { ok: false, errors: { _form: error.message ?? 'Database error' } };
}

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

export async function createProject(formData: FormData): Promise<ActionResult> {
  await requireAdminSession(); // ADR-17: FIRST call

  const published = bool(formData, 'published');
  const rawSlug = str(formData, 'slug');
  const title_en = str(formData, 'title_en');
  const title_es = str(formData, 'title_es');
  const subtitle_en = str(formData, 'subtitle_en');
  const subtitle_es = str(formData, 'subtitle_es');
  const description_en = str(formData, 'description_en');
  const description_es = str(formData, 'description_es');
  const tags = parseTags(formData);
  const display_order = int(formData, 'display_order');

  // ADR-19: Server-side authoritative slug cleanse
  const slug = slugify(rawSlug || title_en || title_es);

  // Extract optional file inputs (PR2 — ADR-37, FR-98)
  const coverFile = formData.get('cover') as File | null;
  const galleryEntries = formData.getAll('gallery') as (File | string)[];
  const galleryFiles = galleryEntries.filter(
    (f): f is File => f instanceof File && f.size > 0,
  );
  const hasCover = coverFile instanceof File && coverFile.size > 0;

  // Pre-validate files BEFORE any DB write (ADR-37: fail fast)
  if (hasCover && coverFile) {
    const v = validateFile(coverFile.size, coverFile.type);
    if (!v.ok) {
      return { ok: false, errors: { cover: v.error } };
    }
  }
  for (const f of galleryFiles) {
    const v = validateFile(f.size, f.type);
    if (!v.ok) {
      return { ok: false, errors: { gallery: v.error } };
    }
  }

  // ADR-20: Validate required fields if publishing
  // For create-mode: cover_image_url will be uploaded post-insert (ADR-37),
  // so treat a provided cover file as equivalent to a URL for validation purposes.
  if (published) {
    const validation = validateForPublish({
      title_en, title_es,
      subtitle_en, subtitle_es,
      description_en, description_es,
      slug,
      cover_image_url: hasCover ? 'pending-upload' : null,
    });
    if (!validation.ok) {
      return { ok: false, errors: validation.errors };
    }
  }

  const supabase = createAdminClient();

  // 1. INSERT row with cover/gallery null/empty initially (ADR-37)
  const { data, error } = await supabase.from('projects').insert({
    slug,
    title_en,
    title_es,
    subtitle_en,
    subtitle_es,
    description_en,
    description_es,
    cover_image_url: null,
    gallery_images: [],
    tags,
    display_order,
    published,
  });

  if (error) {
    return mapDbError(error);
  }

  // data may be null depending on Supabase client version; handle both
  const newId = (data as Array<{ id: string }> | null)?.[0]?.id ?? '';

  // 2. Upload files if any (ADR-37: rollback on failure)
  // Cast to StorageClient to avoid TypeScript deep inference on typed Supabase client
  const supabaseForStorage = supabase as unknown as StorageClient;
  let coverUrl: string | null = null;
  const galleryUrls: string[] = [];
  const uploadedPaths: string[] = [];

  if (hasCover && coverFile && newId) {
    try {
      coverUrl = await doCoverUpload(supabaseForStorage, newId, coverFile);
      // Track path for rollback (extract from URL)
      const bucketMarker = `/${BUCKET}/`;
      const idx = coverUrl.indexOf(bucketMarker);
      if (idx !== -1) uploadedPaths.push(coverUrl.slice(idx + bucketMarker.length));
    } catch (err: unknown) {
      // Rollback: delete the newly-inserted row (FR-99)
      await supabase.from('projects').delete().eq('id', newId);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      return { ok: false, errors: { _form: `Upload failed: ${msg}` } };
    }
  }

  for (const f of galleryFiles) {
    if (!newId) break;
    try {
      const galleryUrl = await doGalleryUpload(supabaseForStorage, newId, f);
      galleryUrls.push(galleryUrl);
      const bucketMarker = `/${BUCKET}/`;
      const idx = galleryUrl.indexOf(bucketMarker);
      if (idx !== -1) uploadedPaths.push(galleryUrl.slice(idx + bucketMarker.length));
    } catch (err: unknown) {
      // Rollback: remove uploaded files + delete row
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths);
      }
      await supabase.from('projects').delete().eq('id', newId);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      return { ok: false, errors: { _form: `Gallery upload failed: ${msg}` } };
    }
  }

  // 3. UPDATE row with collected URLs (only if we have files)
  if ((coverUrl !== null || galleryUrls.length > 0) && newId) {
    const { error: updateErr } = await supabase
      .from('projects')
      .update({
        cover_image_url: coverUrl,
        gallery_images: galleryUrls,
      })
      .eq('id', newId);

    if (updateErr) {
      // Best-effort cleanup (ADR-37)
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedPaths);
      }
      await supabase.from('projects').delete().eq('id', newId);
      return mapDbError(updateErr);
    }
  }

  revalidatePath('/admin/projects');
  revalidatePath('/en');
  revalidatePath('/es');
  return { ok: true, data: { id: newId } };
}

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------

export async function updateProject(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdminSession(); // ADR-17: FIRST call

  const published = bool(formData, 'published');
  const rawSlug = str(formData, 'slug');
  const title_en = str(formData, 'title_en');
  const title_es = str(formData, 'title_es');
  const subtitle_en = str(formData, 'subtitle_en');
  const subtitle_es = str(formData, 'subtitle_es');
  const description_en = str(formData, 'description_en');
  const description_es = str(formData, 'description_es');
  const cover_image_url = str(formData, 'cover_image_url') || null;
  const tags = parseTags(formData);
  const display_order = int(formData, 'display_order');

  // ADR-19: Server-side authoritative slug cleanse
  const slug = slugify(rawSlug || title_en || title_es);

  // ADR-20 + FR-95: Validate required fields if publishing (cover_image_url included for clarity)
  if (published) {
    const validation = validateForPublish({
      title_en, title_es,
      subtitle_en, subtitle_es,
      description_en, description_es,
      slug,
      cover_image_url,
    });
    if (!validation.ok) {
      return { ok: false, errors: validation.errors };
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('projects')
    .update({
      slug,
      title_en,
      title_es,
      subtitle_en,
      subtitle_es,
      description_en,
      description_es,
      cover_image_url,
      tags,
      display_order,
      published,
    })
    .eq('id', id);

  if (error) {
    return mapDbError(error);
  }

  revalidatePath('/admin/projects');
  revalidatePath('/en');
  revalidatePath('/es');
  return { ok: true, data: { id } };
}

// ---------------------------------------------------------------------------
// deleteProject
// ---------------------------------------------------------------------------

export async function deleteProject(id: string): Promise<ActionResult> {
  await requireAdminSession(); // ADR-17: FIRST call

  const supabase = createAdminClient();

  // FR-91, ADR-35: Clean Storage BEFORE DB row. Abort on Storage failure.
  // list() does NOT recurse — explicitly list root + gallery subfolder (ADR-35 design).
  const allPaths: string[] = [];

  const { data: rootFiles, error: listRootErr } = await supabase.storage
    .from(BUCKET)
    .list(id, { limit: 1000 });

  if (listRootErr) {
    return { ok: false, errors: { _form: 'Storage list failed. Project not deleted.' } };
  }

  for (const f of rootFiles ?? []) {
    // list() returns folder entries with null id — skip those (ADR-35)
    if (f.id) allPaths.push(`${id}/${f.name}`);
  }

  const { data: galleryFiles, error: listGalleryErr } = await supabase.storage
    .from(BUCKET)
    .list(`${id}/gallery`, { limit: 1000 });

  // Supabase returns an error when the subfolder doesn't exist — treat as empty (ADR-35)
  if (
    listGalleryErr &&
    !listGalleryErr.message?.toLowerCase().includes('not found') &&
    !listGalleryErr.message?.toLowerCase().includes('does not exist')
  ) {
    return { ok: false, errors: { _form: 'Storage list failed. Project not deleted.' } };
  }

  for (const f of galleryFiles ?? []) {
    if (f.id) allPaths.push(`${id}/gallery/${f.name}`);
  }

  if (allPaths.length > 0) {
    const { error: removeErr } = await supabase.storage.from(BUCKET).remove(allPaths);
    if (removeErr) {
      return { ok: false, errors: { _form: 'Storage delete failed. Project not deleted.' } };
    }
  }

  // FR-91: Only delete DB row AFTER Storage is clean
  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) {
    return mapDbError(error);
  }

  revalidatePath('/admin/projects');
  revalidatePath('/en');
  revalidatePath('/es');
  return { ok: true, data: { id } };
}

// ---------------------------------------------------------------------------
// togglePublished
// ---------------------------------------------------------------------------

type ToggleRow = {
  title_en: string;
  title_es: string;
  subtitle_en: string;
  subtitle_es: string;
  description_en: string;
  description_es: string;
  slug: string;
  cover_image_url: string | null;
  published: boolean;
};

export async function togglePublished(id: string, currentRow: ToggleRow): Promise<ActionResult> {
  await requireAdminSession(); // ADR-17: FIRST call

  const nextPublished = !currentRow.published;

  // ADR-20: If flipping to published, re-validate.
  if (nextPublished) {
    const validation = validateForPublish(currentRow);
    if (!validation.ok) {
      return { ok: false, errors: validation.errors };
    }
  }
  // If flipping to false (unpublishing), skip validation — always allowed.

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('projects')
    .update({ published: nextPublished })
    .eq('id', id);

  if (error) {
    return mapDbError(error);
  }

  revalidatePath('/admin/projects');
  revalidatePath('/en');
  revalidatePath('/es');
  return { ok: true, data: { id } };
}
