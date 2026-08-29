/**
 * Tracks the on-screen rectangle of every pile so a dragged card can be
 * hit-tested against them on release. Kept as a tiny standalone class
 * (rather than sprinkling `getBoundingClientRect` calls through
 * components) so the "what pile is under this point" concern has exactly
 * one owner.
 */
export class DropRegistry {
  private elements = new Map<string, HTMLElement>()

  register(pileId: string, element: HTMLElement): () => void {
    this.elements.set(pileId, element)
    return () => {
      if (this.elements.get(pileId) === element) {
        this.elements.delete(pileId)
      }
    }
  }

  /** Returns the smallest registered pile rect containing point (x, y), if any. */
  findPileAt(x: number, y: number): string | undefined {
    let bestId: string | undefined
    let bestArea = Infinity
    for (const [id, el] of this.elements) {
      const rect = el.getBoundingClientRect()
      const within = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      if (!within) continue
      const area = rect.width * rect.height
      if (area < bestArea) {
        bestArea = area
        bestId = id
      }
    }
    return bestId
  }
}
