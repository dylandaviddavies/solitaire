import { expect, test, type Page } from '@playwright/test'
import { dragDropSnapshot } from '../src/domain/GameEngine.testFixtures'

const SAVE_KEY = 'solitaire:save'
const APP_PATH = '/solitaire/'

/**
 * Seed a board into `localStorage` before the app's scripts run, so
 * `useGameEngine` resumes it on mount — the same path the app uses to
 * survive a page refresh. No production test hooks required.
 */
async function seedBoard(page: Page, snapshot: unknown) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [SAVE_KEY, JSON.stringify(snapshot)] as const,
  )
}

/** Drags the top card out of one pile onto another, via real mouse events —
 * Chromium synthesizes Pointer Events from these, so this exercises the
 * app's actual onPointerDown/Move/Up drag handlers rather than a native
 * HTML5 drag-and-drop path the app doesn't use. A midpoint stop keeps the
 * drop registry's hit-test (which reads the final pointer position) honest
 * about crossing real screen space, not teleporting.
 *
 * The grab point comes from the *card's* box, not the source pile's: every
 * tableau column's `PileSlot` is a flex sibling of the others, so a mostly
 * empty column is stretched to match its tallest neighbour — its own box
 * can be far taller than the single card resting at its top. The drop
 * point uses the destination *pile's* box instead, since that's the exact
 * rect `DropRegistry` hit-tests against, however tall it's stretched. */
async function dragPile(page: Page, fromPileId: string, toPileId: string) {
  const from = await page.locator(`[data-pile-id="${fromPileId}"] .touch-none`).first().boundingBox()
  const to = await page.locator(`[data-pile-id="${toPileId}"]`).boundingBox()
  if (!from || !to) throw new Error(`could not measure ${fromPileId} or ${toPileId}`)

  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 }
  const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 }
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(mid.x, mid.y, { steps: 5 })
  await page.mouse.move(end.x, end.y, { steps: 5 })
  await page.mouse.up()
}

test.describe('drag and drop', () => {
  test('dragging a card onto a legal pile moves it there', async ({ page }) => {
    await seedBoard(page, dragDropSnapshot())
    await page.goto(APP_PATH)

    // tableau-0 holds a lone red Six, tableau-1 a lone black Seven — a
    // legal landing.
    await expect(page.getByText('👣 0')).toBeVisible()
    await dragPile(page, 'tableau-0', 'tableau-1')

    await expect(page.getByText('👣 1')).toBeVisible()
  })

  test('dragging a card onto an illegal pile snaps it back', async ({ page }) => {
    await seedBoard(page, dragDropSnapshot())
    await page.goto(APP_PATH)

    // tableau-6 is topped by the King of Spades (the last card the fixture's
    // deterministic fill order deals it) — no card can stack on a King, so
    // this drop must be refused and leave the move counter untouched.
    await dragPile(page, 'tableau-0', 'tableau-6')

    await expect(page.getByText('👣 0')).toBeVisible()
  })
})
