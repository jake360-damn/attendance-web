'use client'

import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export default function Loading({ size = 'md', text, className }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <svg
        className={cn('pl', sizeClasses[size])}
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle className="pl__ring pl__ring--a" cx="64" cy="64" r="56" strokeWidth="8" fill="none" />
        <circle className="pl__ring pl__ring--b" cx="64" cy="64" r="56" strokeWidth="8" fill="none" />
        <circle className="pl__ring pl__ring--c" cx="64" cy="64" r="56" strokeWidth="8" fill="none" />
        <circle className="pl__ring pl__ring--d" cx="64" cy="64" r="56" strokeWidth="8" fill="none" />
      </svg>
      {text && <p className="text-gray-500 font-medium">{text}</p>}
    </div>
  )
}
