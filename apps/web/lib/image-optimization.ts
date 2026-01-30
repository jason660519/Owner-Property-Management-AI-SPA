import { ImageProps } from 'next/image'

// 圖片優化配置
export const IMAGE_CONFIG = {
  // 設備像素比
  devicePixelRatios: [1, 2],
  
  // 圖片格式優先級
  formats: ['image/avif', 'image/webp'],
  
  // 加載策略
  loading: 'lazy' as const,
  
  // 質量設置
  quality: {
    thumbnail: 75,
    preview: 85,
    full: 90,
  },
  
  // 響應式圖片尺寸
  sizes: {
    thumbnail: { width: 300, height: 200 },
    preview: { width: 600, height: 400 },
    full: { width: 1200, height: 800 },
  },
  
  // 斷點配置
  breakpoints: {
    mobile: '(max-width: 640px)',
    tablet: '(max-width: 1024px)',
    desktop: '(min-width: 1025px)',
  },
} as const

// 圖片加載狀態
export enum ImageLoadState {
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
}

// 圖片優化工具函數
export function getOptimizedImageUrl(
  src: string,
  width: number,
  height: number,
  quality: number = IMAGE_CONFIG.quality.preview
): string {
  // 這裡可以集成 CDN 或圖片優化服務
  return `${src}?w=${width}&h=${height}&q=${quality}&fit=crop`
}

// 響應式圖片尺寸字符串生成器
export function generateSizesString(breakpoints: Record<string, string>): string {
  return Object.entries(breakpoints)
    .map(([size, query]) => `${query} ${size === 'mobile' ? '100vw' : size === 'tablet' ? '50vw' : '33vw'}`)
    .join(', ')
}

// 圖片預加載配置
export const PRELOAD_IMAGES = [
  '/images/hero-bg.jpg',
  '/images/logo.svg',
] as const

// 懶加載閾值
export const LAZY_LOAD_THRESHOLD = 0.1 // 10% 可見時開始加載