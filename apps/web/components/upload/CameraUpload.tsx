'use client';

import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Upload, X } from 'lucide-react';
import Image from 'next/image';

interface CameraUploadProps {
    onUpload?: (file: File) => void | Promise<void>;
    maxSizeMB?: number;
    accept?: string;
}

export function CameraUpload({
    onUpload,
    maxSizeMB = 10,
    accept = 'image/*'
}: CameraUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        // 檢查文件大小
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSizeMB) {
            setError(`檔案大小超過 ${maxSizeMB}MB 限制`);
            return;
        }

        // 顯示預覽
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // 上傳
        if (onUpload) {
            try {
                setUploading(true);
                await onUpload(file);
            } catch (err) {
                setError(err instanceof Error ? err.message : '上傳失敗');
            } finally {
                setUploading(false);
            }
        }
    };

    const handleCameraClick = () => {
        cameraInputRef.current?.click();
    };

    const handleGalleryClick = () => {
        galleryInputRef.current?.click();
    };

    const handleClearPreview = () => {
        setPreview(null);
        setError(null);
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    return (
        <div className="space-y-4">
            {/* 預覽區域 */}
            {preview && (
                <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <Image
                        src={preview}
                        alt="Preview"
                        fill
                        className="object-contain"
                    />
                    <button
                        onClick={handleClearPreview}
                        className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="text-white text-center">
                                <Upload className="animate-bounce mx-auto mb-2" size={32} />
                                <p>上傳中...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 錯誤訊息 */}
            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* 上傳按鈕 */}
            <div className="grid grid-cols-2 gap-3">
                {/* 拍照按鈕 */}
                <button
                    onClick={handleCameraClick}
                    disabled={uploading}
                    className="flex flex-col items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-4 px-6 rounded-lg transition-colors"
                >
                    <Camera size={24} />
                    <span className="text-sm font-medium">拍照上傳</span>
                </button>

                {/* 相簿選擇按鈕 */}
                <button
                    onClick={handleGalleryClick}
                    disabled={uploading}
                    className="flex flex-col items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 text-white py-4 px-6 rounded-lg transition-colors"
                >
                    <ImageIcon size={24} />
                    <span className="text-sm font-medium">選擇照片</span>
                </button>
            </div>

            {/* 隱藏的 input 元素 */}
            {/* 相機輸入 */}
            <input
                ref={cameraInputRef}
                type="file"
                accept={accept}
                capture="environment"  // 使用後置相機
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* 相簿輸入 */}
            <input
                ref={galleryInputRef}
                type="file"
                accept={accept}
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* 提示文字 */}
            <p className="text-sm text-gray-400 text-center">
                支援 JPG、PNG 格式，最大 {maxSizeMB}MB
            </p>
        </div>
    );
}
