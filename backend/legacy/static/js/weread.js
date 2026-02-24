// Playwright/Puppeteer 方案
// const browser = await chromium.launch();
// const page = await browser.newPage();
// // 用户在你的页面完成登录，保存 cookie
// await page.goto('https://weread.qq.com/');
// // ... 用户手动登录或自动填充 ...
// const cookies = await page.context().cookies();
// // 保存 cookies 供后续使用
// // 后续抓取时使用保存的 cookie
// await page.context().addCookies(cookies);
// await page.goto('https://weread.qq.com/');
// const data = await page.evaluate(() => {
//   return document.querySelector('.data').innerText;
// });
const { webkit } = require("playwright"); // Or 'chromium' or 'webkit'.

(async () => {
  const browser = await webkit.launch();
  const page = await browser.newPage();
  await page.goto("https://weread.qq.com/");
  //   await browser.close();
})();
