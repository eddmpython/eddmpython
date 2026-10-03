/** The reading anchors keep their existing order; notebook keys follow the heading. */
export async function notebookSections(headings: string[]) {
  const seen = new Map<string, number>();
  return Promise.all(headings.map(async (title, index) => {
    const normalized = title.normalize("NFKC").trim().replace(/\s+/g, " ");
    const occurrence = (seen.get(normalized) ?? 0) + 1;
    seen.set(normalized, occurrence);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
    const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
    return { key: key + (occurrence > 1 ? `_${occurrence}` : ""), title, anchor: `s${index + 1}` };
  }));
}

export type NotebookSection = Awaited<ReturnType<typeof notebookSections>>[number];
