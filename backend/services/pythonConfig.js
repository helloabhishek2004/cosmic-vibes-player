import dotenv from "dotenv";

dotenv.config();

export const PYTHON =
  process.env.PYTHON_PATH ||
  (process.platform === "win32" ? "python" : "python3");
