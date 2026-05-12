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

import { useState, useRef } from 'react';
import { uploadCover } from '@/app/admin/projects/upload-actions';
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES, validateFile } from '@/lib/storage/upload';

type Props = {
  projectId: string | null;
  value: string | null;
  onChange: (url: string) => void;
};

export default function CoverUploader({ projectId, value, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      // Create mode: parent form owns the file; just store on parent via onChange
      // For create-mode, we surface the file via a data URL preview and let the
      // parent form SA handle upload sequencing (ADR-37, Option B).
      // We cannot upload without a projectId, so just show preview.
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result && typeof ev.target.result === 'string') {
          onChange(ev.target.result);
        }
      };
      reader.readAsDataURL(file);
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

  return (
    <div className="space-y-2">
      {/* Thumbnail preview (edit mode or after upload) */}
      {value && (
        <div className="relative inline-block">
          <img
            src={value}
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
          ) : value ? (
            'Replace'
          ) : (
            'Choose file'
          )}
          <input
            ref={inputRef}
            type="file"
            accept={acceptList}
            onChange={handleFileChange}
            disabled={uploading}
            className="sr-only"
          />
        </label>

        {value && !uploading && (
          <span className="text-xs opacity-60 truncate max-w-xs">
            Cover uploaded
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
