import type { VercelRequest, VercelResponse } from "@vercel/node";
import { config } from "dotenv";
import path from "path";
import { dispatchController } from "../controller";

config({ path: path.join(process.cwd(), ".env.local") });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return dispatchController(req, res);
}
