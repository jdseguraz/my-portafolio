/**
 * Tests for src/components/admin/CoverUploader.tsx
 * FR-101, FR-102 (Layer 3 client validation), C-12
 *
 * Strict TDD: RED phase — CoverUploader.tsx does NOT exist yet.
 *
 * Mocks:
 *   - @/app/admin/projects/upload-actions (uploadCover SA)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mock: uploadCover Server Action
// ---------------------------------------------------------------------------
const mockUploadCover = vi.fn();

vi.mock('@/app/admin/projects/upload-actions', () => ({
  uploadCover: mockUploadCover,
}));

// ---------------------------------------------------------------------------
// Import component AFTER mocks
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: CoverUploader } = await import('../../src/components/admin/CoverUploader');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

const PROJECT_ID = 'proj-abc';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CoverUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    it('renders file input in the DOM', () => {
      render(
        <CoverUploader projectId={PROJECT_ID} value={null} onChange={vi.fn()} />,
      );
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).not.toBeNull();
    });

    it('renders hint text "Max 5MB. WebP recommended for best performance."', () => {
      render(
        <CoverUploader projectId={PROJECT_ID} value={null} onChange={vi.fn()} />,
      );
      expect(
        screen.getByText('Max 5MB. WebP recommended for best performance.'),
      ).toBeTruthy();
    });
  });

  describe('valid file selection', () => {
    it('calls uploadCover with FormData and onChange with returned URL on success', async () => {
      const returnedUrl = 'https://example.com/cover.webp';
      mockUploadCover.mockResolvedValue({ ok: true, data: { url: returnedUrl } });

      const mockOnChange = vi.fn();
      render(
        <CoverUploader projectId={PROJECT_ID} value={null} onChange={mockOnChange} />,
      );

      const file = makeFile('cover.webp', 'image/webp', 1024);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).not.toBeNull();

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(mockUploadCover).toHaveBeenCalledTimes(1);
        const [calledProjectId, calledFormData] = mockUploadCover.mock.calls[0];
        expect(calledProjectId).toBe(PROJECT_ID);
        expect(calledFormData).toBeInstanceOf(FormData);
      });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(returnedUrl);
      });
    });
  });

  describe('client-side validation (Layer 3, FR-102)', () => {
    it('shows error for oversized file and does NOT call uploadCover', async () => {
      const mockOnChange = vi.fn();
      render(
        <CoverUploader projectId={PROJECT_ID} value={null} onChange={mockOnChange} />,
      );

      const oversized = makeFile('big.webp', 'image/webp', 5 * 1024 * 1024 + 1);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { files: [oversized] } });
      });

      expect(mockUploadCover).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeTruthy();
    });

    it('shows error for wrong MIME type (gif) and does NOT call uploadCover', async () => {
      render(
        <CoverUploader projectId={PROJECT_ID} value={null} onChange={vi.fn()} />,
      );

      const gif = makeFile('anim.gif', 'image/gif', 512);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { files: [gif] } });
      });

      expect(mockUploadCover).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toBeTruthy();
    });
  });

  describe('SA error response', () => {
    it('shows error in UI when uploadCover returns {ok:false}', async () => {
      mockUploadCover.mockResolvedValue({
        ok: false,
        errors: { file: 'Upload error from server' },
      });

      render(
        <CoverUploader projectId={PROJECT_ID} value={null} onChange={vi.fn()} />,
      );

      const file = makeFile('cover.webp', 'image/webp', 1024);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await act(async () => {
        fireEvent.change(input, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
      });
    });
  });

  describe('edit mode (value present)', () => {
    it('renders existing thumbnail when value is set', () => {
      render(
        <CoverUploader
          projectId={PROJECT_ID}
          value="https://example.com/cover.webp"
          onChange={vi.fn()}
        />,
      );
      const img = screen.getByRole('img');
      expect(img).toBeTruthy();
      expect((img as HTMLImageElement).src).toContain('cover.webp');
    });

    it('renders "Replace" button when value is set', () => {
      render(
        <CoverUploader
          projectId={PROJECT_ID}
          value="https://example.com/cover.webp"
          onChange={vi.fn()}
        />,
      );
      expect(screen.getByText(/replace/i)).toBeTruthy();
    });
  });
});
