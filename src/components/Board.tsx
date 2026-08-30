import { useCallback, useEffect, useState } from 'react'
import type { Card } from '../domain/Card'
import { TABLEAU_COLUMNS } from '../domain/GameEngine'
import { useGameEngine } from '../hooks/useGameEngine'
import { useIsMobileLayout } from '../hooks/useIsMobileLayout'
import { DropRegistryProvider } from '../lib/DropRegistryContext'
import { CARD_HEIGHT, CARD_WIDTH } from '../lib/layout'
import type { SelectedCard } from '../lib/types'
import { FoundationSlotView } from './FoundationSlotView'
import { ResponsiveStage } from './ResponsiveStage'
import { StockPileView } from './StockPileView'
import { TableauColumnView } from './TableauColumnView'
import { Toolbar } from './Toolbar'
import { WastePileView } from './WastePileView'
import { WinOverlay } from './WinOverlay'

const FOUNDATION_COUNT = 4
const COLUMN_GAP = 20
// Every column-like slot (tableau, foundations) sits on the same
// left-to-right grid, one card-width-plus-gap apart, so a slot at tableau
// index `i` and a foundation meant to sit "above" it always share an x
// position exactly — no separately-tuned offset to drift out of sync.
const COLUMN_STRIDE = CARD_WIDTH + COLUMN_GAP
const columnLeft = (index: number) => index * COLUMN_STRIDE
const STAGE_WIDTH = columnLeft(TABLEAU_COLUMNS - 1) + CARD_WIDTH
// The foundations sit directly above the rightmost `FOUNDATION_COUNT`
// tableau columns, rather than a separately right-anchored group — that's
// what makes them land in the same columns as the piles beneath them.
const FOUNDATION_START_COLUMN = TABLEAU_COLUMNS - FOUNDATION_COUNT
const TABLEAU_TOP = CARD_HEIGHT + 32
const TABLEAU_GROWTH_BUDGET = 460
// On mobile, the stock/waste pair gets its own row at the very bottom of
// the board instead of sitting up top with the foundations — on a phone
// the whole board is one uniformly-scaled rectangle centered in the
// viewport, so "bottom of the board" reliably lands near "bottom of the
// screen" (the easiest area to reach one-handed) instead of the top
// corner. Desktop has no such reach constraint, so it keeps the classic
// top-left placement instead of paying for an extra reserved row.
const BOTTOM_ROW_HEIGHT = CARD_HEIGHT + 32
const STOCK_WASTE_WIDTH = CARD_WIDTH * 2 + COLUMN_GAP
const DEAL_STEP_MS = 55

interface WinInfo {
  movesMade: number
  elapsedMs: number
}

/**
 * Top-level game screen. Owns only UI-transient state (the current
 * selection, the win banner, a counter to restart the deal-in animation)
 * — every rule about whether a move is legal lives in `GameEngine`.
 */
export function Board() {
  const engine = useGameEngine()
  const [selected, setSelected] = useState<SelectedCard | null>(null)
  const [dealGeneration, setDealGeneration] = useState(0)
  const [winInfo, setWinInfo] = useState<WinInfo | null>(null)
  const [justDrawnId, setJustDrawnId] = useState<string | null>(null)
  // Whether a real drag (past the movement threshold) is currently under
  // way — set on drag start, cleared on drop or cancel — purely so the
  // piles that could ever be a destination can show a hint outline. This
  // deliberately doesn't distinguish which card is being dragged: the
  // hint is a "here are the kinds of places you can drop a card" map, the
  // same every time, not a computed answer for this specific card (that
  // would just tell the player where the correct move is). It's also
  // separate from `selected` (tap-to-move), which has its own lifecycle.
  const [isDragging, setIsDragging] = useState(false)
  const isMobileLayout = useIsMobileLayout()

  // These depend on `isMobileLayout`, so they're computed per render
  // rather than hoisted to module scope like the pure geometry constants
  // above.
  const stageHeight = TABLEAU_TOP + TABLEAU_GROWTH_BUDGET + (isMobileLayout ? BOTTOM_ROW_HEIGHT : 0)
  const stockWasteTop = isMobileLayout ? stageHeight - CARD_HEIGHT : 0
  const stockWasteLeft = isMobileLayout ? (STAGE_WIDTH - STOCK_WASTE_WIDTH) / 2 : columnLeft(0)

  useEffect(() => engine.on('won', (payload) => setWinInfo(payload)), [engine])
  useEffect(() => engine.on('drawn', ({ cardId }) => setJustDrawnId(cardId)), [engine])

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
    (card: Card, destinationId: string) => {
      const moved = engine.moveCard(card, destinationId)
      if (moved) setSelected(null)
      return moved
    },
    [engine],
  )

  const handleSelect = useCallback(
    (card: Card, pileId: string) => {
      setSelected((current) => {
        if (current?.card === card) return null
        if (current) {
          engine.moveCard(current.card, pileId)
          return null
        }
        return engine.findPile(pileId)?.canLift(card) ? { card, pileId } : current
      })
    },
    [engine],
  )

  const handleActivate = useCallback(
    (card: Card) => {
      engine.sendToFoundation(card)
      setSelected((current) => (current?.card === card ? null : current))
    },
    [engine],
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
    setSelected(null)
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
      <div className="flex h-dvh w-full flex-col items-center overflow-hidden bg-gradient-to-b from-slate-950 via-[#0b1224] to-[#111c3a]">
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
          <ResponsiveStage baseWidth={STAGE_WIDTH} baseHeight={stageHeight}>
            <div className="relative" style={{ width: STAGE_WIDTH, height: stageHeight }}>
              {engine.foundations.map((foundation, index) => (
                <div
                  key={foundation.id}
                  className="absolute top-0"
                  style={{ left: columnLeft(FOUNDATION_START_COLUMN + index) }}
                >
                  <FoundationSlotView
                    pile={foundation}
                    selected={selected}
                    onDrop={handleDrop}
                    onSelect={handleSelect}
                    onActivate={handleActivate}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDropTarget={isDropTarget}
                  />
                </div>
              ))}

              <div className="absolute left-0 flex" style={{ top: TABLEAU_TOP, gap: COLUMN_GAP }}>
                {engine.tableau.map((column) => (
                  <TableauColumnView
                    key={column.id}
                    pile={column}
                    selected={selected}
                    onDrop={handleDrop}
                    onSelect={handleSelect}
                    onActivate={handleActivate}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDropTarget={isDropTarget}
                  />
                ))}
              </div>

              <div className="absolute flex" style={{ left: stockWasteLeft, top: stockWasteTop, gap: COLUMN_GAP }}>
                <StockPileView pile={engine.stock} onDraw={() => engine.draw()} />
                <WastePileView
                  pile={engine.waste}
                  selected={selected}
                  justDrawnId={justDrawnId}
                  onDrop={handleDrop}
                  onSelect={handleSelect}
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
    </DropRegistryProvider>
  )
}
