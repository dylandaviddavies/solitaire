import { Pile, PileKind } from './Pile'

/** The face-down draw pile. Never a valid drop target for a move. */
export class StockPile extends Pile {
  constructor(id: string) {
    super(id, PileKind.Stock)
  }

  canAccept(): boolean {
    return false
  }

  canLift(): boolean {
    return false
  }
}
