'use client'

import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  loadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const measurePerformance = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paint = performance.getEntriesByType('paint')
        
        const loadTime = navigation?.loadEventEnd - navigation?.loadEventStart || 0
        const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
        
        // 簡化的 LCP 測量
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          if (lastEntry) {
            setMetrics(prev => prev ? {
              ...prev,
              largestContentfulPaint: lastEntry.startTime
            } : null)
          }
        })
        
        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        } catch (e) {
          // LCP 不支持時的備用方案
        }

        // 簡化的 CLS 測量
        let clsValue = 0
        let clsEntries: PerformanceEntry[] = []
        
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsEntries.push(entry)
              clsValue += (entry as any).value
            }
          }
          
          setMetrics(prev => prev ? {
            ...prev,
            cumulativeLayoutShift: clsValue
          } : null)
        })
        
        try {
          clsObserver.observe({ entryTypes: ['layout-shift'] })
        } catch (e) {
          // CLS 不支持時的備用方案
        }

        setMetrics({
          loadTime,
          firstContentfulPaint: fcp,
          largestContentfulPaint: 0, // 將由 LCP observer 更新
          cumulativeLayoutShift: 0, // 將由 CLS observer 更新
          firstInputDelay: 0, // 簡化版本
        })

        // 清理函數
        return () => {
          lcpObserver.disconnect()
          clsObserver.disconnect()
        }
      }
    }

    // 延遲測量以確保頁面完全加載
    const timer = setTimeout(measurePerformance, 1000)
    return () => clearTimeout(timer)
  }, [])

  const getMetricStatus = (value: number, threshold: number) => {
    if (value <= threshold * 0.5) return 'good'
    if (value <= threshold) return 'needs-improvement'
    return 'poor'
  }

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-400'
      case 'needs-improvement':
        return 'text-yellow-400'
      case 'poor':
        return 'text-red-400'
      default:
        return 'text-grey-60'
    }
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <>
      {/* 切換按鈕 */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-grey-10 border border-grey-15 rounded-lg p-3 shadow-lg hover:bg-grey-15 transition-colors"
        aria-label="Toggle performance monitor"
        title="Performance Monitor"
      >
        ⚡
      </button>

      {/* 監控面板 */}
      {isVisible && metrics && (
        <div className="fixed bottom-16 right-4 z-50 w-80 max-h-96 bg-grey-08 border border-grey-15 rounded-lg shadow-xl overflow-hidden">
          <div className="p-4 border-b border-grey-15">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Performance Metrics</h3>
              <button
                onClick={() => window.location.reload()}
                className="text-purple-60 hover:text-purple-70 text-sm"
              >
                Refresh
              </button>
            </div>
            <div className="text-xs text-grey-60 mt-1">
              Core Web Vitals & Performance
            </div>
          </div>

          <div className="p-4 overflow-y-auto max-h-80 space-y-4">
            {/* Load Time */}
            <div className="border border-grey-15 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">Load Time</span>
                <span className={`text-sm ${getMetricColor(getMetricStatus(metrics.loadTime, 3000))}`}>
                  {formatTime(metrics.loadTime)}
                </span>
              </div>
              <div className="text-xs text-grey-60">
                Target: &lt; 3s (Good)
              </div>
            </div>

            {/* First Contentful Paint */}
            <div className="border border-grey-15 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">First Contentful Paint</span>
                <span className={`text-sm ${getMetricColor(getMetricStatus(metrics.firstContentfulPaint, 1800))}`}>
                  {formatTime(metrics.firstContentfulPaint)}
                </span>
              </div>
              <div className="text-xs text-grey-60">
                Target: &lt; 1.8s (Good)
              </div>
            </div>

            {/* Largest Contentful Paint */}
            <div className="border border-grey-15 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">Largest Contentful Paint</span>
                <span className={`text-sm ${getMetricColor(getMetricStatus(metrics.largestContentfulPaint, 2500))}`}>
                  {metrics.largestContentfulPaint > 0 ? formatTime(metrics.largestContentfulPaint) : 'Measuring...'}
                </span>
              </div>
              <div className="text-xs text-grey-60">
                Target: &lt; 2.5s (Good)
              </div>
            </div>

            {/* Cumulative Layout Shift */}
            <div className="border border-grey-15 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">Layout Shift</span>
                <span className={`text-sm ${getMetricColor(getMetricStatus(metrics.cumulativeLayoutShift * 1000, 100))}`}>
                  {metrics.cumulativeLayoutShift.toFixed(3)}
                </span>
              </div>
              <div className="text-xs text-grey-60">
                Target: &lt; 0.1 (Good)
              </div>
            </div>

            {/* 性能評分 */}
            <div className="border border-grey-15 rounded-lg p-3 bg-grey-10">
              <div className="text-center">
                <div className="text-lg font-bold text-white mb-1">
                  Performance Score
                </div>
                <div className={`text-2xl font-bold ${
                  metrics.loadTime < 1000 && metrics.firstContentfulPaint < 1000 
                    ? 'text-green-400' 
                    : metrics.loadTime < 3000 && metrics.firstContentfulPaint < 1800
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {metrics.loadTime < 1000 && metrics.firstContentfulPaint < 1000 
                    ? '90-100' 
                    : metrics.loadTime < 3000 && metrics.firstContentfulPaint < 1800
                    ? '50-89'
                    : '0-49'
                  }
                </div>
                <div className="text-xs text-grey-60">
                  Estimated Score
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-grey-15 text-xs text-grey-60">
            <div className="flex justify-between">
              <span>Core Web Vitals</span>
              <span>Auto-measurement</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}