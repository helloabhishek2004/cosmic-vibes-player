import { spawn } from "child_process";

const PYTHON = process.env.PYTHON_PATH || "python";

/** Spawn yt-dlp without opening a visible console window on Windows. */
export function spawnYtDlp(args, options = {}) {
  return spawn(PYTHON, ["-u", "-m", "yt_dlp", ...args], {
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}
