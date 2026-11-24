// The caller supplies browser APIs so every fallback can be tested without
// opening a real share target or overwriting the developer's clipboard.
export async function deliverShare(text, { nativeShare, copyText } = {}) {
  if (nativeShare) {
    try { await nativeShare({ text }); return 'shared'; }
    catch (error) { if (error?.name === 'AbortError') return 'cancelled'; }
  }
  if (copyText) {
    try { await copyText(text); return 'copied'; } catch { /* Offer selectable text. */ }
  }
  return 'selectable';
}
