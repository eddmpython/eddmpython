/* pyproc 이 고정한 Pyodide 배포판. 같은 버전을 CDN 에서 가져온다. */
const ENGINE_INDEX = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

export type Machine = {
  runAsync: (code: string) => Promise<unknown>;
  loadPackages: (packages: string[]) => Promise<unknown>;
  /**
   * 실행 중 stdout 을 받아 갈 핸들러. `null` 로 되돌리면 다시 기본 동작이다.
   *
   * 이것을 걸지 않으면 `print` 출력이 어디에도 안 남고 `runAsync` 의 반환값만 남는다.
   * 셀 예제는 대부분 `print` 로 결과를 보여 주므로 걸지 않으면 화면에 `(반환값 없음)` 만 뜬다.
   */
  setStdout?: (handler: ((text: string) => void) | null) => void;
  setStderr?: (handler: ((text: string) => void) | null) => void;
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
