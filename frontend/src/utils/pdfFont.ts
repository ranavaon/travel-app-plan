import { jsPDF } from 'jspdf';

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/rubik/static/Rubik-Regular.ttf';
const FONT_NAME = 'Rubik';
const FONT_FILE = 'Rubik-Regular.ttf';

let cachedBase64: string | null = null;

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Fetches a Hebrew-supporting TTF font and registers it with jsPDF.
 * Caches the font in memory so subsequent calls are instant.
 * Returns true if the font was registered, false on failure.
 */
export async function registerHebrewFont(doc: jsPDF): Promise<boolean> {
  try {
    if (!cachedBase64) {
      const res = await fetch(FONT_URL);
      if (!res.ok) return false;
      const buf = await res.arrayBuffer();
      cachedBase64 = arrayBufferToBase64(buf);
    }
    doc.addFileToVFS(FONT_FILE, cachedBase64);
    doc.addFont(FONT_FILE, FONT_NAME, 'normal');
    doc.setFont(FONT_NAME);
    return true;
  } catch {
    return false;
  }
}
