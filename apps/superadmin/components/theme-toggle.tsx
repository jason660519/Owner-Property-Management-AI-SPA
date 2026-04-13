"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border-default bg-bg-secondary text-text-secondary"
        aria-label="切換主題"
        disabled
      >
        <Sun className="h-4 w-4" />
      </button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-border-default bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors duration-200"
      title={isDark ? "切換至亮模式" : "切換至暗模式"}
      aria-label={isDark ? "切換至亮模式" : "切換至暗模式"}
    >
      <Sun
        className={`h-4 w-4 absolute transition-all duration-200 ${
          isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-50 pointer-events-none"
        }`}
      />
      <Moon
        className={`h-4 w-4 absolute transition-all duration-200 ${
          !isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-50 pointer-events-none"
        }`}
      />
    </button>
  )
}
