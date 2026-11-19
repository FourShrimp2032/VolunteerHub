// Live smoke test of the main user flows. Usage: node smoke.cjs <baseUrl> "<command that makes EMAIL an admin>"
// Test accounts use @volunteerhub.test e-mails and are removed afterwards by cleanup.sql.
// E2E: register → non-organizations get the organization application → (as admin) create campaign via wizard → submit → approve → visitor follows/shares → logout/login
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const base = process.argv[2] || 'http://localhost:8788';
const makeAdmin = process.argv[3]; // shell command template with EMAIL
const stamp = Date.now();
const org = { name: 'Тест Організатор', email: `e2e-org-${stamp}@volunteerhub.test`, pw: 'TestPass!2345' };
const fan = { name: 'Тест Донор', email: `e2e-fan-${stamp}@volunteerhub.test`, pw: 'TestPass!2345' };
const log = (...a) => console.log('✓', ...a);
const assert = (cond, msg) => { if (!cond) throw new Error('Assertion failed: ' + msg); };
require('fs').mkdirSync('screenshots', { recursive: true });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('pageerror', e.message));
  // Protected route redirects
  await p.goto(base + '/dashboard'); await p.waitForURL(/\/login/); log('dashboard redirects to login when signed out');
  // Register
  await p.goto(base + '/register');
  await p.fill('#name', org.name); await p.fill('#email', org.email); await p.fill('#password', org.pw);
  await p.click('button[type=submit]'); await p.waitForURL(/\/dashboard/); log('registered', org.email);
  // Only verified organizations (or admins) create fundraisers.
  await p.goto(base + '/dashboard/campaigns/new');
  await p.getByText('Заявка організації').first().waitFor(); log('regular user sees the organization application instead of the wizard');
  execSync(makeAdmin.replace('EMAIL', org.email), { stdio: 'ignore' }); log('promoted to admin (may create fundraisers)');
  // Wizard
  await p.goto(base + '/dashboard/campaigns/new');
  await p.getByPlaceholder('Наприклад: Генератор').fill('E2E тест: павербанки для медиків');
  await p.getByRole('button', { name: 'Медицина' }).click();
  await p.getByPlaceholder('Одне речення').fill('Автоматичний тестовий збір, буде видалено.');
  await p.locator('textarea').first().fill('Це автоматичний тест платформи Volunteerhub. Збираємо на павербанки для бригади медиків. Тестовий опис має бути довшим за 80 символів.');
  await p.getByRole('button', { name: /Далі/ }).click();
  await p.getByPlaceholder('150000').fill('20000');
  await p.getByPlaceholder('Стаття витрат').fill('Павербанки (5 шт.)'); await p.getByPlaceholder('₴').fill('20000');
  await p.getByRole('button', { name: /Далі/ }).click();
  await p.getByPlaceholder('https://send.monobank.ua/jar/2ABCdEfGhJ').fill('evil.com/jar/123');
  await p.getByRole('button', { name: /Далі/ }).click();
  await p.getByText('Посилання має виглядати').first().waitFor(); log('invalid jar rejected');
  await p.getByPlaceholder('https://send.monobank.ua/jar/2ABCdEfGhJ').fill('https://send.monobank.ua/jar/TESTJAR123');
  await p.getByText('Формат правильний').waitFor();
  await p.getByRole('button', { name: /Далі/ }).click();
  await p.getByText('Підтверджувальні документи').waitFor();
  await p.getByRole('button', { name: /Далі/ }).click();
  await p.getByText('Шаблон для допоміжних банок').first().waitFor(); log('helping-jar template step shown');
  await p.getByRole('button', { name: /Далі/ }).click();
  await p.getByRole('button', { name: /Надіслати на модерацію/ }).click();
  await p.waitForURL(/manage\?id=/); const cid = new URL(p.url()).searchParams.get('id'); log('campaign submitted', cid);
  await p.getByText('Збір на модерації').first().waitFor();
  // Logout via API-backed menu
  await p.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
  // Persisted? Public can't see pending
  const r1 = await p.evaluate((id) => fetch('/api/campaigns/' + id).then(r => r.status), cid); assert(r1 === 404, 'pending campaign must be hidden'); log('pending campaign hidden from public:', r1);
  // Promote org to admin, login, approve via UI
  execSync(makeAdmin.replace('EMAIL', org.email), { stdio: 'ignore' }); log('promoted to admin');
  await p.goto(base + '/login');
  await p.fill('#email', org.email); await p.fill('#password', 'wrong-password'); await p.click('button[type=submit]');
  await p.getByText('Невірний email або пароль').waitFor(); log('wrong password rejected');
  await p.fill('#password', org.pw); await p.click('button[type=submit]'); await p.waitForURL(/\/dashboard/); log('logged in');
  await p.goto(base + '/admin');
  const card = p.locator('div.rounded-2xl', { hasText: 'E2E тест: павербанки' }).last();
  await card.locator('input[type=checkbox]').check();
  await card.getByRole('button', { name: /Схвалити/ }).click();
  await p.getByText('Збір опубліковано').waitFor(); log('approved by admin with jar verified');
  // Campaign page public
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  const v = await ctx2.newPage();
  v.on('pageerror', e => console.log('pageerror(v)', e.message));
  const slug = await p.evaluate((id) => fetch('/api/campaigns/' + id).then(r => r.json()).then(j => j.campaign.slug), cid);
  await v.goto(base + '/campaigns/' + slug);
  await v.getByText('E2E тест: павербанки').first().waitFor();
  await v.getByText('Мету збору перевірено').first().waitFor();
  await v.locator('a', { hasText: 'Відкрити допоміжну банку' }).first().waitFor(); log('helping-jar button shown to visitors');
  const href = await v.locator('a', { hasText: 'Підтримати через Monobank' }).first().getAttribute('href'); log('public visitor sees campaign; donate link', href);
  const loc = await v.evaluate((h) => fetch(h, { redirect: 'manual' }).then(r => r.type + ' ' + r.status), href); assert(loc.startsWith('opaqueredirect'), 'donate must redirect'); log('donate redirect', loc);
  // Visitor registers and follows
  await v.goto(base + '/register?next=' + encodeURIComponent('/campaigns/' + slug));
  await v.fill('#name', fan.name); await v.fill('#email', fan.email); await v.fill('#password', fan.pw); await v.click('button[type=submit]');
  await v.waitForURL(/\/campaigns\//);
  await v.getByRole('button', { name: /Стежити/ }).first().click();
  await v.getByText('Impact XP').first().waitFor(); log('follow awarded XP');
  await v.getByRole('button', { name: /Стежити|Ви стежите/ }).first().waitFor();
  const me = await v.evaluate(() => fetch('/api/me/dashboard').then(r => r.json()));
  log('fan xp', me.user.xp, 'achievements', me.achievements.filter(a => a.earnedAt).map(a => a.code).join(','), 'followed', me.followed.length);
  // Follow twice doesn't farm XP
  await v.evaluate((id) => fetch('/api/campaigns/' + id + '/follow', { method: 'DELETE' }).then(() => fetch('/api/campaigns/' + id + '/follow', { method: 'POST' })), cid);
  const me2 = await v.evaluate(() => fetch('/api/auth/me').then(r => r.json()));
  assert(me2.user.xp === me.user.xp, 'XP must not be farmable'); log('xp after unfollow/refollow is unchanged:', me2.user.xp);
  await v.goto(base + '/dashboard'); await v.getByText('Колекція досягнень').waitFor(); log('supporter dashboard renders');
  await v.screenshot({ path: 'screenshots/dashboard-mobile.png', fullPage: true });
  // Organizer posts update + progress
  await p.goto(base + '/dashboard/campaigns/manage?id=' + cid);
  await p.getByLabel('Зібрана сума').fill('5000'); await p.getByRole('button', { name: 'Зберегти', exact: true }).click();
  await p.getByText('Суму оновлено').waitFor(); log('progress updated');
  await p.getByPlaceholder('Що нового?').fill('Перші павербанки замовлено');
  await p.getByPlaceholder(/Розкажіть, що зроблено/).fill('Замовили перші два павербанки у постачальника.');
  await p.getByRole('button', { name: /Опублікувати/ }).click();
  await p.getByText('Оновлення опубліковано').first().waitFor(); log('update published');
  await p.screenshot({ path: 'screenshots/manage.png', fullPage: true });
  // Logout via UI
  await p.goto(base + '/'); await p.getByLabel('Меню профілю').click(); await p.getByRole('button', { name: 'Вийти' }).click();
  await p.waitForTimeout(800);
  const after = await p.evaluate(() => fetch('/api/auth/me').then(r => r.json())); assert(after.user === null, 'logout must end the session'); log('after logout user =', after.user);
  console.log(JSON.stringify({ cid, org: org.email, fan: fan.email }));
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
