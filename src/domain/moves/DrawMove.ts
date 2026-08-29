import type { Card } from '../Card'
import type { StockPile } from '../piles/StockPile'
import type { WastePile } from '../piles/WastePile'
import type { Move } from './Move'

/** Deals the top card of the stock face-up onto the waste pile. */
export class DrawMove implements Move {
  readonly kind = 'draw'
  private drawn: Card | undefined
  private readonly stock: StockPile
  private readonly waste: WastePile

  constructor(stock: StockPile, waste: WastePile) {
    this.stock = stock
    this.waste = waste
  }

  execute(): void {
    this.drawn = this.stock.pop()
    if (!this.drawn) return
    this.drawn.flipUp()
    this.waste.push(this.drawn)
  }

  undo(): void {
    if (!this.drawn) return
    this.waste.removeFrom(this.drawn)
    this.drawn.flipDown()
    this.stock.push(this.drawn)
  }
}
