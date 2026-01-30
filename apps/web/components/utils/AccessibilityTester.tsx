'use client'

import { useState, useEffect } from 'react'

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  element?: string
  suggestion?: string
}

export function AccessibilityTester() {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([])
  const [isVisible, setIsVisible] = useState(false)

  const runAccessibilityCheck = () => {
    const newIssues: AccessibilityIssue[] = []
    
    // 檢查圖片 alt 屬性
    const images = document.querySelectorAll('img')
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        newIssues.push({
          type: 'error',
          message: `Image ${index + 1} missing alt text`,
          element: 'img',
          suggestion: 'Add alt attribute or aria-label'
        })
      }
    })

    // 檢查按鈕的可訪問性
    const buttons = document.querySelectorAll('button')
    buttons.forEach((button, index) => {
      if (!button.getAttribute('aria-label') && !button.textContent?.trim()) {
        newIssues.push({
          type: 'warning',
          message: `Button ${index + 1} may need aria-label`,
          element: 'button',
          suggestion: 'Add aria-label for screen readers'
        })
      }
    })

    // 檢查顏色對比度（簡化版本）
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span')
    textElements.forEach((element, index) => {
      const computedStyle = window.getComputedStyle(element)
      const color = computedStyle.color
      const backgroundColor = computedStyle.backgroundColor
      
      // 這裡可以添加更複雜的對比度計算
      if (color === backgroundColor) {
        newIssues.push({
          type: 'error',
          message: `Text element ${index + 1} has insufficient contrast`,
          element: element.tagName.toLowerCase(),
          suggestion: 'Ensure sufficient color contrast (WCAG 4.5:1)'
        })
      }
    })

    // 檢查鍵盤導航
    const focusableElements = document.querySelectorAll('a, button, input, textarea, select')
    focusableElements.forEach((element, index) => {
      if (!element.getAttribute('tabindex') && element.getAttribute('tabindex') !== '0') {
        // 這是正常情況，但可以做更複雜的檢查
      }
    })

    // 檢查語義 HTML
    const sections = document.querySelectorAll('section')
    sections.forEach((section, index) => {
      if (!section.getAttribute('aria-label') && !section.querySelector('h1, h2, h3, h4, h5, h6')) {
        newIssues.push({
          type: 'info',
          message: `Section ${index + 1} could benefit from heading or aria-label`,
          element: 'section',
          suggestion: 'Add heading or aria-label for better navigation'
        })
      }
    })

    setIssues(newIssues)
  }

  useEffect(() => {
    // 延遲執行以確保 DOM 完全加載
    const timer = setTimeout(() => {
      runAccessibilityCheck()
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const getIssueIcon = (type: AccessibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
    }
  }

  const getIssueColor = (type: AccessibilityIssue['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
    }
  }

  return (
    <>
      {/* 切換按鈕 */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed top-4 right-4 z-50 bg-grey-10 border border-grey-15 rounded-lg p-3 shadow-lg hover:bg-grey-15 transition-colors"
        aria-label="Toggle accessibility tester"
        title="Accessibility Tester"
      >
        ♿
      </button>

      {/* 測試面板 */}
      {isVisible && (
        <div className="fixed top-16 right-4 z-50 w-80 max-h-96 bg-grey-08 border border-grey-15 rounded-lg shadow-xl overflow-hidden">
          <div className="p-4 border-b border-grey-15">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Accessibility Test</h3>
              <button
                onClick={runAccessibilityCheck}
                className="text-purple-60 hover:text-purple-70 text-sm"
              >
                Refresh
              </button>
            </div>
            <div className="text-xs text-grey-60 mt-1">
              Found {issues.length} issues
            </div>
          </div>

          <div className="p-4 overflow-y-auto max-h-80">
            {issues.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-white text-sm">No accessibility issues found!</div>
                <div className="text-grey-60 text-xs mt-1">Great job on accessibility</div>
              </div>
            ) : (
              <div className="space-y-3">
                {issues.map((issue, index) => (
                  <div key={index} className="border border-grey-15 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <span className={getIssueColor(issue.type)}>
                        {getIssueIcon(issue.type)}
                      </span>
                      <div className="flex-1">
                        <div className="text-white text-sm font-medium">
                          {issue.message}
                        </div>
                        {issue.element && (
                          <div className="text-grey-60 text-xs mt-1">
                            Element: {issue.element}
                          </div>
                        )}
                        {issue.suggestion && (
                          <div className="text-grey-60 text-xs mt-1 italic">
                            Suggestion: {issue.suggestion}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-grey-15 text-xs text-grey-60">
            <div className="flex justify-between">
              <span>WCAG 2.1 Guidelines</span>
              <span>Auto-check enabled</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}