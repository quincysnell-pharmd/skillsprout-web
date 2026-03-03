/**
 * Link code utilities for parent-child account linking.
 *
 * Two code types:
 *   "invite"  — parent generates this, child enters it at signup → immediate link
 *   "pending" — child generates this, parent enters it in dashboard → links + approves
 */

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

export function generateCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export function formatCode(raw: string): string {
  // Display as XXX-XXX for readability
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.length === 6 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

export function cleanCode(formatted: string): string {
  return formatted.toUpperCase().replace(/[^A-Z0-9]/g, "");
}