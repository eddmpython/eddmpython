/**
 * 서버에 저장하지 못한 작성 내용만 보관한다. scope는 방 UUID, 작성자 ID, 수업 ID로 만든다.
 * 함수 자체를 직렬화해 브라우저에 넣으므로 외부 값이나 의존성을 참조하지 않는다.
 */
export function createNotebookDrafts(scope: string, legacyKey: string): {
  read(): unknown[];
  write(payload: unknown): boolean;
  clear(): void;
  consume(): void;
} {
  const prefix = `notebook-draft:v2:${encodeURIComponent(scope)}:`;
  // 복제한 탭은 sessionStorage도 복제한다. 문서마다 새 키를 써서 원래 탭을 덮어쓰지 않는다.
  const ownKey = prefix + crypto.randomUUID();
  const readItems = new Map<string, string>();
  let legacyRaw: string | null = null, writtenAfterRead = false;
  return {
    read() {
      readItems.clear(); legacyRaw = null; writtenAfterRead = false;
      const found: { updated: number; payload: unknown }[] = [];
      try {
        const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
        for (const key of keys) {
          if (!key?.startsWith(prefix)) continue;
          try {
            const raw = localStorage.getItem(key);
            const value = JSON.parse(raw || "null");
            if (value && typeof value.updated === "number" && Number.isFinite(value.updated) && Object.hasOwn(value, "payload")) {
              found.push({ updated: value.updated, payload: value.payload });
              readItems.set(key, raw!);
            }
          } catch { /* 다른 초안이 손상되어도 읽을 수 있는 내용은 복구한다. */ }
        }
      } catch { /* 저장소를 막은 브라우저에서도 기존 sessionStorage 초안은 확인한다. */ }
      found.sort((left, right) => right.updated - left.updated);
      const payloads = found.map(value => value.payload);
      try {
        const legacy = sessionStorage.getItem(legacyKey);
        if (legacy !== null) { payloads.push(JSON.parse(legacy)); legacyRaw = legacy; }
      } catch { /* 이전 초안을 읽을 수 없더라도 현재 초안 복구는 유지한다. */ }
      return payloads;
    },
    write(payload) {
      writtenAfterRead = false;
      try {
        if (payload === undefined || typeof payload === "function" || typeof payload === "symbol") return false;
        localStorage.setItem(ownKey, JSON.stringify({ updated: Date.now(), payload }));
        writtenAfterRead = true;
        return true;
      } catch { return false; }
    },
    clear() {
      // 다른 탭에는 아직 저장하지 못한 내용이 있을 수 있으므로 자기 키만 지운다.
      try { localStorage.removeItem(ownKey); } catch { /* 브라우저 저장소 접근 불가 */ }
      try { sessionStorage.removeItem(legacyKey); } catch { /* 브라우저 저장소 접근 불가 */ }
      readItems.clear(); legacyRaw = null; writtenAfterRead = false;
    },
    consume() {
      // 호출자는 읽은 모든 초안을 병합한다. 새 사본을 저장하기 전에는 원본을 제거하지 않는다.
      if (!writtenAfterRead) return;
      for (const [key, raw] of readItems) {
        if (key === ownKey) continue;
        try { if (localStorage.getItem(key) === raw) localStorage.removeItem(key); } catch { /* 다음 읽기에서 복구 가능 */ }
      }
      try { if (legacyRaw !== null && sessionStorage.getItem(legacyKey) === legacyRaw) sessionStorage.removeItem(legacyKey); } catch { /* 이전 초안 유지 */ }
      readItems.clear(); legacyRaw = null; writtenAfterRead = false;
    },
  };
}
