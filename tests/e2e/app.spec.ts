import { expect, test } from "@playwright/test";

test("renders the control plane shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Tenant Access")).toBeVisible();
  await expect(
    page.getByText("auth posture, cache discipline, and delivery proof"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "GraphQL" })).toBeVisible();
});

test("renders docs page", async ({ page }) => {
  await page.goto("/docs");

  await expect(page.getByText("One-shot local run")).toBeVisible();
  await expect(page.getByText("GraphQL snapshot")).toBeVisible();
});
