import { test, expect } from "@playwright/test";

test.describe("Public Marketing Funnel", () => {
  test("homepage hero should route visitors into pricing and services", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", {
        name: /不只服務房東/i,
        level: 1,
      }),
    ).toBeVisible();

    await page
      .locator("main")
      .getByRole("link", { name: /查看角色方案/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(
      page.getByRole("heading", {
        name: /從免費流量入口到專業協作方案/i,
        level: 1,
      }),
    ).toBeVisible();

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("link", { name: /查看平台能力/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(
      page.getByRole("heading", {
        name: /多角色不動產 AI 協作平台能力/i,
        level: 1,
      }),
    ).toBeVisible();
  });

  test("public pages should route collaboration CTAs into contact with inquiry type", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /預約方案洽談/i }).click();
    await expect(page).toHaveURL(/\/contact\?inquiryType=/);
    await expect(page.locator('select[name="inquiryType"]')).toHaveValue(
      "合作提案",
    );

    await page.goto("/services");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("link", { name: /預約導入諮詢/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/contact\?inquiryType=/);
    await expect(page.locator('select[name="inquiryType"]')).toHaveValue(
      "合作提案",
    );

    await page.goto("/about");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", {
        name: /我們正在重做不動產服務的協作底層/i,
        level: 1,
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: /查看角色定價/i }).click();
    await expect(page).toHaveURL(/\/pricing$/);

    await page.goto("/properties");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", {
        name: /多角色案件市場/i,
        level: 1,
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: /預約導入諮詢/i }).click();
    await expect(page).toHaveURL(/\/contact\?inquiryType=/);
    await expect(page.locator('select[name="inquiryType"]')).toHaveValue(
      "合作提案",
    );
  });
});
