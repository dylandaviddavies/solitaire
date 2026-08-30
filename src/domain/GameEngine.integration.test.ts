import { describe, expect, it } from 'vitest'
import { RANKS, Suit } from './Card'
import { GameEngine, type SerializedCard } from './GameEngine'
import {
  ALL_SUITS,
  card,
  emptySnapshot,
  winnableDealSnapshot,
} from './GameEngine.testFixtures'

// ---------------------------------------------------------------------------
// A small greedy solver — enough to finish a favourable deal
// ---------------------------------------------------------------------------

interface PlayLog {
  foundationMoves: number
  tableauMoves: number
  draws: number
  recycles: number
  iterations: number
  won: boolean
}

/**
 * Repeatedly: send a card to a foundation, else shift a run to expose a
 * covered card, else move the waste card onto the tableau, else draw
 * (recycling the waste when the stock is empty). Stops on a win, when the
 * board stops changing, or at `maxIterations`.
 */
function playGreedily(engine: GameEngine, maxIterations = 1000): PlayLog {
  const log: PlayLog = {
    foundationMoves: 0,
    tableauMoves: 0,
    draws: 0,
    recycles: 0,
    iterations: 0,
    won: false,
  }

  const boardKey = () =>
    JSON.stringify([
      engine.stock.length,
      engine.waste.length,
      engine.foundations.map((f) => f.length),
      engine.tableau.map((t) => t.getCards().map((c) => `${c.rank}${c.suit}${c.faceUp ? 'U' : 'D'}`)),
    ])

  const trySendToFoundation = () => {
    for (const pile of [engine.waste, ...engine.tableau]) {
      const top = pile.top
      if (top && engine.sendToFoundation(top)) {
        log.foundationMoves++
        return true
      }
    }
    return false
  }

  const tryExposeCoveredCard = () => {
    for (const source of engine.tableau) {
      const cards = source.getCards()
      const firstFaceUp = cards.findIndex((c) => c.faceUp)
      // Only worth moving a run if doing so uncovers a face-down card.
      if (firstFaceUp <= 0) continue
      for (let i = firstFaceUp; i < cards.length; i++) {
        const runHead = cards[i]
        if (!source.canLift(runHead)) continue
        for (const dest of [...engine.foundations, ...engine.tableau]) {
          if (dest === source || !dest.canAccept(runHead)) continue
          if (engine.moveCard(runHead, dest.id)) {
            log.tableauMoves++
            return true
          }
        }
      }
    }
    return false
  }

  const tryWasteToTableau = () => {
    const top = engine.waste.top
    if (!top) return false
    for (const dest of engine.tableau) {
      if (dest.canAccept(top) && engine.moveCard(top, dest.id)) {
        log.tableauMoves++
        return true
      }
    }
    return false
  }

  let lastKey = ''
  for (log.iterations = 0; log.iterations < maxIterations; log.iterations++) {
    if (engine.isWon()) {
      log.won = true
      return log
    }

    if (trySendToFoundation()) continue
    if (tryExposeCoveredCard()) continue
    if (tryWasteToTableau()) continue

    if (!engine.stock.isEmpty) {
      engine.draw()
      log.draws++
      continue
    }
    if (!engine.waste.isEmpty && log.recycles < 3) {
      const key = boardKey()
      if (key === lastKey) break // a recycle wouldn't change anything
      lastKey = key
      engine.draw() // stock empty → RecycleMove
      log.recycles++
      log.draws++
      continue
    }
    break // no progress available
  }

  return log
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GameEngine — full-game integration', () => {
  it('plays a rigged deal through to a complete win', () => {
    const engine = new GameEngine()
    expect(engine.restore(winnableDealSnapshot())).toBe(true)

    let wonEvents = 0
    engine.on('won', () => {
      wonEvents++
    })

    const log = playGreedily(engine)

    expect(log.won).toBe(true)
    expect(engine.isWon()).toBe(true)
    expect(engine.foundations.every((f) => f.isComplete)).toBe(true)
    expect(engine.foundations.reduce((n, f) => n + f.length, 0)).toBe(52)
    expect(engine.stock.isEmpty && engine.waste.isEmpty).toBe(true)
    expect(engine.tableau.every((t) => t.isEmpty)).toBe(true)

    // A real playthrough: the 28 tableau cards went up as they were
    // revealed, and every stock card was drawn before being played.
    expect(log.foundationMoves).toBe(52)
    expect(log.draws).toBeGreaterThanOrEqual(24)
    expect(engine.movesCount).toBeGreaterThan(52)

    // 'won' fires exactly once, at the moment the last card lands.
    expect(wonEvents).toBe(1)
  })

  it('recycles the waste back into the stock once the stock is exhausted', () => {
    const snapshot = emptySnapshot()
    // Three cards in the stock, nothing playable; the rest parked legally
    // in a column so restore() accepts a full deck.
    snapshot.stock = [card('9', Suit.Hearts), card('7', Suit.Clubs), card('4', Suit.Spades)]
    const used = new Set(snapshot.stock.map((c) => `${c.rank}-${c.suit}`))
    const rest: SerializedCard[] = []
    for (const suit of ALL_SUITS) {
      for (const rank of RANKS) {
        if (!used.has(`${rank}-${suit}`)) rest.push(card(rank, suit, true))
      }
    }
    snapshot.tableau[0] = rest

    const engine = new GameEngine()
    expect(engine.restore(snapshot)).toBe(true)

    engine.draw()
    engine.draw()
    engine.draw()
    expect(engine.stock.isEmpty).toBe(true)
    expect(engine.waste.length).toBe(3)
    const beforeRecycle = engine.waste.getCards().map((c) => `${c.rank}-${c.suit}`)

    const movesBefore = engine.movesCount
    engine.draw() // stock empty → RecycleMove flips the waste back over

    expect(engine.waste.isEmpty).toBe(true)
    expect(engine.stock.length).toBe(3)
    expect(engine.stock.getCards().every((c) => !c.faceUp)).toBe(true)
    expect(engine.movesCount).toBe(movesBefore + 1)

    // Drawing through again yields exactly the same three cards.
    engine.draw()
    engine.draw()
    engine.draw()
    const afterRecycle = engine.waste.getCards().map((c) => `${c.rank}-${c.suit}`)
    expect([...afterRecycle].sort()).toEqual([...beforeRecycle].sort())
  })

  it('moves a run between columns to uncover a face-down card', () => {
    const snapshot = emptySnapshot()
    // Column 0: a face-down Ace of Spades trapped under a red Two.
    snapshot.tableau[0] = [card('A', Suit.Spades, false), card('2', Suit.Diamonds, true)]
    // Column 1: a black Three the red Two can legally sit on.
    snapshot.tableau[1] = [card('3', Suit.Clubs, true)]

    const used = new Set([`A-${Suit.Spades}`, `2-${Suit.Diamonds}`, `3-${Suit.Clubs}`])
    const rest: SerializedCard[] = []
    for (const suit of ALL_SUITS) {
      for (const rank of RANKS) {
        if (!used.has(`${rank}-${suit}`)) rest.push(card(rank, suit, true))
      }
    }
    snapshot.tableau[2] = rest

    const engine = new GameEngine()
    expect(engine.restore(snapshot)).toBe(true)

    const twoOfDiamonds = engine.tableau[0].top!
    expect(twoOfDiamonds.rank).toBe('2')
    expect(engine.tableau[0].getCards()[0].faceUp).toBe(false) // Ace still hidden

    expect(engine.moveCard(twoOfDiamonds, 'tableau-1')).toBe(true)

    // The Two moved onto the Three, and the Ace it was covering flipped up.
    expect(engine.tableau[1].getCards().map((c) => c.rank)).toEqual(['3', '2'])
    const revealed = engine.tableau[0].top!
    expect(revealed.rank).toBe('A')
    expect(revealed.suit).toBe(Suit.Spades)
    expect(revealed.faceUp).toBe(true)

    // Which now opens a path to the foundation.
    expect(engine.sendToFoundation(revealed)).toBe(true)
    expect(engine.foundations.some((f) => f.top?.rank === 'A' && f.top.suit === Suit.Spades)).toBe(true)
  })

  it('never lets a greedy playthrough throw, whatever the shuffle', () => {
    // A handful of deterministic shuffles: the solver must always either
    // win or run out of safe moves cleanly — never crash, never loop.
    for (let seed = 1; seed <= 25; seed++) {
      const engine = new GameEngine(mulberry32(seed))
      const log = playGreedily(engine, 2000)
      expect(log.iterations).toBeLessThan(2000)
      const foundationCards = engine.foundations.reduce((n, f) => n + f.length, 0)
      expect(foundationCards).toBeGreaterThanOrEqual(0)
      expect(foundationCards).toBeLessThanOrEqual(52)
      if (log.won) expect(engine.isWon()).toBe(true)
    }
  })
})

/** Small deterministic PRNG so a "random" shuffle is reproducible. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
