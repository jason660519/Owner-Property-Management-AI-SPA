/**
 * @file PhotoUpload.test.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Photo upload component tests (TDD)
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PhotoUpload } from '../PhotoUpload'

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

describe('PhotoUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('Rendering', () => {
    it('should render upload area', () => {
      const mockOnChange = jest.fn()
      render(<PhotoUpload photos={[]} onChange={mockOnChange} />)

      expect(screen.getByText(/點擊或拖曳照片至此處上傳/)).toBeInTheDocument()
    })

    it('should display file type and size restrictions', () => {
      const mockOnChange = jest.fn()
      render(<PhotoUpload photos={[]} onChange={mockOnChange} />)

      expect(screen.getByText(/支援 JPG、PNG、HEIC 格式/i)).toBeInTheDocument()
      expect(screen.getByText(/單檔最大 10MB/i)).toBeInTheDocument()
    })

    it('should show main image hint', () => {
      const mockOnChange = jest.fn()
      render(<PhotoUpload photos={[]} onChange={mockOnChange} />)

      expect(screen.getByText(/第一張照片將作為主圖顯示/i)).toBeInTheDocument()
    })
  })

  describe('File Upload', () => {
    it('should accept valid image files', async () => {
      const mockOnChange = jest.fn()
      render(<PhotoUpload photos={[]} onChange={mockOnChange} />)

      const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByTestId('photo-upload-input')

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })
    })

    it('should accept multiple files', async () => {
      const mockOnChange = jest.fn()
      render(<PhotoUpload photos={[]} onChange={mockOnChange} />)

      const files = [
        new File(['content1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'test2.png', { type: 'image/png' }),
      ]
      const input = screen.getByTestId('photo-upload-input')

      fireEvent.change(input, { target: { files } })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
        const photos = mockOnChange.mock.calls[0][0]
        expect(photos).toHaveLength(2)
        expect(photos[0].file.name).toBe('test1.jpg')
        expect(photos[1].file.name).toBe('test2.png')
      })
    })

    it('should reject files larger than 10MB', async () => {
      const mockOnChange = jest.fn()
      render(<PhotoUpload photos={[]} onChange={mockOnChange} />)

      // Create a file larger than 10MB
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)],
        'large.jpg',
        { type: 'image/jpeg' }
      )
      const input = screen.getByTestId('photo-upload-input')

      fireEvent.change(input, { target: { files: [largeFile] } })

      await waitFor(() => {
        expect(screen.getByText(/檔案大小超過限制/i)).toBeInTheDocument()
      })
    })

    it('should reject non-image files', async () => {
      const mockOnChange = jest.fn()
      render(<PhotoUpload photos={[]} onChange={mockOnChange} />)

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByTestId('photo-upload-input')

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText(/不支援的檔案格式/i)).toBeInTheDocument()
      })
    })

    it('should limit to 20 photos maximum', async () => {
      const mockOnChange = jest.fn()
      const existingPhotos = Array(20).fill(null).map((_, i) => ({
        id: `photo-${i}`,
        url: `https://example.com/photo${i}.jpg`,
        file: null,
      }))

      render(<PhotoUpload photos={existingPhotos} onChange={mockOnChange} />)

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      const input = screen.getByTestId('photo-upload-input')

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText(/最多只能上傳 20 張照片/i)).toBeInTheDocument()
      })
    })
  })

  describe('Photo Preview', () => {
    it('should display uploaded photos', () => {
      const mockOnChange = jest.fn()
      const photos = [
        { id: '1', url: 'https://example.com/photo1.jpg', file: null },
        { id: '2', url: 'https://example.com/photo2.jpg', file: null },
      ]

      render(<PhotoUpload photos={photos} onChange={mockOnChange} />)

      expect(screen.getAllByAltText(/照片/i)).toHaveLength(2)
    })

    it('should show main photo badge on first photo', () => {
      const mockOnChange = jest.fn()
      const photos = [
        { id: '1', url: 'https://example.com/photo1.jpg', file: null },
        { id: '2', url: 'https://example.com/photo2.jpg', file: null },
      ]

      render(<PhotoUpload photos={photos} onChange={mockOnChange} />)

      expect(screen.getByText('主圖')).toBeInTheDocument()
    })

    it('should allow deleting photos', async () => {
      const mockOnChange = jest.fn()
      const photos = [
        { id: '1', url: 'https://example.com/photo1.jpg', file: null },
      ]

      render(<PhotoUpload photos={photos} onChange={mockOnChange} />)

      const deleteButton = screen.getByTestId('delete-photo-1')
      fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith([])
      })
    })
  })

  describe('Drag and Drop', () => {
    it('should handle drag over event', () => {
      const mockOnChange = jest.fn()
      render(<PhotoUpload photos={[]} onChange={mockOnChange} />)

      const dropzone = screen.getByTestId('photo-dropzone')
      fireEvent.dragOver(dropzone)

      expect(dropzone).toHaveClass('border-[#7C3AED]')
    })

    it('should handle drop event with valid files', async () => {
      const mockOnChange = jest.fn()
      render(<PhotoUpload photos={[]} onChange={mockOnChange} />)

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      const dropzone = screen.getByTestId('photo-dropzone')

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })
    })
  })
})
