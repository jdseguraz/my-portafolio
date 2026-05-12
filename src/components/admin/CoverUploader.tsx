'use client';

/**
 * CoverUploader — controlled client component for uploading a project cover image.
 * FR-86, FR-101, FR-102 (client validation — Layer 3), C-12.
 *
 * Props:
 *   projectId: string | null — needed to call uploadCover SA. Null in create mode
 *              where parent form handles upload sequencing (ADR-37, Option B).
 *   value: string | null    — current public URL for the cover image.
 *   onChange: (url: string) => void — called with the new public URL after successful upload.
 */

import { useState, useRef, useEffect } from 'react';
import { uploadCover } from '@/app/admin/projects/upload-actions';
import { ALLOWED_MIME_TYPES, validateFile } from '@/lib/storage/upload';

type Props = {
  projectId: string | null;
  value: string | null;
  onChange: (url: string) => void;
};

export default function CoverUploader({ projectId, value, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // In create-mode the parent's `value` stays empty; we surface a local blob preview
  // so the user sees the selected file before form submit. ProjectForm's native
  // FormData picks up the File via the input's `name="cover"` for the SA sequencing.
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke any previous object URL on change/unmount to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Layer 3: Client-side validation (FR-102)
    const validation = validateFile(file.size, file.type);
    if (!validation.ok) {
      setError(validation.error);
      // Reset input so the same file can be re-selected if user fixes the issue
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (!projectId) {
      // Create mode: keep file in the native input (name="cover") for the parent
      // form's SA sequencing (ADR-37). Local blob preview for UX; do NOT touch
      // parent state so cover_image_url stays empty until the SA uploads + UPDATEs.
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setPendingPreview(URL.createObjectURL(file));
      return;
    }

    // Edit mode: upload immediately
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await uploadCover(projectId, fd);

      if (!result.ok) {
        const errMsg =
          (result as { ok: false; errors: Record<string, string> }).errors.file ||
          (result as { ok: false; errors: Record<string, string> }).errors._form ||
          'Upload failed';
        setError(errMsg);
      } else {
        const url = (result as { ok: true; data: { url: string } }).data.url;
        onChange(url);
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const acceptList = ALLOWED_MIME_TYPES.join(',');
  const previewSrc = value || pendingPreview;

  return (
    <div className="space-y-2">
      {/* Thumbnail preview (edit mode value, or pending file in create mode) */}
      {previewSrc && (
        <div className="relative inline-block">
          <img
            src={previewSrc}
            alt="Cover preview"
            className="h-32 w-48 object-cover rounded-md border"
          />
        </div>
      )}

      {/* File input */}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
          {uploading ? (
            'Uploading…'
          ) : previewSrc ? (
            'Replace'
          ) : (
            'Choose file'
          )}
          <input
            ref={inputRef}
            type="file"
            name="cover"
            accept={acceptList}
            onChange={handleFileChange}
            disabled={uploading}
            className="sr-only"
          />
        </label>

        {previewSrc && !uploading && (
          <span className="text-xs opacity-60 truncate max-w-xs">
            {projectId ? 'Cover uploaded' : 'Cover ready — saves on submit'}
          </span>
        )}
      </div>

      {/* PRD §13 hint (FR-101) */}
      <p className="text-xs opacity-60">
        Max 5MB. WebP recommended for best performance.
      </p>

      {/* Inline error (Layer 3 + SA error feedback) */}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
