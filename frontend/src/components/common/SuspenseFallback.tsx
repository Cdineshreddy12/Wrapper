import React from "react"
import { ZopkitRoundLoader } from "@/components/common/ZopkitRoundLoader"

export function SuspenseFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <ZopkitRoundLoader size="page" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
