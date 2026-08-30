import { Card, Suit } from './Card'
import { Deck } from './Deck'
import { EventEmitter } from './EventEmitter'
import { DrawMove } from './moves/DrawMove'
import { RecycleMove } from './moves/RecycleMove'
import { TransferMove } from './moves/TransferMove'
import type { Move } from './moves/Move'
import { FoundationPile } from './piles/FoundationPile'
import { Pile, PileKind } from './piles/Pile'
import { StockPile } from './piles/StockPile'
import { TableauPile } from './piles/TableauPile'
import { WastePile } from './piles/WastePile'

export const TABLEAU_COLUMNS = 7
const SUIT_ORDER = [Suit.Hearts, Suit.Clubs, Suit.Diamonds, Suit.Spades]

interface DealStep {
  column: number
  faceUp: boolean
}

/** A card stripped down to only what's needed to recreate it — no `id`
 * (ids are a fresh-per-session counter, meaningless across a reload) and
 * no behaviour. */
export interface SerializedCard {
  suit: Suit
  rank: Card['rank']
  faceUp: boolean
}

/** Everything needed to resume a game exactly where the player left off:
 * every pile's contents (bottom to top), the still-to-be-dealt queue (in
 * case a save lands mid deal-in animation), and the running move
 * count/start time so the toolbar's counters stay correct. Undo history is
 * deliberately not included — resuming with a clean slate for "undo" is a
 * reasonable trade for not having to serialize the move-command stack.
 * This type (and `snapshot`/`restore` below) is the engine's only
 * awareness of persistence; it has no idea *where* a snapshot is stored —
 * see `lib/gameStorage.ts` for the localStorage adapter. */
export interface GameSnapshot {
  version: 1
  stock: SerializedCard[]
  waste: SerializedCard[]
  foundations: SerializedCard[][]
  tableau: SerializedCard[][]
  dealQueue: DealStep[]
  movesMade: number
  startedAt: number
}

interface GameEvents {
  change: { movesMade: number }
  won: { movesMade: number; elapsedMs: number }
  invalidMove: { cardId: string }
  /** A card was dealt face-up onto the waste pile — the UI uses this to
   * play a flip animation for that specific card. */
  drawn: { cardId: string }
  /** One or more cards were relocated to a different pile (drag-drop,
   * tap-to-move or auto-play) — the UI plays a "landed" flourish on them. */
  moved: { cardIds: string[] }
  [key: string]: unknown
}

/**
 * Orchestrates a single game of Klondike (draw-1).
 *
 * GameEngine is intentionally the *only* class that knows how all the
 * pieces fit together — Card, Deck, Pile subclasses and Move subclasses
 * each know only their own narrow responsibility (Single Responsibility),
 * and GameEngine depends solely on the `Pile` and `Move` abstractions
 * (Dependency Inversion), never on a concrete pile/move type by name
 * except when constructing the board layout itself.
 *
 * It is framework-agnostic: no React import here. The `useGameEngine`
 * hook is the only thing that adapts this to React, via the EventEmitter.
 */
export class GameEngine {
  readonly stock: StockPile
  readonly waste: WastePile
  readonly foundations: FoundationPile[]
  readonly tableau: TableauPile[]

  private history: Move[] = []
  private dealQueue: DealStep[] = []
  private movesMade = 0
  private startedAt = 0
  private wonEmitted = false
  /** Bumped on every mutation, including ones that don't change movesMade
   * (dealing a card). This — not movesMade — is what the React adapter
   * uses as its `useSyncExternalStore` snapshot, since that hook only
   * re-renders when the snapshot value actually changes. */
  private stateVersion = 0

  private readonly events = new EventEmitter<GameEvents>()
  readonly on = this.events.on.bind(this.events)

  constructor(rng: () => number = Math.random) {
    this.stock = new StockPile('stock')
    this.waste = new WastePile('waste')
    this.foundations = SUIT_ORDER.map((suit) => new FoundationPile(`foundation-${suit}`, suit))
    this.tableau = Array.from({ length: TABLEAU_COLUMNS }, (_, i) => new TableauPile(`tableau-${i}`))
    this.startNewGame(rng)
  }

  // ---------------------------------------------------------------------
  // Setup / dealing
  // ---------------------------------------------------------------------

  /** Resets all piles and queues a fresh 28-card deal for `dealNext()`. */
  startNewGame(rng: () => number = Math.random): void {
    const drawn = Deck.freshShuffled(rng).draw(52)
    this.stock.reset([...drawn].reverse())
    this.waste.reset([])
    this.foundations.forEach((f) => f.reset([]))
    this.tableau.forEach((t) => t.reset([]))

    this.history = []
    this.movesMade = 0
    this.startedAt = Date.now()
    this.wonEmitted = false
    this.dealQueue = this.buildDealPlan()
    this.emitChange()
  }

  private buildDealPlan(): DealStep[] {
    const steps: DealStep[] = []
    for (let row = 0; row < TABLEAU_COLUMNS; row++) {
      for (let col = row; col < TABLEAU_COLUMNS; col++) {
        steps.push({ column: col, faceUp: col === row })
      }
    }
    return steps
  }

  get isDealing(): boolean {
    return this.dealQueue.length > 0
  }

  /** Deals one card from the queued plan. Returns false once fully dealt. */
  dealNext(): boolean {
    const step = this.dealQueue.shift()
    if (!step) return false
    const card = this.stock.pop()
    if (!card) return false
    card.setFaceUp(step.faceUp)
    this.tableau[step.column].push(card)
    this.emitChange()
    return true
  }

  // ---------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------

  get allPiles(): Pile[] {
    return [this.stock, this.waste, ...this.foundations, ...this.tableau]
  }

  findPile(pileId: string): Pile | undefined {
    return this.allPiles.find((p) => p.id === pileId)
  }

  findPileOf(card: Card): Pile | undefined {
    return this.allPiles.find((p) => p.getCards().includes(card))
  }

  get movesCount(): number {
    return this.movesMade
  }

  get version(): number {
    return this.stateVersion
  }

  get startedAtMs(): number {
    return this.startedAt
  }

  isWon(): boolean {
    return this.foundations.every((f) => f.isComplete)
  }

  /** True once every card is face up and out of the stock/waste — safe to offer "Auto Finish". */
  canAutoComplete(): boolean {
    if (this.stock.length > 0 || this.waste.length > 0) return false
    return this.tableau.every((column) => column.getCards().every((c) => c.faceUp))
  }

  // ---------------------------------------------------------------------
  // Player actions
  // ---------------------------------------------------------------------

  /** Draws a card to the waste, or recycles the waste when the stock is empty. */
  draw(): void {
    if (this.stock.isEmpty) {
      this.run(new RecycleMove(this.stock, this.waste))
      return
    }
    // Peeked before executing: DrawMove pops this exact card, so its id
    // tells the UI which freshly-mounted waste card should play the flip.
    const drawnCard = this.stock.top
    this.run(new DrawMove(this.stock, this.waste))
    if (drawnCard) {
      this.events.emit('drawn', { cardId: drawnCard.id })
    }
  }

  /**
   * Attempts to move `card` (and, if it's the base of a tableau run, every
   * card above it) onto the pile identified by `destinationId`.
   * Returns true if the move was legal and applied.
   */
  moveCard(card: Card, destinationId: string): boolean {
    const source = this.findPileOf(card)
    const destination = this.findPile(destinationId)
    if (!source || !destination || source === destination) return false
    if (!source.canLift(card)) return false

    const run = source.kind === PileKind.Tableau
      ? (source as TableauPile).runFrom(card)
      : [card]

    if (destination.kind === PileKind.Foundation && run.length !== 1) return false
    if (!destination.canAccept(run[0])) {
      this.events.emit('invalidMove', { cardId: card.id })
      return false
    }

    this.run(new TransferMove(source, destination, run))
    return true
  }

  /**
   * Tries to send `card` straight to a foundation it fits on — used for
   * double-click / double-tap "auto-play" convenience.
   */
  sendToFoundation(card: Card): boolean {
    const source = this.findPileOf(card)
    if (!source || !source.canLift(card)) return false
    const target = this.foundations.find((f) => f.canAccept(card))
    if (!target) return false
    this.run(new TransferMove(source, target, [card]))
    return true
  }

  /**
   * Performs a single greedy safe move toward the foundations, for the
   * "auto finish" flourish once the whole board is face up. Returns
   * whether a move was made so callers can loop with a delay for a nice
   * cascading animation.
   */
  autoCompleteStep(): boolean {
    if (!this.canAutoComplete()) return false
    const candidates = [this.waste, ...this.tableau]
    for (const pile of candidates) {
      const top = pile.top
      if (!top) continue
      if (this.sendToFoundation(top)) return true
    }
    return false
  }

  undo(): void {
    const move = this.history.pop()
    if (!move) return
    move.undo()
    this.movesMade = Math.max(0, this.movesMade - 1)
    this.emitChange()
  }

  get canUndo(): boolean {
    return this.history.length > 0
  }

  // ---------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------

  /** Captures every pile and the deal-in progress as plain data, suitable
   * for JSON-serializing (see `lib/gameStorage.ts`). */
  snapshot(): GameSnapshot {
    const serialize = (cards: readonly Card[]): SerializedCard[] =>
      cards.map((card) => ({ suit: card.suit, rank: card.rank, faceUp: card.faceUp }))
    return {
      version: 1,
      stock: serialize(this.stock.getCards()),
      waste: serialize(this.waste.getCards()),
      foundations: this.foundations.map((f) => serialize(f.getCards())),
      tableau: this.tableau.map((t) => serialize(t.getCards())),
      dealQueue: this.dealQueue.map((step) => ({ ...step })),
      movesMade: this.movesMade,
      startedAt: this.startedAt,
    }
  }

  /**
   * Replaces the current board with a previously-captured one — used to
   * resume a game after a page refresh. Refuses (leaving the engine's own
   * freshly-dealt game untouched) unless the snapshot accounts for exactly
   * the 52 distinct cards a real deck has, so a corrupted or hand-edited
   * save can never leave the board in a broken state.
   */
  restore(snapshot: GameSnapshot): boolean {
    const allSerialized = [
      ...snapshot.stock,
      ...snapshot.waste,
      ...snapshot.foundations.flat(),
      ...snapshot.tableau.flat(),
    ]
    if (allSerialized.length !== 52) return false
    const distinct = new Set(allSerialized.map((c) => `${c.rank}-${c.suit}`))
    if (distinct.size !== 52) return false

    const makeCard = (sc: SerializedCard) => new Card(sc.suit, sc.rank, sc.faceUp)
    this.stock.reset(snapshot.stock.map(makeCard))
    this.waste.reset(snapshot.waste.map(makeCard))
    this.foundations.forEach((foundation, i) => foundation.reset((snapshot.foundations[i] ?? []).map(makeCard)))
    this.tableau.forEach((column, i) => column.reset((snapshot.tableau[i] ?? []).map(makeCard)))

    this.dealQueue = snapshot.dealQueue.map((step) => ({ ...step }))
    this.history = []
    this.movesMade = snapshot.movesMade
    this.startedAt = snapshot.startedAt
    // Set directly rather than letting emitChange() discover it, so a
    // restored already-won game doesn't re-fire the 'won' celebration.
    this.wonEmitted = this.isWon()
    this.emitChange()
    return true
  }

  // ---------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------

  private run(move: Move): void {
    move.execute()
    this.history.push(move)
    this.movesMade += 1
    if (move instanceof TransferMove) {
      this.events.emit('moved', { cardIds: move.movedCardIds })
    }
    this.emitChange()
  }

  private emitChange(): void {
    this.stateVersion += 1
    this.events.emit('change', { movesMade: this.movesMade })
    if (!this.wonEmitted && this.isWon()) {
      this.wonEmitted = true
      this.events.emit('won', { movesMade: this.movesMade, elapsedMs: Date.now() - this.startedAt })
    }
  }
}
