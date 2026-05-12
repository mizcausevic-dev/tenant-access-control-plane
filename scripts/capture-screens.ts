import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1600, height: 2200 },
  });
  const baseUrl = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3001";
  const outputDir = join(process.cwd(), "screenshots");

  await mkdir(outputDir, { recursive: true });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({
    path: join(outputDir, "01-overview.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "GraphQL" }).click();
  await page.screenshot({
    path: join(outputDir, "02-graphql.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "Deploy" }).click();
  await page.screenshot({
    path: join(outputDir, "03-deploy.png"),
    fullPage: true,
  });

  await page.goto(`${baseUrl}/docs`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: join(outputDir, "04-docs.png"),
    fullPage: true,
  });

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
