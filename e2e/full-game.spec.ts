import { expect, test } from '@playwright/test'
import { autoCompletableSnapshot } from '../src/domain/GameEngine.testFixtures'

const SAVE_KEY = 'solitaire:save'
const APP_PATH = '/solitaire/'

/**
 * Seed a board into `localStorage` before the app's scripts run, so
 * `useGameEngine` resumes it on mount — the same path the app uses to
 * survive a page refresh. No production test hooks required.
 */
async function seedBoard(page: import('@playwright/test').Page, snapshot: unknown) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [SAVE_KEY, JSON.stringify(snapshot)] as const,
  )
}

test.describe('full game', () => {
  test('runs a whole game to the win screen through the real UI', async ({ page }) => {
    await seedBoard(page, autoCompletableSnapshot())
    await page.goto(APP_PATH)

    // The resumed board is every card face-up with an empty stock/waste,
    // so the engine offers to finish it.
    const autoFinish = page.getByRole('button', { name: /auto finish/i })
    await expect(autoFinish).toBeVisible()

    await autoFinish.click()

    // It sends all 52 cards home one at a time; the win overlay follows.
    await expect(page.getByRole('heading', { name: 'You Win!' })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/solved in\s+52\s+moves/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /new deal/i })).toBeVisible()

    // The move counter in the toolbar agrees.
    await expect(page.getByText('👣 52')).toBeVisible()
  })

  test('"Play Again" from the win screen deals a fresh game', async ({ page }) => {
    await seedBoard(page, autoCompletableSnapshot())
    await page.goto(APP_PATH)

    await page.getByRole('button', { name: /auto finish/i }).click()
    await expect(page.getByRole('heading', { name: 'You Win!' })).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: /new deal/i }).click()

    await expect(page.getByRole('heading', { name: 'You Win!' })).toBeHidden()
    // A fresh deal: back to zero moves and no "Auto Finish" on offer.
    await expect(page.getByText('👣 0')).toBeVisible()
    await expect(page.getByRole('button', { name: /auto finish/i })).toBeHidden()
  })
})
