import { MotionConfig } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Card } from '../domain/Card'
import { TABLEAU_COLUMNS } from '../domain/GameEngine'
import { useBackgroundPreference } from '../hooks/useBackgroundPreference'
import { useColumnGap } from '../hooks/useColumnGap'
import { useGameEngine } from '../hooks/useGameEngine'
import { useIsNarrowViewport } from '../hooks/useIsNarrowViewport'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useShortViewport } from '../hooks/useShortViewport'
import { DRAW_FLIP_MS } from '../lib/animation'
import { BACKGROUND_GRADIENTS } from '../lib/backgrounds'
import { DropRegistryProvider } from '../lib/DropRegistryContext'
import {
  EMPTY_LAST_MOVE,
  LastMoveContext,
  type FlipOffset,
  type LastMove,
} from '../lib/LastMoveContext'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'
import { ReducedMotionContext } from '../lib/MotionPrefContext'
import { motionPreference } from '../lib/preferences'
import { playSound } from '../lib/sound'
import { tableauOffsets } from '../lib/tableauLayout'
import { usePreference } from '../hooks/usePreference'
import { FoundationSlotView } from './FoundationSlotView'
import { ResponsiveStage } from './ResponsiveStage'
import { StockPileView } from './StockPileView'
import { TableauColumnView } from './TableauColumnView'
import { Toolbar } from './Toolbar'
import { WastePileView } from './WastePileView'
import { WinOverlay } from './WinOverlay'

const FOUNDATION_COUNT = 4
// The foundations sit directly above the rightmost `FOUNDATION_COUNT`
// tableau columns, rather than a separately right-anchored group — that's
// what makes them land in the same columns as the piles beneath them.
const FOUNDATION_START_COLUMN = TABLEAU_COLUMNS - FOUNDATION_COUNT
// Vertical band the tableau fans into, below the top row. Columns squeeze
// their card overlap to stay within it rather than growing past the board
// and being clipped. Short on a landscape phone (board height is what caps
// the card size there) and roomy everywhere with vertical space to spare.
const TABLEAU_FAN_HEIGHT_ROOMY = 460
const TABLEAU_FAN_HEIGHT_SHORT = 288
const DEAL_STEP_MS = 55

interface WinInfo {
  movesMade: number
  elapsedMs: number
}

/**
 * Top-level game screen. Owns only UI-transient state (the win banner, a
 * counter to restart the deal-in animation) — every rule about whether a
 * move is legal lives in `GameEngine`.
 */
export function Board() {
  const engine = useGameEngine()
  const [dealGeneration, setDealGeneration] = useState(0)
  const [winInfo, setWinInfo] = useState<WinInfo | null>(null)
  const [justDrawnId, setJustDrawnId] = useState<string | null>(null)
  // Everything the cards animate off of after the most recent mutation —
  // moved run, refused card, per-card entry vectors. One object so the
  // provider is one line; updated slice-by-slice from the handlers below.
  const [lastMove, setLastMove] = useState<LastMove>(EMPTY_LAST_MOVE)
  // Where a dragged card sits relative to its slot at the moment of drop,
  // stashed by `handleDragEnd` so `runMutation` can start that card's
  // glide home from the cursor rather than from its old slot.
  const dragOffset = useRef<{ x: number; y: number } | null>(null)
  // Whether a real drag (past the movement threshold) is currently under
  // way — set on drag start, cleared on drop or cancel — purely so the
  // piles that could ever be a destination can show a hint outline. This
  // deliberately doesn't distinguish which card is being dragged: the
  // hint is a "here are the kinds of places you can drop a card" map, the
  // same every time, not a computed answer for this specific card (that
  // would just tell the player where the correct move is).
  const [isDragging, setIsDragging] = useState(false)
  const background = useBackgroundPreference()
  const columnGap = useColumnGap()
  const shortViewport = useShortViewport()
  const narrowViewport = useIsNarrowViewport()
  const reducedMotion = useReducedMotion()
  const motionSetting = usePreference(motionPreference)

  // A short viewport gets a tighter top-row gap and a much shorter tableau
  // band, so the whole board scales down less on a landscape phone.
  const tableauTop = CARD_HEIGHT + (shortViewport ? 18 : 28)
  const tableauFanHeight = shortViewport ? TABLEAU_FAN_HEIGHT_SHORT : TABLEAU_FAN_HEIGHT_ROOMY
  const stageHeight = tableauTop + tableauFanHeight

  // Every column-like slot (tableau, foundations) sits on the same
  // left-to-right grid, one card-width-plus-gap apart, so a slot at
  // tableau index `i` and a foundation meant to sit "above" it always
  // share an x position exactly — no separately-tuned offset to drift out
  // of sync. The gap tightens below the `sm` breakpoint, so this geometry
  // is per-render rather than module scope.
  const columnStride = CARD_WIDTH + columnGap
  const columnLeft = (index: number) => index * columnStride
  const stageWidth = columnLeft(TABLEAU_COLUMNS - 1) + CARD_WIDTH
  const foundationLeft = (index: number) => columnLeft(FOUNDATION_START_COLUMN + index)

  const rejectCard = useCallback((cardId: string) => {
    setLastMove((prev) => ({
      ...prev,
      rejected: { cardId, nonce: (prev.rejected?.nonce ?? 0) + 1 },
    }))
  }, [])

  // The resting board-space (x, y) and owning pile of every card, computed
  // straight from the same geometry the piles render with — no DOM
  // measuring, so it's immune to the stage's `scale()` transform.
  // `runMutation` diffs this before and after a mutation to know how far
  // each card should glide, from where, and whether it actually changed
  // piles (vs. just shifted because its column's fan re-flowed).
  const cardLayout = useCallback((): Map<string, { x: number; y: number; pile: string }> => {
    const stride = CARD_WIDTH + columnGap
    const colX = (i: number) => i * stride
    const layout = new Map<string, { x: number; y: number; pile: string }>()
    for (const c of engine.stock.getCards()) layout.set(c.id, { x: 0, y: 0, pile: 'stock' })
    for (const c of engine.waste.getCards()) layout.set(c.id, { x: stride, y: 0, pile: 'waste' })
    engine.foundations.forEach((f, i) => {
      for (const c of f.getCards()) {
        layout.set(c.id, { x: colX(FOUNDATION_START_COLUMN + i), y: 0, pile: f.id })
      }
    })
    engine.tableau.forEach((column, ci) => {
      const cards = column.getCards()
      const offsets = tableauOffsets(
        cards.map((c) => c.faceUp),
        tableauFanHeight,
      )
      cards.forEach((c, idx) => {
        layout.set(c.id, { x: colX(ci), y: tableauTop + offsets[idx], pile: column.id })
      })
    })
    return layout
  }, [engine, columnGap, tableauTop, tableauFanHeight])

  const foundationTotal = useCallback(
    () => engine.foundations.reduce((n, f) => n + f.length, 0),
    [engine],
  )

  // Runs an engine mutation and captures how every card that moved should
  // animate into place: `from - to` in board space, plus the drop cursor
  // offset for a card that was being dragged. Returns a small summary for
  // the caller's sound cue.
  const runMutation = useCallback(
    (apply: () => void) => {
      const foundationsBefore = foundationTotal()
      const before = cardLayout()
      apply()
      const after = cardLayout()
      const carried = dragOffset.current
      dragOffset.current = null
      const next = new Map<string, FlipOffset>()
      after.forEach((to, id) => {
        const from = before.get(id)
        if (!from) return
        // The drop-cursor offset only belongs to cards that actually
        // changed piles — not to a neighbour that merely shifted because
        // its column's fan re-flowed (e.g. the card left behind on the
        // waste when its top card is dragged off).
        const relocated = carried != null && from.pile !== to.pile
        const dx = from.x - to.x + (relocated ? carried.x : 0)
        const dy = from.y - to.y + (relocated ? carried.y : 0)
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          next.set(id, relocated ? { dx, dy, dragged: true } : { dx, dy })
        }
      })
      setLastMove((prev) => ({ ...prev, flipOffsets: next }))
      return {
        moved: next.size > 0,
        toFoundation: foundationTotal() > foundationsBefore,
        foundationsBefore,
      }
    },
    [cardLayout, foundationTotal],
  )

  // The "it landed" sound for a tap/drag move.
  const playMoveSound = useCallback((r: ReturnType<typeof runMutation>) => {
    if (r.toFoundation) playSound('foundation', r.foundationsBefore)
    else if (r.moved) playSound('drop')
  }, [])

  useEffect(
    () =>
      engine.on('won', (payload) => {
        setWinInfo(payload)
        playSound('win')
      }),
    [engine],
  )
  useEffect(
    () => engine.on('moved', ({ cardIds }) => setLastMove((prev) => ({ ...prev, movedRunIds: cardIds }))),
    [engine],
  )
  useEffect(
    () =>
      engine.on('invalidMove', ({ cardId }) => {
        rejectCard(cardId)
        playSound('invalid')
      }),
    [engine, rejectCard],
  )

  // `justDrawnId` marks the one card mid draw-reveal — it drives the
  // stock → waste turn-over and, while set, keeps that card out of the
  // shared-layout system so the two don't fight. Clear it once the flip
  // has run so the card animates normally on its next move.
  useEffect(() => {
    let timer = 0
    const off = engine.on('drawn', ({ cardId }) => {
      setJustDrawnId(cardId)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        setJustDrawnId((current) => (current === cardId ? null : current))
      }, DRAW_FLIP_MS + 50)
    })
    return () => {
      window.clearTimeout(timer)
      off()
    }
  }, [engine])

  // Drives the cascading deal-in animation: pop one card off the queue at
  // a time so each glides in from the stock via the flip-offset system.
  useEffect(() => {
    let cancelled = false
    const step = () => {
      if (cancelled) return
      let dealtOne = false
      runMutation(() => {
        dealtOne = engine.dealNext()
      })
      if (dealtOne) {
        playSound('deal')
        window.setTimeout(step, DEAL_STEP_MS)
      }
    }
    step()
    return () => {
      cancelled = true
    }
  }, [engine, dealGeneration, runMutation])

  const handleDrop = useCallback(
    (card: Card, destinationId: string) => {
      let moved = false
      const r = runMutation(() => {
        moved = engine.moveCard(card, destinationId)
      })
      playMoveSound(r)
      return moved
    },
    [engine, runMutation, playMoveSound],
  )

  // A plain click/tap: hand the card to the engine, which sends it (plus
  // any run resting on it) to its best legal spot — foundation first, then
  // a tableau column. There's no "selected" middle state any more.
  const handleClickMove = useCallback(
    (card: Card) => {
      playMoveSound(runMutation(() => engine.autoMove(card)))
    },
    [engine, runMutation, playMoveSound],
  )

  const handleActivate = useCallback(
    (card: Card) => {
      const r = runMutation(() => {
        if (!engine.sendToFoundation(card)) rejectCard(card.id)
      })
      playMoveSound(r)
    },
    [engine, runMutation, rejectCard, playMoveSound],
  )

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    playSound('pickup')
  }, [])

  const handleDragEnd = useCallback((offset: { x: number; y: number } | null) => {
    setIsDragging(false)
    dragOffset.current = offset
  }, [])

  // Every pile that ever calls this (foundations and tableau columns —
  // waste and stock never do, since neither can ever accept a drop)
  // shows the same hint outline for the whole duration of any drag.
  const isDropTarget = useCallback(() => isDragging, [isDragging])

  const handleNewGame = useCallback(() => {
    engine.startNewGame()
    setWinInfo(null)
    setDealGeneration((g) => g + 1)
    playSound('shuffle')
  }, [engine])

  const handleDraw = useCallback(() => {
    const recycling = engine.stock.isEmpty
    runMutation(() => engine.draw())
    playSound(recycling ? 'shuffle' : 'draw')
  }, [engine, runMutation])

  const handleAutoComplete = useCallback(() => {
    const tick = () => {
      const r = runMutation(() => engine.autoCompleteStep())
      if (r.moved) {
        playSound('foundation', r.foundationsBefore)
        window.setTimeout(tick, 90)
      }
    }
    tick()
  }, [engine, runMutation])

  return (
    <MotionConfig
      reducedMotion={
        motionSetting === 'reduced' ? 'always' : motionSetting === 'full' ? 'never' : 'user'
      }
    >
    <DropRegistryProvider>
      <ReducedMotionContext.Provider value={reducedMotion}>
      <LastMoveContext.Provider value={lastMove}>
        <div
          className={`flex h-dvh w-full flex-col items-center overflow-hidden bg-gradient-to-b ${BACKGROUND_GRADIENTS[background]}`}
        >
          <Toolbar
            movesCount={engine.movesCount}
            startedAtMs={engine.startedAtMs}
            won={Boolean(winInfo)}
            canUndo={engine.canUndo}
            canAutoComplete={engine.canAutoComplete()}
            dense={shortViewport || narrowViewport}
            onNewGame={handleNewGame}
            onUndo={() => runMutation(() => engine.undo())}
            onAutoComplete={handleAutoComplete}
          />

          <div className="flex min-h-0 w-full flex-1">
            <ResponsiveStage baseWidth={stageWidth} baseHeight={stageHeight}>
              <div className="relative" style={{ width: stageWidth, height: stageHeight }}>
                {engine.foundations.map((foundation, index) => (
                  <div
                    key={foundation.id}
                    className="absolute top-0"
                    style={{ left: foundationLeft(index) }}
                  >
                    <FoundationSlotView
                      pile={foundation}
                      onDrop={handleDrop}
                      onClickMove={handleClickMove}
                      onActivate={handleActivate}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDropTarget={isDropTarget}
                    />
                  </div>
                ))}

                <div className="absolute left-0 flex" style={{ top: tableauTop, gap: columnGap }}>
                  {engine.tableau.map((column) => (
                    <TableauColumnView
                      key={column.id}
                      pile={column}
                      maxHeight={tableauFanHeight}
                      onDrop={handleDrop}
                      onClickMove={handleClickMove}
                      onActivate={handleActivate}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDropTarget={isDropTarget}
                    />
                  ))}
                </div>

                {/* Stock + waste in the top-left corner — the classic
                    Klondike spot, with the foundations filling the
                    columns to their right. */}
                <div className="absolute left-0 top-0 flex" style={{ gap: columnGap }}>
                  <StockPileView pile={engine.stock} onDraw={handleDraw} />
                  <WastePileView
                    pile={engine.waste}
                    justDrawnId={justDrawnId}
                    onDrop={handleDrop}
                    onClickMove={handleClickMove}
                    onActivate={handleActivate}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDropTarget={isDropTarget}
                  />
                </div>
              </div>
            </ResponsiveStage>
          </div>

          <div className={shortViewport ? 'pb-1' : 'pb-2 sm:pb-6'} />
        </div>

        <WinOverlay
          visible={Boolean(winInfo)}
          movesCount={winInfo?.movesMade ?? 0}
          elapsedMs={winInfo?.elapsedMs ?? 0}
          onNewGame={handleNewGame}
        />
      </LastMoveContext.Provider>
      </ReducedMotionContext.Provider>
    </DropRegistryProvider>
    </MotionConfig>
  )
}
