export function decodeHashId(hash: string): string | null {
  if (!hash.startsWith("#") || hash.length === 1) return null;
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

export function findHashTarget(hash: string, root: Pick<Document, "getElementById"> = document) {
  const id = decodeHashId(hash);
  return id ? root.getElementById(id) : null;
}

export function scrollToHashTarget(hash: string) {
  const target = findHashTarget(hash);
  if (!target) return false;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}
