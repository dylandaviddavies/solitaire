import { useCallback, useEffect, useState } from 'react'
import type { Card } from '../domain/Card'
import { useGameEngine } from '../hooks/useGameEngine'
import { DropRegistryProvider } from '../lib/DropRegistryContext'
import { CARD_HEIGHT } from '../lib/layout'
import type { SelectedCard } from '../lib/types'
import { FoundationSlotView } from './FoundationSlotView'
import { ResponsiveStage } from './ResponsiveStage'
import { StockPileView } from './StockPileView'
import { TableauColumnView } from './TableauColumnView'
import { Toolbar } from './Toolbar'
import { WastePileView } from './WastePileView'
import { WinOverlay } from './WinOverlay'

const STAGE_WIDTH = 900
const STAGE_HEIGHT = 640
const COLUMN_GAP = 20
const TABLEAU_TOP = CARD_HEIGHT + 32
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
      <div className="flex min-h-screen w-full flex-col items-center bg-gradient-to-b from-slate-950 via-[#0b1224] to-[#111c3a]">
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

        <ResponsiveStage baseWidth={STAGE_WIDTH} baseHeight={STAGE_HEIGHT}>
          <div className="relative" style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
            <div className="absolute left-0 top-0 flex" style={{ gap: COLUMN_GAP }}>
              <StockPileView pile={engine.stock} onDraw={() => engine.draw()} />
              <WastePileView
                pile={engine.waste}
                selected={selected}
                justDrawnId={justDrawnId}
                onDrop={handleDrop}
                onSelect={handleSelect}
                onActivate={handleActivate}
              />
            </div>

            <div className="absolute right-0 top-0 flex" style={{ gap: COLUMN_GAP }}>
              {engine.foundations.map((foundation) => (
                <FoundationSlotView
                  key={foundation.id}
                  pile={foundation}
                  selected={selected}
                  onDrop={handleDrop}
                  onSelect={handleSelect}
                  onActivate={handleActivate}
                />
              ))}
            </div>

            <div className="absolute left-0 flex" style={{ top: TABLEAU_TOP, gap: COLUMN_GAP }}>
              {engine.tableau.map((column) => (
                <TableauColumnView
                  key={column.id}
                  pile={column}
                  selected={selected}
                  onDrop={handleDrop}
                  onSelect={handleSelect}
                  onActivate={handleActivate}
                />
              ))}
            </div>
          </div>
        </ResponsiveStage>

        <p className="pb-6 text-center text-xs text-white/70">
          Drag a card, or click it then click where it should go. Double-click sends it home to a foundation.
        </p>
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
