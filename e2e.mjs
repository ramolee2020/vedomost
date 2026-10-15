// Ручная e2e-проверка против живой базы. Запуск: node e2e.mjs (dev-сервер на :5199)
import { chromium, devices } from 'playwright-core';
const SHOT = process.argv[2] || '.';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await browser.newContext({ ...devices['iPhone 13'], defaultBrowserType: undefined });
const page = await ctx.newPage();
page.on('dialog', async d => { const m = d.message(); await d.accept(m.startsWith('Удалить') ? undefined : undefined); });
const log = (...a) => console.log('•', ...a);
page.on('console', m => { if (m.type() !== 'log') console.log('  console:', m.type(), m.text().slice(0, 300)); });
await page.goto('http://localhost:5199/vedomost/');
await page.getByLabel('Код клуба').fill('wrong'); await page.getByLabel('Ваше имя').fill('Тест');
await page.getByRole('button', { name: 'Войти' }).click();
await page.getByText('Неверный код клуба').waitFor(); log('wrong code rejected');
await page.getByLabel('Код клуба').fill('dzudo98'); await page.getByRole('button', { name: 'Войти' }).click();
await page.getByRole('button', { name: '6–7 лет' }).waitFor(); log('groups visible');
await page.screenshot({ path: SHOT + '/1-groups.png' });
await page.getByRole('button', { name: '6–7 лет' }).click();
await page.getByRole('button', { name: /Добавить детей/ }).click();
await page.locator('textarea').fill('тестов петя, тестова маша. тестов вася тестова оля');
await page.screenshot({ path: SHOT + '/2-add.png' });
await page.getByRole('button', { name: 'Сохранить' }).click();
await page.getByRole('button', { name: 'Тестов Петя' }).waitFor(); log('athletes added');
await page.getByRole('button', { name: 'Новая сдача' }).click();
const big = page.locator('input.huge');
await big.fill('0'); await page.getByRole('button', { name: /Дальше/ }).click();
await page.getByRole('button', { name: '+5' }).click(); await page.getByRole('button', { name: '+1' }).click();
await page.screenshot({ path: SHOT + '/3-entry.png' });
await page.getByRole('button', { name: /Дальше/ }).click();
await page.getByRole('button', { name: /Дальше/ }).click(); // 3-й ребёнок без результата
// второе упражнение: прыжок, метры
await page.locator('select').first().selectOption({ index: 1 });
await big.fill('1,20'); await big.blur();
log('entered values');
// офлайн-правка
await ctx.setOffline(true);
await page.locator('select').nth(1).selectOption({ index: 1 });
await big.fill('1,35'); await page.getByRole('button', { name: /Дальше/ }).click();
await page.waitForTimeout(1500);
log('offline banner:', await page.locator('.sync').innerText());
await ctx.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event('online')));
for (let i = 0; i < 30 && !(await page.locator('.sync').innerText()).startsWith('Синхр'); i++) await page.waitForTimeout(1000);
log('online banner:', await page.locator('.sync').innerText());
await page.getByRole('button', { name: 'Таблица' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: SHOT + '/4-table.png', fullPage: true });
const cells = await page.locator('tbody tr').allInnerTexts();
log('table rows:', cells.length);
const vals = await page.locator('tbody input').evaluateAll(els => els.map(e => e.value));
log('values:', JSON.stringify(vals));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }).catch(() => null), page.getByRole('button', { name: /Ведомость в Word/ }).click()]);
if (dl) { await dl.saveAs(SHOT + '/export.docx'); log('docx downloaded'); }
// прогресс
await page.getByRole('button', { name: /Назад/ }).click();
await page.waitForTimeout(300);
await browser.close();
