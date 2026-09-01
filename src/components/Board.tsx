import { useCallback, useEffect, useState } from 'react'
import type { Card } from '../domain/Card'
import { TABLEAU_COLUMNS } from '../domain/GameEngine'
import { useBackgroundPreference } from '../hooks/useBackgroundPreference'
import { useColumnGap } from '../hooks/useColumnGap'
import { useGameEngine } from '../hooks/useGameEngine'
import { useShortViewport } from '../hooks/useShortViewport'
import { BACKGROUND_GRADIENTS } from '../lib/backgrounds'
import { DropRegistryProvider } from '../lib/DropRegistryContext'
import { CARD_HEIGHT, CARD_WIDTH, DRAW_FLIP_MS } from '../lib/layout'
import { RecentMovesContext } from '../lib/RecentMovesContext'
import { RejectedMoveContext, type RejectedMove } from '../lib/RejectedMoveContext'
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
  // Cards relocated by the most recent move, in run order — the run head
  // sparkles as it lands, via RecentMovesContext.
  const [justMovedIds, setJustMovedIds] = useState<readonly string[]>([])
  // The card whose last move the engine turned down (a tap/auto-move with
  // nowhere to go). Nonce-bumped so shaking the same card twice replays.
  const [rejected, setRejected] = useState<RejectedMove | null>(null)
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
    setRejected((prev) => ({ cardId, nonce: (prev?.nonce ?? 0) + 1 }))
  }, [])

  useEffect(() => engine.on('won', (payload) => setWinInfo(payload)), [engine])
  useEffect(() => engine.on('moved', ({ cardIds }) => setJustMovedIds(cardIds)), [engine])
  useEffect(() => engine.on('invalidMove', ({ cardId }) => rejectCard(cardId)), [engine, rejectCard])

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
  // a time so each lands with its own spring via the card's layoutId.
  useEffect(() => {
    let cancelled = false
    const step = () => {
      if (cancelled) return
      if (engine.dealNext()) {
        window.setTimeout(step, DEAL_STEP_MS)
      }
    }
    step()
    return () => {
      cancelled = true
    }
  }, [engine, dealGeneration])

  const handleDrop = useCallback(
    (card: Card, destinationId: string) => engine.moveCard(card, destinationId),
    [engine],
  )

  // A plain click/tap: hand the card to the engine, which sends it (plus
  // any run resting on it) to its best legal spot — foundation first, then
  // a tableau column. There's no "selected" middle state any more.
  //
  // Deferred a frame so the pointer-up render that re-enables Motion
  // `layout` on the tapped card (it's suppressed while pressed) commits
  // first — Motion then has the card's resting position registered and can
  // glide it to the destination via `layoutId` instead of snapping.
  const handleClickMove = useCallback(
    (card: Card) => {
      requestAnimationFrame(() => engine.autoMove(card))
    },
    [engine],
  )

  const handleActivate = useCallback(
    (card: Card) => {
      if (!engine.sendToFoundation(card)) rejectCard(card.id)
    },
    [engine, rejectCard],
  )

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Every pile that ever calls this (foundations and tableau columns —
  // waste and stock never do, since neither can ever accept a drop)
  // shows the same hint outline for the whole duration of any drag.
  const isDropTarget = useCallback(() => isDragging, [isDragging])

  const handleNewGame = useCallback(() => {
    engine.startNewGame()
    setWinInfo(null)
    setDealGeneration((g) => g + 1)
  }, [engine])

  const handleAutoComplete = useCallback(() => {
    const tick = () => {
      if (engine.autoCompleteStep()) {
        window.setTimeout(tick, 90)
      }
    }
    tick()
  }, [engine])

  return (
    <DropRegistryProvider>
      <RecentMovesContext.Provider value={justMovedIds}>
      <RejectedMoveContext.Provider value={rejected}>
        <div
          className={`flex h-dvh w-full flex-col items-center overflow-hidden bg-gradient-to-b ${BACKGROUND_GRADIENTS[background]}`}
        >
          <Toolbar
            movesCount={engine.movesCount}
            startedAtMs={engine.startedAtMs}
            won={Boolean(winInfo)}
            canUndo={engine.canUndo}
            canAutoComplete={engine.canAutoComplete()}
            onNewGame={handleNewGame}
            onUndo={() => engine.undo()}
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
                  <StockPileView pile={engine.stock} onDraw={() => engine.draw()} />
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

          <div className="pb-2 sm:pb-6" />
        </div>

        <WinOverlay
          visible={Boolean(winInfo)}
          movesCount={winInfo?.movesMade ?? 0}
          elapsedMs={winInfo?.elapsedMs ?? 0}
          onNewGame={handleNewGame}
        />
      </RejectedMoveContext.Provider>
      </RecentMovesContext.Provider>
    </DropRegistryProvider>
  )
}
