/* pyproc 이 고정한 Pyodide 배포판. 같은 버전을 CDN 에서 가져온다. */
const ENGINE_INDEX = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

export type Machine = {
  runAsync: (code: string) => Promise<unknown>;
  loadPackages: (packages: string[]) => Promise<unknown>;
};

let booting: Promise<Machine> | null = null;

/**
 * 페이지 전체가 pyproc 머신 하나를 나눠 쓴다.
 * 실패하면 다음 시도에서 다시 부팅할 수 있게 캐시를 비운다.
 */
export function getMachine(): Promise<Machine> {
  if (!booting) {
    booting = import("pyproc")
      .then((m) => m.boot({ indexURL: ENGINE_INDEX }) as Promise<Machine>)
      .catch((e) => {
        booting = null;
        throw e;
      });
  }
  return booting;
}

const installed = new Set<string>();

/** micropip 으로 아직 없는 패키지만 설치한다. */
export async function ensurePackages(
  machine: Machine,
  packages: string[],
): Promise<string[]> {
  const missing = packages.filter((p) => !installed.has(p));
  if (!missing.length) return [];
  await machine.loadPackages(["micropip"]);
  await machine.runAsync(
    `import micropip\n${missing
      .map((p) => `await micropip.install(${JSON.stringify(p)})`)
      .join("\n")}`,
  );
  missing.forEach((p) => installed.add(p));
  return missing;
}
