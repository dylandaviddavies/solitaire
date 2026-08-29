/** Playful, colorful card back — geometric, no external art assets. */
export function CardBack() {
  return (
    <div className="h-full w-full overflow-hidden rounded-[14px] bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 p-[6px]">
      <div className="grid h-full w-full grid-cols-3 grid-rows-4 gap-[3px] rounded-lg bg-white/10 p-1.5">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="rounded-[3px] bg-white/25"
            style={{ opacity: (i % 4) * 0.2 + 0.35 }}
          />
        ))}
      </div>
    </div>
  )
}
