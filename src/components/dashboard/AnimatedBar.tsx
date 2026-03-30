'use client'

import { useEffect, useState } from 'react'

export function AnimatedBar({ percentage, className }: { percentage: number; className: string }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const id = requestAnimationFrame(() =>
      setWidth(Math.max(4, Math.min(100, percentage)))
    )
    return () => cancelAnimationFrame(id)
  }, [percentage])

  return (
    <div
      className={className}
      style={{
        width: `${width}%`,
        transition: 'width 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  )
}
