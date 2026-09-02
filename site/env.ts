/**
 * Worker 바인딩 정본.
 *
 * 운영장(`admin.ts`)과 강의방(`classroom.ts`)이 같은 바인딩을 쓴다. 어느 한쪽이 자기
 * Env 를 따로 적으면 배포 설정과 코드가 조용히 갈라진다.
 */
export type Env = {
  /** 방 목록, 방마다의 열림 상태, 세션 서명 키를 든다. 인스턴스는 하나다. */
  CLASSROOM: DurableObjectNamespace;
  /** 교안 묶음이 들어 있다. eddmpython-course 저장소가 발행한다. */
  COURSE: KVNamespace;
  /**
   * 운영장 로그인 비밀번호. 배포 때 넣는 유일한 비밀값이다.
   *
   * 한때 `CR_ADMIN_TOKEN` 이었다. 그때는 운영 화면이 운영자 노트북에서 돌고 이 토큰을
   * Bearer 헤더로 얹어 Worker 를 조종했다. 이제 운영장이 서버에 있으므로 사람이 치는
   * 비밀번호이고, 방 비밀번호와 같은 잠금 규칙 아래에서 검사한다.
   */
  ADMIN_PASSWORD?: string;
  /** `npm run classroom:dev`가 preview 방과 `/room-test`에만 주입한다. 배포 환경에는 존재하지 않는다. */
  LOCAL_PREVIEW_BYPASS?: string;
};
