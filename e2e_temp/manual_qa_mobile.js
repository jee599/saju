const { chromium, devices } = require('playwright');

(async () => {
  const base = 'https://fortunelab.store';
  const locales = ['ko','en','ja','zh','th','vi','id','hi'];
  const out = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await context.newPage();

  async function check(name, fn){
    const r = { name, ok: true, note: '' };
    try { await fn(); } catch(e){ r.ok=false; r.note=String(e.message||e).slice(0,220); }
    out.push(r);
  }

  for (const l of locales){
    await check(`${l}: landing`, async()=>{
      const res = await page.goto(`${base}/${l}`, { waitUntil:'domcontentloaded', timeout:30000});
      if (!res || ![200,307,308].includes(res.status())) throw new Error('status '+(res&&res.status()));
    });

    await check(`${l}: paywall email validation`, async()=>{
      await page.goto(`${base}/${l}/paywall?name=QA&birthDate=1995-07-28&birthTime=09:00&gender=male&calendarType=solar`, {waitUntil:'domcontentloaded'});
      const email = page.locator('input[type="email"]');
      await email.fill('bad-email');
      const btn = page.locator('button').filter({ hasText: /pay|결제|購入|支付|ชำระ|Thanh toán|Bayar|भुगतान/i }).first();
      await btn.click();
      await page.waitForTimeout(400);
      const txt = await page.content();
      if (!/email|이메일|メール|邮箱|อีเมล|địa chỉ email|alamat email|ईमेल/i.test(txt)) {
        throw new Error('email validation text not detected');
      }
    });
  }

  await check('en: checkout redirect to stripe', async()=>{
    await page.goto(`${base}/en/paywall?name=QA&birthDate=1995-07-28&birthTime=09:00&gender=male&calendarType=solar`, {waitUntil:'domcontentloaded'});
    await page.fill('input[type="email"]','qa@example.com');
    const btn = page.locator('button').filter({ hasText: /pay|결제|購入|支付|ชำระ|Thanh toán|Bayar|भुगतान/i }).first();
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com|\/loading-analysis\?orderId=/, { timeout: 20000 }),
      btn.click()
    ]);
    const u = page.url();
    if (!/checkout\.stripe\.com|loading-analysis\?orderId=/.test(u)) throw new Error('no checkout redirect');
  });

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
