"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
  message?: string
}

export function LoadingSpinner({ 
  size = "md", 
  message,
  className,
  ...props 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12"
  }

  return (
    <div 
      className={cn("flex items-center justify-center p-8", className)}
      aria-live="polite"
      aria-busy="true"
      {...props}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} aria-hidden="true" />
        {message && (
          <span className="text-sm text-muted-foreground">{message}</span>
        )}
      </div>
    </div>
  )
}

export function Skeleton({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse bg-muted rounded", className)}
      {...props}
    />
  )
}

export function LoadingState({ 
  message = "読み込み中...",
  className,
  ...props 
}: { 
  message?: string
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn("flex items-center justify-center min-h-[200px]", className)}
      aria-live="polite"
      aria-busy="true"
      {...props}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  )
}







