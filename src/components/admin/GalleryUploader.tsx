'use client';

/**
 * GalleryUploader — controlled client component for managing a project's gallery.
 * FR-88, FR-89, FR-90, FR-101, C-14 (UUID-based naming via SA).
 * PR3: dnd-kit drag-and-drop reorder (ADR-38).
 *
 * Props:
 *   projectId: string | null — needed to call upload/delete SAs.
 *              Null in create mode (files collected for parent SA sequencing, ADR-37).
 *   value: string[]          — ordered list of current gallery image public URLs.
 *   onChange: (urls: string[]) => void — called with updated URLs after upload/delete.
 *   onReorder?: (newOrder: string[]) => void — optional override for testing / a11y.
 */

import { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { uploadGalleryFile, deleteGalleryFile, reorderGallery } from '@/app/admin/projects/upload-actions';
import { ALLOWED_MIME_TYPES, validateFile } from '@/lib/storage/upload';
import SortableGalleryItem from './SortableGalleryItem';

type Props = {
  projectId: string | null;
  value: string[];
  onChange: (urls: string[]) => void;
  /** Optional override — used by tests and a11y keyboard fallback to trigger reorder. */
  onReorder?: (newOrder: string[]) => void;
};

export default function GalleryUploader({ projectId, value, onChange, onReorder }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptList = ALLOWED_MIME_TYPES.join(',');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = value.indexOf(active.id as string);
    const newIndex = value.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(value, oldIndex, newIndex);

    // Optimistic update
    onChange(next);

    if (onReorder) {
      onReorder(next);
      return;
    }

    if (!projectId) return;

    const result = await reorderGallery(projectId, next);
    if (!result.ok) {
      // Revert on SA error
      onChange(value);
      const errMsg =
        (result as { ok: false; errors: Record<string, string> }).errors._form ||
        'Reorder failed';
      setError(errMsg);
    }
  }

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
      {/* Thumbnail grid with dnd-kit reorder (ADR-38) */}
      {value.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={value} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {value.map((url) => (
                <SortableGalleryItem
                  key={url}
                  id={url}
                  url={url}
                  onDelete={() => handleDelete(url)}
                  disabled={deletingUrl === url || uploading}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
