"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Inbox } from "lucide-react"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "p-4" : "p-8",
        className
      )}
    >
      <div className="text-muted-foreground mb-4">
        {icon || <Inbox className="w-12 h-12" aria-hidden="true" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

