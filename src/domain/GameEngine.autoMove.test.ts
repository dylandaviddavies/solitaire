import { describe, expect, it } from 'vitest'
import { RANKS, Suit } from './Card'
import { GameEngine } from './GameEngine'
import type { GameSnapshot, SerializedCard } from './GameEngine'
import { ALL_SUITS, card, emptySnapshot } from './GameEngine.testFixtures'

/**
 * Drops every card not already placed somewhere in `snapshot` into tableau
 * column 6, so `GameEngine.restore` sees a complete, distinct 52-card deck.
 * Tests only ever act on columns 0–5, the waste and the foundations.
 */
function withCompleteDeck(snapshot: GameSnapshot): GameSnapshot {
  const used = new Set<string>()
  const mark = (c: SerializedCard) => used.add(`${c.rank}-${c.suit}`)
  snapshot.stock.forEach(mark)
  snapshot.waste.forEach(mark)
  snapshot.foundations.forEach((pile) => pile.forEach(mark))
  snapshot.tableau.forEach((pile) => pile.forEach(mark))

  const rest: SerializedCard[] = []
  for (const suit of ALL_SUITS) {
    for (const rank of RANKS) {
      if (!used.has(`${rank}-${suit}`)) rest.push(card(rank, suit, true))
    }
  }
  snapshot.tableau[6] = rest
  return snapshot
}

function restored(build: (snapshot: GameSnapshot) => void): GameEngine {
  const snapshot = emptySnapshot()
  build(snapshot)
  const engine = new GameEngine()
  expect(engine.restore(withCompleteDeck(snapshot))).toBe(true)
  return engine
}

describe('GameEngine.autoMove — click/tap-to-move', () => {
  it('sends a lone card straight to a foundation when it fits', () => {
    const engine = restored((s) => {
      s.waste = [card('A', Suit.Spades, true)]
    })
    const ace = engine.waste.top!

    expect(engine.autoMove(ace)).toBe(true)
    expect(engine.waste.isEmpty).toBe(true)
    expect(engine.foundations.some((f) => f.top === ace)).toBe(true)
  })

  it('prefers a foundation over an otherwise-legal tableau landing spot', () => {
    const engine = restored((s) => {
      s.waste = [card('A', Suit.Spades, true)]
      // A black Ace could legally sit on this red Two...
      s.tableau[0] = [card('2', Suit.Hearts, true)]
    })
    const ace = engine.waste.top!

    expect(engine.autoMove(ace)).toBe(true)
    // ...but the foundation wins.
    expect(engine.foundations.some((f) => f.top === ace)).toBe(true)
    expect(engine.tableau[0].length).toBe(1)
  })

  it('moves a card onto a tableau column when no foundation will take it', () => {
    const engine = restored((s) => {
      s.waste = [card('6', Suit.Hearts, true)]
      s.tableau[0] = [card('7', Suit.Spades, true)]
    })
    const six = engine.waste.top!

    expect(engine.autoMove(six)).toBe(true)
    expect(engine.tableau[0].getCards().map((c) => c.rank)).toEqual(['7', '6'])
  })

  it('carries a whole tableau run to another column and flips the card it uncovers', () => {
    const engine = restored((s) => {
      s.tableau[0] = [
        card('A', Suit.Diamonds, false),
        card('9', Suit.Spades, true),
        card('8', Suit.Hearts, true),
      ]
      s.tableau[1] = [card('10', Suit.Hearts, true)]
    })
    const nine = engine.tableau[0].getCards()[1]

    expect(engine.autoMove(nine)).toBe(true)
    expect(engine.tableau[1].getCards().map((c) => c.rank)).toEqual(['10', '9', '8'])
    const uncovered = engine.tableau[0].top!
    expect(uncovered.rank).toBe('A')
    expect(uncovered.faceUp).toBe(true)
  })

  it('never sends a multi-card run to a foundation', () => {
    const engine = restored((s) => {
      // Hearts foundation is sitting on the Ace, ready for the Two...
      s.foundations[0] = [card('A', Suit.Hearts, true)]
      // ...but the Two is the head of a liftable run.
      s.tableau[0] = [card('2', Suit.Hearts, true), card('A', Suit.Spades, true)]
      s.tableau[1] = [card('3', Suit.Spades, true)]
    })
    const two = engine.tableau[0].getCards()[0]

    expect(engine.autoMove(two)).toBe(true)
    expect(engine.tableau[1].getCards().map((c) => c.rank)).toEqual(['3', '2', 'A'])
    expect(engine.foundations[0].getCards().map((c) => c.rank)).toEqual(['A'])
  })

  it('moves a King with no other option to an empty column', () => {
    const engine = restored((s) => {
      s.tableau[0] = [card('5', Suit.Hearts, false), card('K', Suit.Spades, true)]
    })
    const king = engine.tableau[0].top!

    expect(engine.autoMove(king)).toBe(true)
    expect(engine.tableau[0].top!.rank).toBe('5')
    expect(engine.tableau[0].top!.faceUp).toBe(true)
    expect(engine.tableau.some((t, i) => i !== 0 && t.getCards().includes(king))).toBe(true)
  })

  it('leaves a King that is already alone at the base of a column where it is', () => {
    const engine = restored((s) => {
      s.tableau[0] = [card('K', Suit.Spades, true)]
    })
    const king = engine.tableau[0].top!
    let invalidMoves = 0
    engine.on('invalidMove', () => {
      invalidMoves++
    })

    expect(engine.autoMove(king)).toBe(false)
    expect(engine.tableau[0].getCards()).toEqual([king])
    expect(invalidMoves).toBe(1)
  })

  it('reports an invalid move when the card has nowhere legal to go', () => {
    const engine = restored((s) => {
      s.waste = [card('9', Suit.Hearts, true)]
      s.tableau[0] = [card('4', Suit.Clubs, true)]
    })
    const nine = engine.waste.top!
    let reported = 0
    engine.on('invalidMove', ({ cardId }) => {
      if (cardId === nine.id) reported++
    })

    expect(engine.autoMove(nine)).toBe(false)
    expect(engine.waste.top).toBe(nine)
    expect(reported).toBe(1)
  })

  it('does nothing for a buried tableau card that cannot be lifted as a run', () => {
    const engine = restored((s) => {
      // 4♦ is trapped under a non-sequential card, so the run is invalid.
      s.tableau[0] = [card('4', Suit.Diamonds, true), card('9', Suit.Clubs, true)]
    })
    const buried = engine.tableau[0].getCards()[0]

    expect(engine.autoMove(buried)).toBe(false)
    expect(engine.tableau[0].getCards().map((c) => c.rank)).toEqual(['4', '9'])
  })

  it('ignores a click on a card already home on a foundation', () => {
    const engine = restored((s) => {
      s.foundations[3] = [card('A', Suit.Spades, true), card('2', Suit.Spades, true)]
      // The 2♠ could legally sit on this red 3...
      s.tableau[0] = [card('3', Suit.Hearts, true)]
    })
    const two = engine.foundations[3].top!

    expect(engine.autoMove(two)).toBe(false)
    expect(engine.foundations[3].top).toBe(two)
  })

  it('is undoable like any other move', () => {
    const engine = restored((s) => {
      s.waste = [card('A', Suit.Hearts, true)]
    })
    const ace = engine.waste.top!

    engine.autoMove(ace)
    expect(engine.waste.isEmpty).toBe(true)

    engine.undo()
    expect(engine.waste.top).toBe(ace)
    expect(engine.foundations.every((f) => f.isEmpty)).toBe(true)
  })
})
