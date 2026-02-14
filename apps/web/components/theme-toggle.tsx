"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/Button"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Button variant="ghost" size="sm" className="w-9 h-9 px-0"><Sun className="h-[1.2rem] w-[1.2rem]" /></Button>
  }

  return (
    <div className="flex gap-2 p-2 bg-bg-secondary rounded-lg border border-border-default">
      <Button 
        variant={theme === "light" ? "primary" : "ghost"} 
        size="sm" 
        onClick={() => setTheme("light")}
        title="Light Mode"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button 
        variant={theme === "dark" ? "primary" : "ghost"} 
        size="sm" 
        onClick={() => setTheme("dark")}
        title="Dark Mode"
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  )
}
