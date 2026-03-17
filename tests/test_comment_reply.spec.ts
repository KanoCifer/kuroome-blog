import { test, expect } from "@playwright/test";

test("测试回复功能是否正常工作", async ({ page }) => {
  // 1. 导航到博客文章页面
  await page.goto("http://localhost:5175/blog");

  // 2. 点击第一篇博客文章标题进入详情页
  // 等待文章列表加载
  await page.waitForSelector('a[href^="/blog/"]');

  // 获取第一个文章链接并点击
  const firstPostLink = await page.locator('a[href^="/blog/"]').first();
  await firstPostLink.click();

  // 等待页面导航完成
  await page.waitForURL("**/blog/*");

  // 3. 登录（如果需要）
  // 检查是否显示登录按钮
  if (await page.locator('a[href="/login"]').isVisible()) {
    await page.click('a[href="/login"]');
    await page.waitForURL("**/login");

    // 填写登录表单
    await page.fill('input[name="username"]', "test");
    await page.fill('input[name="password"]', "test");
    await page.click('button[type="submit"]');

    // 等待登录成功后导航回博客页面
    await page.waitForURL("**/blog");
  }

  // 4. 等待评论区加载
  await page.waitForSelector("#comments");

  // 5. 点击回复按钮
  // 找到第一个评论的回复按钮并点击
  const replyButton = await page
    .locator('.comment-item button:has-text("Reply")')
    .first();
  await replyButton.click();

  // 6. 等待回复表单出现
  await page.waitForSelector('textarea[placeholder*="Reply to"]');

  // 7. 输入回复内容
  const replyText = "这是一个测试回复 " + Date.now();
  await page.fill('textarea[placeholder*="Reply to"]', replyText);

  // 8. 点击提交回复按钮
  await page.click('button:has-text("Reply"):not(:disabled)');

  // 9. 验证回复是否成功提交
  // 等待成功提示出现
  await page.waitForSelector(".notification-success");

  // 验证成功提示文本
  const successNotification = await page.locator(".notification-success");
  await expect(successNotification).toContainText("评论已提交");

  // 10. 验证评论列表是否更新
  // 刷新页面以获取最新评论
  await page.reload();

  // 等待评论区加载
  await page.waitForSelector("#comments");

  // 验证新回复是否显示在页面上
  await expect(page.locator("#comments")).toContainText(replyText);

  console.log("回复功能测试成功！");
});
