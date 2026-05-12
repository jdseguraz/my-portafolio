'use client';

/**
 * SortableGalleryItem — a single draggable gallery thumbnail.
 * ADR-38: uses @dnd-kit/sortable `useSortable` hook.
 * FR-89: Part of the gallery reorder flow.
 *
 * Props:
 *   id: string       — unique id for dnd-kit (the public URL, per ADR-38)
 *   url: string      — image source URL
 *   onDelete: () => void — called when the delete button is clicked
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
  id: string;
  url: string;
  onDelete: () => void;
};

export default function SortableGalleryItem({ id, url, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label={`Drag to reorder ${url}`}
        data-drag-handle
        className="absolute top-1 left-1 z-10 rounded bg-black/40 text-white w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      {/* Thumbnail */}
      <img
        src={url}
        alt="Gallery image"
        className="h-24 w-32 object-cover rounded-md border"
        draggable={false}
      />

      {/* Delete button */}
      <button
        type="button"
        aria-label={`Delete ${url}`}
        onClick={onDelete}
        className="absolute top-1 right-1 rounded-full bg-black/60 text-white w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}
