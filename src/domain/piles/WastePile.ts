import { Pile, PileKind } from './Pile'

/** The face-up pile dealt from the stock. Only its top card is liftable. */
export class WastePile extends Pile {
  constructor(id: string) {
    super(id, PileKind.Waste)
  }

  canAccept(): boolean {
    return false
  }
}
