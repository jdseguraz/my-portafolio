/**
 * Tests for src/components/admin/GalleryUploader.tsx
 * FR-88, FR-90, FR-101, C-14
 *
 * Strict TDD: RED phase — GalleryUploader.tsx does NOT exist yet.
 * NOTE: No drag-and-drop assertions — dnd-kit is PR3 scope.
 *
 * Mocks:
 *   - @/app/admin/projects/upload-actions (uploadGalleryFile, deleteGalleryFile)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock: upload Server Actions
// ---------------------------------------------------------------------------
const mockUploadGalleryFile = vi.fn();
const mockDeleteGalleryFile = vi.fn();

vi.mock('@/app/admin/projects/upload-actions', () => ({
  uploadGalleryFile: mockUploadGalleryFile,
  deleteGalleryFile: mockDeleteGalleryFile,
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: GalleryUploader } = await import('../../src/components/admin/GalleryUploader');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

const PROJECT_ID = 'proj-abc';
const URL_A = 'https://example.com/gallery/uuid-a.jpg';
const URL_B = 'https://example.com/gallery/uuid-b.jpg';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GalleryUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    it('renders multi-file input', () => {
      render(
        <GalleryUploader projectId={PROJECT_ID} value={[]} onChange={vi.fn()} />,
      );
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      // Should accept multiple files
      expect(fileInput.multiple).toBe(true);
    });

    it('renders hint text "Max 5MB. WebP recommended for best performance."', () => {
      render(
        <GalleryUploader projectId={PROJECT_ID} value={[]} onChange={vi.fn()} />,
      );
      expect(
        screen.getByText('Max 5MB. WebP recommended for best performance.'),
      ).toBeTruthy();
    });
  });

  describe('with existing URLs', () => {
    it('renders thumbnails for each URL in value', () => {
      render(
        <GalleryUploader
          projectId={PROJECT_ID}
          value={[URL_A, URL_B]}
          onChange={vi.fn()}
        />,
      );
      const imgs = screen.getAllByRole('img');
      expect(imgs).toHaveLength(2);
    });

    it('renders a delete button for each thumbnail', () => {
      render(
        <GalleryUploader
          projectId={PROJECT_ID}
          value={[URL_A, URL_B]}
          onChange={vi.fn()}
        />,
      );
      // Each item should have a delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete|remove/i });
      expect(deleteButtons).toHaveLength(2);
    });

    it('clicking delete calls deleteGalleryFile with the URL and onChange with filtered array', async () => {
      mockDeleteGalleryFile.mockResolvedValue({ ok: true });
      const mockOnChange = vi.fn();

      render(
        <GalleryUploader
          projectId={PROJECT_ID}
          value={[URL_A, URL_B]}
          onChange={mockOnChange}
        />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /delete|remove/i });

      await act(async () => {
        fireEvent.click(deleteButtons[0]); // delete URL_A (first item)
      });

      await waitFor(() => {
        expect(mockDeleteGalleryFile).toHaveBeenCalledWith(PROJECT_ID, URL_A);
        expect(mockOnChange).toHaveBeenCalledWith([URL_B]);
      });
    });
  });

  describe('multi-file upload', () => {
    it('calls uploadGalleryFile for each file and invokes onChange with appended URLs', async () => {
      const newUrl1 = 'https://example.com/gallery/new1.png';
      const newUrl2 = 'https://example.com/gallery/new2.png';
      const newUrl3 = 'https://example.com/gallery/new3.png';

      let callCount = 0;
      mockUploadGalleryFile.mockImplementation(async () => {
        callCount++;
        const url = [newUrl1, newUrl2, newUrl3][callCount - 1];
        return { ok: true, data: { url } };
      });

      const mockOnChange = vi.fn();
      render(
        <GalleryUploader
          projectId={PROJECT_ID}
          value={[URL_A]}
          onChange={mockOnChange}
        />,
      );

      const files = [
        makeFile('1.png', 'image/png', 512),
        makeFile('2.png', 'image/png', 512),
        makeFile('3.png', 'image/png', 512),
      ];

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files } });
      });

      await waitFor(() => {
        expect(mockUploadGalleryFile).toHaveBeenCalledTimes(3);
      });

      // onChange called with the appended URLs
      await waitFor(() => {
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall).toEqual(
          expect.arrayContaining([URL_A, newUrl1, newUrl2, newUrl3]),
        );
      });
    });
  });

  describe('client-side validation (Layer 3)', () => {
    it('shows error for oversized file and does NOT call uploadGalleryFile', async () => {
      render(
        <GalleryUploader projectId={PROJECT_ID} value={[]} onChange={vi.fn()} />,
      );

      const oversized = makeFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [oversized] } });
      });

      expect(mockUploadGalleryFile).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    it('shows error for wrong MIME type and does NOT call uploadGalleryFile', async () => {
      render(
        <GalleryUploader projectId={PROJECT_ID} value={[]} onChange={vi.fn()} />,
      );

      const gif = makeFile('anim.gif', 'image/gif', 512);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [gif] } });
      });

      expect(mockUploadGalleryFile).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });
});
