import type { Card } from '../Card'
import type { StockPile } from '../piles/StockPile'
import type { WastePile } from '../piles/WastePile'
import type { Move } from './Move'

/** Flips the exhausted waste pile back over into the stock. */
export class RecycleMove implements Move {
  readonly kind = 'recycle'
  private recycled: Card[] = []
  private readonly stock: StockPile
  private readonly waste: WastePile

  constructor(stock: StockPile, waste: WastePile) {
    this.stock = stock
    this.waste = waste
  }

  execute(): void {
    this.recycled = [...this.waste.getCards()].reverse()
    this.recycled.forEach((card) => card.flipDown())
    this.waste.reset([])
    this.stock.pushMany(this.recycled)
  }

  undo(): void {
    this.stock.reset(
      this.stock.getCards().slice(0, this.stock.length - this.recycled.length),
    )
    const restored = [...this.recycled].reverse()
    restored.forEach((card) => card.flipUp())
    this.waste.pushMany(restored)
  }
}
