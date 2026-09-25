import { config } from "dotenv";
import path from "path";
config({ path: path.join(process.cwd(), ".env.local") });
import { fetchAllSheetTabs } from "../lib/google-sheets";

async function main() {
  try {
    const tabs = await fetchAllSheetTabs();
    console.log("=== SPREADSHEET TABS ===");
    tabs.forEach((t) => console.log(` - Title: "${t.title}", SheetId: ${t.sheetId}`));
  } catch (err: any) {
    console.error("Failed to fetch tabs:", err.message);
  }
}

main();
