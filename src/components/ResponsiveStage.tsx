import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ResponsiveStageProps {
  baseWidth: number
  baseHeight: number
  children: ReactNode
}

/** Scales a fixed-size board down to fit narrower viewports, never up. */
export function ResponsiveStage({ baseWidth, baseHeight, children }: ResponsiveStageProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / baseWidth))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [baseWidth])

  return (
    <div ref={outerRef} className="flex w-full justify-center px-3">
      <div style={{ width: baseWidth * scale, height: baseHeight * scale }}>
        <div
          style={{
            width: baseWidth,
            height: baseHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
