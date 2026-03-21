import { test, expect } from "@playwright/test";

test.describe("Contact Lead Capture", () => {
  test("visitor can submit a contact form and receive a lead reference", async ({
    page,
  }) => {
    await page.goto(
      "/contact?inquiryType=合作提案&sourcePath=/pricing&entryPoint=pricing-cta",
    );
    await page.waitForLoadState("networkidle");

    await expect(page.locator('select[name="inquiryType"]')).toHaveValue(
      "合作提案",
    );
    await expect(page.getByText(/來自公開頁面/i)).toBeVisible();

    await page.locator('input[name="name"]').fill("E2E Lead Tester");
    await page
      .locator('input[name="email"]')
      .fill(`e2e-lead-${Date.now()}@example.com`);
    await page.locator('input[name="phone"]').fill("0912345678");
    await page
      .locator('textarea[name="message"]')
      .fill(
        "這是一筆由 Playwright 驗證的公開 lead，請確認追蹤編號與來源資訊有被建立。",
      );
    await page
      .getByLabel(/我同意 Owner AI 處理我的個人資料以回應此詢問/i)
      .check();

    await page.getByRole("button", { name: /發送訊息/i }).click();

    await expect(page.getByText(/發送成功/i)).toBeVisible();
    await expect(page.getByText(/Lead 編號/i)).toBeVisible();
    await expect(page.getByText(/來自公開頁面/i)).toBeVisible();
  });
});
