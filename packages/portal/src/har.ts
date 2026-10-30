import type { Page } from "playwright";
import * as fs from "fs";
export async function startTracing(page: Page, path = "trace.zip") {
  await page.context().tracing.start({ screenshots: true, snapshots: true });
  return () => page.context().tracing.stop({ path });
}
export async function dumpHar(page: Page, urlFilter = "/api/") {
  const entries: string[] = [];
  page.on("response", async (r) => {
    if (r.url().includes(urlFilter)) entries.push(`${r.request().method()} ${r.url()} -> ${r.status()}`);
  });
  return () => fs.writeFileSync("har.log", entries.join("\n"));
}
