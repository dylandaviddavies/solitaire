import { Suit, type Card } from '../domain/Card'
import { FaceCardMotif } from './FaceCardMotif'

const SUIT_GLYPH: Record<Suit, string> = {
  [Suit.Hearts]: '♥',
  [Suit.Diamonds]: '♦',
  [Suit.Clubs]: '♣',
  [Suit.Spades]: '♠',
}

interface CardFaceProps {
  card: Card
}

/** The face-up front of a card: chunky, bold, and colorful (no illustrated art). */
export function CardFace({ card }: CardFaceProps) {
  const colorClass = card.isRed() ? 'text-rose-600' : 'text-slate-800'
  const isFace = card.rank === 'J' || card.rank === 'Q' || card.rank === 'K'

  return (
    <div className="relative flex h-full w-full flex-col justify-between rounded-[14px] bg-[#fffaf0] p-2 select-none">
      <div className={`flex flex-col items-start self-start leading-none ${colorClass}`}>
        <span className="text-[1.35rem] font-black tracking-tight">{card.rank}</span>
        <span className="text-[1.05rem]">{SUIT_GLYPH[card.suit]}</span>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {isFace ? (
          <div className="h-[62%] w-[62%] drop-shadow-sm">
            <FaceCardMotif rank={card.rank as 'J' | 'Q' | 'K'} isRed={card.isRed()} />
          </div>
        ) : (
          <span className={`text-[2.6rem] opacity-90 ${colorClass}`}>{SUIT_GLYPH[card.suit]}</span>
        )}
      </div>

      <div className={`flex rotate-180 flex-col items-start self-end leading-none ${colorClass}`}>
        <span className="text-[1.35rem] font-black tracking-tight">{card.rank}</span>
        <span className="text-[1.05rem]">{SUIT_GLYPH[card.suit]}</span>
      </div>
    </div>
  )
}
