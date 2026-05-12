'use client';

/**
 * GalleryUploader — controlled client component for managing a project's gallery.
 * FR-88, FR-90, FR-101, C-14 (UUID-based naming via SA).
 * NO drag-and-drop reorder — that is PR3 scope (dnd-kit, ADR-38).
 *
 * Props:
 *   projectId: string | null — needed to call upload/delete SAs.
 *              Null in create mode (files collected for parent SA sequencing, ADR-37).
 *   value: string[]          — ordered list of current gallery image public URLs.
 *   onChange: (urls: string[]) => void — called with updated URLs after upload/delete.
 */

import { useState, useRef } from 'react';
import { uploadGalleryFile, deleteGalleryFile } from '@/app/admin/projects/upload-actions';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES, validateFile } from '@/lib/storage/upload';

type Props = {
  projectId: string | null;
  value: string[];
  onChange: (urls: string[]) => void;
};

export default function GalleryUploader({ projectId, value, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptList = ALLOWED_MIME_TYPES.join(',');

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError(null);

    // Layer 3: Client-side validation for ALL selected files before uploading
    for (const file of files) {
      const validation = validateFile(file.size, file.type);
      if (!validation.ok) {
        setError(validation.error);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
    }

    if (!projectId) {
      // Create mode: parent form owns the files.
      // We don't have an ID yet so we can't upload. Just preview locally.
      // The files will be collected from FormData in the parent form's SA call (ADR-37).
      return;
    }

    // Edit mode: upload sequentially, appending URLs as we go
    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const result = await uploadGalleryFile(projectId, fd);

        if (!result.ok) {
          const errMsg =
            (result as { ok: false; errors: Record<string, string> }).errors.file ||
            (result as { ok: false; errors: Record<string, string> }).errors._form ||
            'Upload failed';
          setError(errMsg);
          break; // Stop on first failure
        } else {
          const url = (result as { ok: true; data: { url: string } }).data.url;
          newUrls.push(url);
        }
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }

    if (newUrls.length > 0) {
      onChange([...value, ...newUrls]);
    }
  }

  async function handleDelete(urlToDelete: string) {
    if (!projectId) {
      // Create mode: just filter from local state
      onChange(value.filter((u) => u !== urlToDelete));
      return;
    }

    setDeletingUrl(urlToDelete);
    try {
      const result = await deleteGalleryFile(projectId, urlToDelete);
      if (!result.ok) {
        const errMsg =
          (result as { ok: false; errors: Record<string, string> }).errors._form ||
          'Delete failed';
        setError(errMsg);
      } else {
        onChange(value.filter((u) => u !== urlToDelete));
      }
    } finally {
      setDeletingUrl(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Thumbnail grid */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt="Gallery image"
                className="h-24 w-32 object-cover rounded-md border"
              />
              <button
                type="button"
                aria-label={`Delete ${url}`}
                onClick={() => handleDelete(url)}
                disabled={deletingUrl === url || uploading}
                className="absolute top-1 right-1 rounded-full bg-black/60 text-white w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File input */}
      <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
        {uploading ? 'Uploading…' : 'Add images'}
        <input
          ref={inputRef}
          type="file"
          accept={acceptList}
          multiple
          onChange={handleFilesChange}
          disabled={uploading}
          className="sr-only"
        />
      </label>

      {/* PRD §13 hint (FR-101) */}
      <p className="text-xs opacity-60">
        Max 5MB. WebP recommended for best performance.
      </p>

      {/* Inline error */}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
