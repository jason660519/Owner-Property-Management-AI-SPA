/**
 * @file PhotoUpload.tsx
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Photo upload component with drag-and-drop support
 */

'use client'

import React, { useState, useRef } from 'react'
import { X, Upload, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import heic2any from 'heic2any'

export interface Photo {
  id: string
  url: string // Preview URL (blob or uploaded URL)
  file: File | null // Original file for upload
}

interface PhotoUploadProps {
  photos: Photo[]
  onChange: (photos: Photo[]) => void
  maxPhotos?: number
  maxSizeMB?: number
}

// HEIC files may have different MIME types depending on the system
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]

// Also check file extension for HEIC files
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif']
const MAX_PHOTOS = 20
const MAX_SIZE_MB = 10

export function PhotoUpload({
  photos,
  onChange,
  maxPhotos = MAX_PHOTOS,
  maxSizeMB = MAX_SIZE_MB,
}: PhotoUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type by MIME type
    const isValidMimeType = ALLOWED_TYPES.includes(file.type)

    // Check file extension (for HEIC files that may not have correct MIME type)
    const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
    const isValidExtension = fileExtension && ALLOWED_EXTENSIONS.includes(fileExtension)

    if (!isValidMimeType && !isValidExtension) {
      return `不支援的檔案格式，請上傳 JPG、PNG 或 HEIC 格式\n檔案: ${file.name}`
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      return `檔案大小超過限制 (${fileSizeMB.toFixed(2)}MB > ${maxSizeMB}MB)`
    }

    return null
  }

  // Helper function to check if file is HEIC
  const isHEICFile = (file: File): boolean => {
    const fileName = file.name.toLowerCase()
    const fileExtension = fileName.match(/\.[^.]+$/)?.[0]
    return (
      fileExtension === '.heic' ||
      fileExtension === '.heif' ||
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.type === 'image/heic-sequence' ||
      file.type === 'image/heif-sequence'
    )
  }

  // Helper function to convert HEIC to JPEG
  const convertHEICtoJPEG = async (file: File): Promise<File> => {
    try {
      console.log(`[HEIC] 開始轉換: ${file.name}`)

      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9, // High quality
      })

      // heic2any might return Blob or Blob[]
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob

      // Create new File object with .jpg extension
      const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg')
      const jpegFile = new File([blob], newFileName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      })

      console.log(`[HEIC] 轉換成功: ${file.name} → ${newFileName}`)
      console.log(`[HEIC] 原始大小: ${(file.size / 1024).toFixed(2)} KB`)
      console.log(`[HEIC] 轉換後大小: ${(jpegFile.size / 1024).toFixed(2)} KB`)

      return jpegFile
    } catch (error) {
      console.error('[HEIC] 轉換失敗:', error)
      throw new Error(`HEIC 轉換失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    // Check total photo limit
    if (photos.length + fileArray.length > maxPhotos) {
      setError(`最多只能上傳 ${maxPhotos} 張照片`)
      return
    }

    const validFiles: Photo[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      const validationError = validateFile(file)
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`)
        continue
      }

      let processedFile = file

      // Convert HEIC to JPEG
      if (isHEICFile(file)) {
        try {
          processedFile = await convertHEICtoJPEG(file)
        } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'HEIC 轉換失敗'}`)
          continue
        }
      }

      // Create preview URL
      const url = URL.createObjectURL(processedFile)
      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url,
        file: processedFile,
      })
    }

    if (errors.length > 0) {
      setError(errors.join('\n'))
    } else {
      setError(null)
    }

    if (validFiles.length > 0) {
      onChange([...photos, ...validFiles])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDeletePhoto = (photoId: string) => {
    const photoToDelete = photos.find((p) => p.id === photoId)
    if (photoToDelete && photoToDelete.url.startsWith('blob:')) {
      URL.revokeObjectURL(photoToDelete.url)
    }
    onChange(photos.filter((p) => p.id !== photoId))
  }

  const handleClickUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        data-testid="photo-dropzone"
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-[#7C3AED] bg-[#7C3AED]/10'
            : 'border-[#333333] hover:border-[#7C3AED]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClickUpload}
      >
        <input
          ref={fileInputRef}
          data-testid="photo-upload-input"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.heic,.heif,image/jpeg,image/png,image/heic,image/heif"
          onChange={handleFileInput}
          className="hidden"
        />

        <Upload className="w-12 h-12 text-[#666666] mx-auto mb-4" />
        <p className="text-white font-medium mb-2">點擊或拖曳照片至此處上傳</p>
        <p className="text-sm text-[#999999]">支援 JPG、PNG、HEIC 格式，單檔最大 {maxSizeMB}MB</p>
        <p className="text-sm text-[#999999] mt-1">可上傳最多 {maxPhotos} 張照片</p>
        <p className="text-xs text-[#7C3AED] mt-2">🔄 HEIC 格式會自動轉換為 JPG 以確保相容性</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
          <p className="text-sm text-red-500 whitespace-pre-line">{error}</p>
        </div>
      )}

      {/* Hint */}
      <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-lg p-4">
        <p className="text-sm text-[#7C3AED]">
          💡 提示：第一張照片將作為主圖顯示，建議上傳高質量的物件外觀或客廳照片
        </p>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden bg-[#2A2A2A] border border-[#333333] group"
            >
              <img
                src={photo.url}
                alt={`照片 ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Main Photo Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-[#7C3AED] text-white text-xs px-2 py-1 rounded">
                  主圖
                </div>
              )}

              {/* Delete Button */}
              <button
                type="button"
                data-testid={`delete-photo-${photo.id}`}
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Photo Index */}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Count */}
      {photos.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#999999]">
            已上傳 {photos.length} / {maxPhotos} 張照片
          </span>
          {photos.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                photos.forEach((photo) => {
                  if (photo.url.startsWith('blob:')) {
                    URL.revokeObjectURL(photo.url)
                  }
                })
                onChange([])
              }}
            >
              清除全部
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
