import { test, expect, type Page } from '@playwright/test'

async function dragSquare(page: Page, from: string, to: string): Promise<void> {
  const fromBox = await page.locator(`[data-square="${from}"]`).boundingBox()
  const toBox = await page.locator(`[data-square="${to}"]`).boundingBox()

  if (!fromBox || !toBox)
    throw new Error(`Could not locate square ${from} or ${to}`)

  const fromX = fromBox.x + fromBox.width / 2
  const fromY = fromBox.y + fromBox.height / 2
  const toX = toBox.x + toBox.width / 2
  const toY = toBox.y + toBox.height / 2

  await page.mouse.move(fromX, fromY)
  await page.mouse.down()

  // Multiple intermediate steps to clear @dnd-kit's pointer-sensor activation distance —
  // a single jump from source to target does not reliably start a drag.
  await page.mouse.move(
    fromX + (toX - fromX) * 0.3,
    fromY + (toY - fromY) * 0.3,
    { steps: 5 }
  )
  await page.mouse.move(
    fromX + (toX - fromX) * 0.6,
    fromY + (toY - fromY) * 0.6,
    { steps: 5 }
  )
  await page.mouse.move(toX, toY, { steps: 5 })

  await page.mouse.up()
}

function pieceOn(page: Page, square: string) {
  return page.locator(`[data-square="${square}"] [data-piece]`)
}

test('hot-seat chess enforces turn order and legal moves', async ({ page }) => {
  await test.step('starts with White to move and the standard position', async () => {
    await page.goto('/')
    await page.getByRole('banner').getByText('Solo', { exact: true }).click()

    await expect(page.getByTestId('active-player')).toHaveText('Whites')
    await expect(pieceOn(page, 'e2')).toBeVisible()
  })

  await test.step('White plays a legal move', async () => {
    await dragSquare(page, 'e2', 'e4')

    await expect(page.getByTestId('active-player')).toHaveText('Blacks')
    await expect(pieceOn(page, 'e4')).toBeVisible()
    await expect(pieceOn(page, 'e2')).toHaveCount(0)
  })

  await test.step('White cannot move again out of turn', async () => {
    await dragSquare(page, 'd2', 'd4')

    await expect(page.getByTestId('active-player')).toHaveText('Blacks')
    await expect(pieceOn(page, 'd2')).toBeVisible()
  })

  await test.step('Black replies', async () => {
    await dragSquare(page, 'e7', 'e5')

    await expect(page.getByTestId('active-player')).toHaveText('Whites')
    await expect(pieceOn(page, 'e5')).toBeVisible()
  })

  await test.step('New Game resets the board', async () => {
    await page.getByRole('button', { name: /new game/i }).click()

    await expect(page.getByTestId('active-player')).toHaveText('Whites')
    await expect(pieceOn(page, 'e2')).toBeVisible()
    await expect(pieceOn(page, 'e4')).toHaveCount(0)
    await expect(pieceOn(page, 'e5')).toHaveCount(0)
  })
})

test('resumes an in-progress Solo game after reloading the tab', async ({
  page
}) => {
  await test.step('play a move in Solo mode', async () => {
    await page.goto('/')
    await page.getByRole('banner').getByText('Solo', { exact: true }).click()
    await dragSquare(page, 'e2', 'e4')

    await expect(page.getByTestId('active-player')).toHaveText('Blacks')
  })

  await test.step('reloading the tab resumes the same game', async () => {
    await page.reload()

    await expect(
      page.getByRole('banner').getByRole('radio', { name: /^solo$/i })
    ).toBeChecked()
    await expect(page.getByTestId('active-player')).toHaveText('Blacks')
    await expect(pieceOn(page, 'e4')).toBeVisible()
    await expect(pieceOn(page, 'e2')).toHaveCount(0)
  })
})

test('remembers the sound toggle after reloading the tab', async ({ page }) => {
  await page.goto('/')

  const soundToggle = page
    .getByRole('banner')
    .getByRole('button', { name: /toggle sound/i })

  await test.step('turn sound off', async () => {
    await expect(soundToggle).toHaveAttribute('aria-pressed', 'true')

    await soundToggle.click()

    await expect(soundToggle).toHaveAttribute('aria-pressed', 'false')
  })

  await test.step('reloading the tab keeps sound off', async () => {
    await page.reload()

    await expect(soundToggle).toHaveAttribute('aria-pressed', 'false')
  })
})
