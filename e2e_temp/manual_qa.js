const { chromium } = require('playwright');

(async () => {
  const base = 'https://fortunelab.store';
  const locales = ['ko','en','ja','zh','th','vi','id','hi'];
  const out = [];
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  async function check(url, fn){
    const r = { url, ok: true, note: '' };
    try { await fn(); }
    catch(e){ r.ok=false; r.note=String(e.message||e).slice(0,180);} 
    out.push(r);
  }

  for (const l of locales){
    await check(`${base}/${l}`, async()=>{
      const res = await page.goto(`${base}/${l}`, { waitUntil:'domcontentloaded', timeout:30000});
      if (!res || ![200,307,308].includes(res.status())) throw new Error('status '+(res&&res.status()));
      await page.waitForTimeout(500);
    });

    await check(`${base}/${l}/paywall`, async()=>{
      await page.goto(`${base}/${l}/paywall?name=QA&birthDate=1995-07-28&birthTime=09:00&gender=male&calendarType=solar`, {waitUntil:'domcontentloaded'});
      const email = page.locator('input[type="email"]');
      await email.fill('bad-email');
      const btn = page.locator('button').filter({ hasText: /pay|결제|購入|支付|ชำระ|Thanh toán|Bayar|भुगतान/i }).first();
      await btn.click();
      await page.waitForTimeout(400);
      const txt = await page.content();
      if (!/email|이메일|メール|邮箱|อีเมล|correo|địa chỉ email|alamat email|ईमेल/i.test(txt)) throw new Error('email validation text not obvious');
    });
  }

  // API smoke through browser context fetch
  await check(`${base}/api/admin/stats?range=7d`, async()=>{
    const resp = await page.request.get(`${base}/api/admin/stats?range=7d`);
    if (resp.status() !== 401) throw new Error('expected 401 got '+resp.status());
  });

  await check(`${base}/api/checkout/stripe/create`, async()=>{
    const resp = await page.request.post(`${base}/api/checkout/stripe/create`, {
      data: { productCode:'full', input:{name:'QA User',birthDate:'1995-07-28',birthTime:'09:00',gender:'male',calendarType:'solar'}, email:'qa@example.com', locale:'en' }
    });
    if (resp.status() !== 200) throw new Error('expected 200 got '+resp.status());
    const j = await resp.json();
    if (!j?.ok || !j?.data?.checkoutUrl) throw new Error('missing checkoutUrl');
  });

  await check(`${base}/admin`, async()=>{
    const res = await page.goto(`${base}/admin`, {waitUntil:'domcontentloaded'});
    if (!res || ![200,307,308].includes(res.status())) throw new Error('status '+(res&&res.status()));
  });

  console.log(JSON.stringify(out,null,2));
  await browser.close();
})();
