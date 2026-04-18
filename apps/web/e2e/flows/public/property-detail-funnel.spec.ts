import { test, expect } from "@playwright/test";

async function login(page: Parameters<typeof test>[0]["page"]) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  test.skip(!email || !password, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in apps/web/.env.local");

  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL(/\/portal(\/)?$/, { timeout: 15_000 });
}

test.describe("Public Property Detail Funnel", () => {
  test("visitor can move from property list to detail and carry context into contact", async ({
    page,
  }) => {
    await page.goto("/properties");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", {
        name: /多角色案件市場/i,
        level: 1,
      }),
    ).toBeVisible();

    await page.locator('main a[href^="/properties/"]').first().click();
    await expect(page).toHaveURL(/\/properties\//);

    const propertyTitle =
      (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ||
      "";

    await expect(page.getByText(/推薦接手角色/i)).toBeVisible();
    await expect(page.getByText(/案件協作節點/i)).toBeVisible();

    await page.getByRole("link", { name: /先談合作需求/i }).click();
    await expect(page).toHaveURL(/\/contact\?inquiryType=/);
    await expect(page.locator('select[name="inquiryType"]')).toHaveValue(
      "合作提案",
    );
    await expect(page.getByText(/案件來源/i)).toBeVisible();
    await expect(
      page.getByText(
        new RegExp(propertyTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      ),
    ).toBeVisible();
  });

  test("authenticated user can open all property detail CTA flows with preserved context", async ({
    page,
  }) => {
    await login(page);

    await page.goto("/properties");
    await page.waitForLoadState("networkidle");

    await page.locator('main a[href^="/properties/"]').first().click();
    await expect(page).toHaveURL(/\/properties\//);
    await expect(
      page.getByRole("heading", { name: /選擇你要推進的下一步/i }),
    ).toBeVisible();

    const detailUrl = page.url();
    const propertyTitle =
      (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ||
      "";
    const propertyId = detailUrl.split("/").pop() || "";

    const ctaCases = [
      {
        label: "預約看房",
        inquiryType: "看屋",
        entryPoint: "property-detail-viewing",
      },
      {
        label: "詢問簽約支援",
        inquiryType: "法律諮詢",
        entryPoint: "property-detail-legal",
      },
      {
        label: "邀請合作角色",
        inquiryType: "合作提案",
        entryPoint: "property-detail-collaboration",
      },
    ] as const;

    for (const ctaCase of ctaCases) {
      await page.goto(detailUrl);
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("heading", { name: /選擇你要推進的下一步/i }),
      ).toBeVisible();

      await page
        .getByRole("link", { name: new RegExp(`^${ctaCase.label}$`) })
        .click();
      await expect(page).toHaveURL(/\/contact\?/);

      const currentUrl = new URL(page.url());

      expect(currentUrl.searchParams.get("inquiryType")).toBe(
        ctaCase.inquiryType,
      );
      expect(currentUrl.searchParams.get("entryPoint")).toBe(
        ctaCase.entryPoint,
      );
      expect(currentUrl.searchParams.get("sourcePath")).toBe(
        `/properties/${propertyId}`,
      );
      expect(currentUrl.searchParams.get("propertyId")).toBe(propertyId);
      expect(currentUrl.searchParams.get("propertyTitle")).toBe(propertyTitle);

      await expect(page.locator('select[name="inquiryType"]')).toHaveValue(
        ctaCase.inquiryType,
      );
      await expect(page.getByText(/案件來源/i)).toBeVisible();
      await expect(page.getByText(propertyTitle)).toBeVisible();
    }
  });
});
