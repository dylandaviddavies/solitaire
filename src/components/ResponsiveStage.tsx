import { useEffect, useRef, useState, type ReactNode } from 'react'
import { StageScaleContext } from '../lib/StageScaleContext'

interface ResponsiveStageProps {
  baseWidth: number
  baseHeight: number
  children: ReactNode
}

/**
 * Scales a fixed-size board down to fit whichever dimension is tighter —
 * width on a narrow phone, height on a short one — and never up. The
 * parent is expected to hand this component the full leftover space (a
 * flex-1 region between the toolbar and the footer hint) so the board can
 * be centered in both axes instead of just pinned to the top.
 */
export function ResponsiveStage({ baseWidth, baseHeight, children }: ResponsiveStageProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const update = () => {
      const widthScale = el.clientWidth / baseWidth
      const heightScale = el.clientHeight / baseHeight
      setScale(Math.min(1, widthScale, heightScale))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [baseWidth, baseHeight])

  return (
    <div ref={outerRef} className="flex h-full w-full items-center justify-center px-2 sm:px-3">
      <div style={{ width: baseWidth * scale, height: baseHeight * scale }}>
        <div
          style={{
            width: baseWidth,
            height: baseHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <StageScaleContext.Provider value={scale}>{children}</StageScaleContext.Provider>
        </div>
      </div>
    </div>
  )
}
