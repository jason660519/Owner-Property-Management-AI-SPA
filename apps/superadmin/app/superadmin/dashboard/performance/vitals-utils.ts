/** LCP thresholds per Google's Core Web Vitals spec */
export function getLCPRating(lcp: number | null): 'good' | 'needs-improvement' | 'poor' | 'no-data' {
  if (lcp == null) return 'no-data';
  if (lcp < 2500) return 'good';
  if (lcp < 4000) return 'needs-improvement';
  return 'poor';
}

export function getCLSRating(cls: number | null): 'good' | 'needs-improvement' | 'poor' | 'no-data' {
  if (cls == null) return 'no-data';
  if (cls < 0.1) return 'good';
  if (cls < 0.25) return 'needs-improvement';
  return 'poor';
}

export function getTTFBRating(ttfb: number | null): 'good' | 'needs-improvement' | 'poor' | 'no-data' {
  if (ttfb == null) return 'no-data';
  if (ttfb < 800) return 'good';
  if (ttfb < 1800) return 'needs-improvement';
  return 'poor';
}
