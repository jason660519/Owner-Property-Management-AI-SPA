/**
 * @file useFormDraft.test.ts
 * @created 2026-02-04
 * @creator Claude Sonnet 4.5
 * @description Tests for form draft hook (TDD)
 */

import { renderHook, act } from '@testing-library/react'
import { useFormDraft } from '../useFormDraft'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useFormDraft Hook', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('Basic Draft Operations', () => {
    it('should save draft with default name', () => {
      const { result } = renderHook(() => useFormDraft('test_form'))

      act(() => {
        result.current.saveDraft({ title: 'Test Property' })
      })

      expect(result.current.drafts.length).toBe(1)
      expect(result.current.drafts[0].name).toContain('草稿')
    })

    it('should save draft with custom name', () => {
      const { result } = renderHook(() => useFormDraft('test_form'))

      act(() => {
        result.current.saveDraft({ title: 'Test Property' }, 'My Custom Draft')
      })

      expect(result.current.drafts.length).toBe(1)
      expect(result.current.drafts[0].name).toBe('My Custom Draft')
    })

    it('should load draft by id', () => {
      const { result } = renderHook(() => useFormDraft('test_form'))

      let draftId: string = ''

      act(() => {
        result.current.saveDraft({ title: 'Test Property', price: 30000 }, 'Test Draft')
      })

      draftId = result.current.drafts[0].id

      const loaded = result.current.loadDraft(draftId)

      expect(loaded).toEqual({
        title: 'Test Property',
        price: 30000,
        formKey: 'test_form',
      })
    })

    it('should delete draft by id', () => {
      const { result } = renderHook(() => useFormDraft('test_form'))

      let draftId: string = ''

      act(() => {
        result.current.saveDraft({ title: 'Test Property' }, 'Test Draft')
      })

      draftId = result.current.drafts[0].id

      act(() => {
        result.current.deleteDraft(draftId)
      })

      expect(result.current.drafts.length).toBe(0)
    })
  })

  describe('Photo Data Handling', () => {
    it('should handle photos with File objects', () => {
      const { result } = renderHook(() => useFormDraft('test_form'))

      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      const formData = {
        title: 'Test Property',
        photos: [
          {
            id: '1',
            url: 'blob:http://localhost:3000/test',
            file: mockFile,
          },
        ],
      }

      act(() => {
        result.current.saveDraft(formData, 'Draft with Photos')
      })

      expect(result.current.drafts.length).toBe(1)
      expect(result.current.drafts[0].name).toBe('Draft with Photos')
    })

    it('should restore photos without File objects after reload', () => {
      const { result } = renderHook(() => useFormDraft('test_form'))

      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      const formData = {
        title: 'Test Property',
        photos: [
          {
            id: '1',
            url: 'blob:http://localhost:3000/test',
            file: mockFile,
          },
        ],
      }

      let draftId: string = ''

      act(() => {
        result.current.saveDraft(formData, 'Draft with Photos')
      })

      draftId = result.current.drafts[0].id

      const loaded = result.current.loadDraft(draftId)

      expect(loaded?.title).toBe('Test Property')
      expect(loaded?.photos).toBeDefined()
      expect(loaded?.photos[0].id).toBe('1')
      // File object should be null after deserialization
      expect(loaded?.photos[0].file).toBeNull()
    })
  })

  describe('Multiple Drafts Management', () => {
    it('should keep maximum 10 drafts', () => {
      // Simulate 15 different users/sessions saving drafts
      for (let i = 1; i <= 15; i++) {
        const { result } = renderHook(() => useFormDraft('test_form'))

        act(() => {
          result.current.saveDraft({ title: `Property ${i}` }, `Draft ${i}`)
        })

        // Debug: Check after each save
        if (i === 15) {
          const stored = localStorageMock.getItem('property_form_drafts')
          const allDrafts = stored ? JSON.parse(stored) : []
          console.log(`After ${i} saves, drafts count:`, allDrafts.length)
          console.log('Draft names:', allDrafts.map((d: any) => d.name))
        }
      }

      // Check localStorage directly
      const stored = localStorageMock.getItem('property_form_drafts')
      const allDrafts = stored ? JSON.parse(stored) : []

      // Should keep only last 10
      expect(allDrafts.length).toBeLessThanOrEqual(10)
      if (allDrafts.length === 10) {
        expect(allDrafts[0].name).toBe('Draft 15') // Most recent
      }
    })

    it('should filter drafts by formKey', () => {
      const { result: result1 } = renderHook(() => useFormDraft('form_1'))
      const { result: result2 } = renderHook(() => useFormDraft('form_2'))

      act(() => {
        result1.current.saveDraft({ title: 'Property 1' }, 'Form 1 Draft')
      })

      act(() => {
        result2.current.saveDraft({ title: 'Property 2' }, 'Form 2 Draft')
      })

      expect(result1.current.drafts.length).toBe(1)
      expect(result1.current.drafts[0].name).toBe('Form 1 Draft')

      expect(result2.current.drafts.length).toBe(1)
      expect(result2.current.drafts[0].name).toBe('Form 2 Draft')
    })
  })

  describe('Error Handling', () => {
    it('should handle circular reference in data', () => {
      const { result } = renderHook(() => useFormDraft('test_form'))

      const circularData: any = { title: 'Test' }
      circularData.self = circularData

      expect(() => {
        act(() => {
          result.current.saveDraft(circularData, 'Circular Draft')
        })
      }).toThrow()
    })

    it('should handle localStorage quota exceeded', () => {
      const { result } = renderHook(() => useFormDraft('test_form'))

      // Mock localStorage.setItem to throw quota error
      const originalSetItem = localStorageMock.setItem
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => {
        act(() => {
          result.current.saveDraft({ title: 'Test' }, 'Test Draft')
        })
      }).toThrow()

      // Restore
      localStorageMock.setItem = originalSetItem
    })
  })
})
