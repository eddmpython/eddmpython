/**
 * 강의방 저장소.
 *
 * 방 목록, 방마다의 열림 상태, 운영장 로그인 상태, 세션 서명 키가 전부 여기 있다.
 * 인스턴스가 하나라 수강생이 여럿이어도 운영자 클릭이 모두에게 같게 반영된다.
 *
 * **이 파일은 화면을 그리지 않고 인증도 하지 않는다.** 어떤 액션이든 부르면 실행한다.
 * 누가 부를 수 있는지는 부르는 쪽이 정한다. 운영장(`admin.ts`)은 로그인한 운영자만,
 * 강의방(`classroom.ts`)은 방 비밀번호를 통과한 수강생만 부른다.
 */
import { LOCK_MS, MAX_FAILS, randomHex, stretch, safeEqual } from "./auth";
import type { Env } from "./env";

/** 방 하나. 비밀번호는 원문을 두지 않고 salt 를 섞어 늘린 해시만 둔다. */
export type Room = {
  slug: string;
  title: string;
  open: boolean;
  unlocked: string[];
  salt: string;
  hash: string;
  /** 세션 세대. 비밀번호를 바꾸면 새로 뽑아 그 전에 들어온 사람을 전부 내보낸다. */
  gen: string;
  created: number;
  fails: number;
  lockedUntil: number;
};

/** 운영장 화면에 보내는 모양. 해시와 salt 는 빼고 보낸다. */
export type PublicRoom = {
  slug: string;
  title: string;
  open: boolean;
  unlocked: string[];
  gen: string;
  created: number;
  lockedUntil: number;
};

/** 운영장 로그인 상태. 비밀번호 자체는 배포 비밀값이라 여기 두지 않는다. */
type AdminAuth = {
  /** 세션 세대. 비밀번호가 바뀌거나 운영자가 끊으면 새로 뽑는다 */
  gen: string;
  /**
   * 지금 통하는 비밀번호의 지문.
   *
   * 배포 비밀값이 바뀐 것을 Worker 는 알 방법이 없다. 로그인에 성공한 비밀번호의 지문을
   * 들고 있다가 달라지면 세대를 돌려, 옛 비밀번호로 받아 간 세션을 그 자리에서 끊는다.
   */
  fingerprint: string;
  fails: number;
  lockedUntil: number;
};

const ROOM_SLUG = /^[a-z0-9][a-z0-9-]{1,30}$/;
/**
 * 방 이름으로 쓸 수 없는 말.
 *
 * `login` 과 `state` 는 방 주소 아래의 경로라 방 이름이 되면 그 방에 못 들어간다.
 * `admin` 은 운영장이고 `api` 는 예약해 둔다.
 */
const RESERVED = new Set(["api", "login", "state", "admin"]);

export function validSlug(slug: string): boolean {
  return ROOM_SLUG.test(slug) && !RESERVED.has(slug);
}

function publicRoom(room: Room): PublicRoom {
  return {
    slug: room.slug,
    title: room.title,
    open: room.open,
    unlocked: room.unlocked,
    gen: room.gen,
    created: room.created,
    lockedUntil: room.lockedUntil,
  };
}

export class Classroom {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async rooms(): Promise<Map<string, Room>> {
    const found = await this.state.storage.list<Room>({ prefix: "room:" });
    return new Map([...found].map(([k, v]) => [k.slice(5), v]));
  }

  private async put(room: Room): Promise<void> {
    await this.state.storage.put(`room:${room.slug}`, room);
  }

  /** 쿠키 서명 키. 처음 필요할 때 만들어 두고 계속 쓴다. 배포 때 넣을 비밀값을 하나 줄인다. */
  private async signKey(): Promise<string> {
    const found = await this.state.storage.get<string>("signKey");
    if (found) return found;
    const made = randomHex(32);
    await this.state.storage.put("signKey", made);
    return made;
  }

  private async adminAuth(): Promise<AdminAuth> {
    const found = await this.state.storage.get<AdminAuth>("admin");
    if (found) return found;
    const made: AdminAuth = { gen: randomHex(8), fingerprint: "", fails: 0, lockedUntil: 0 };
    await this.state.storage.put("admin", made);
    return made;
  }

  async fetch(request: Request): Promise<Response> {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const slug = typeof body.slug === "string" ? body.slug : "";
    const now = Date.now();

    if (action === "signKey") return Response.json({ key: await this.signKey() });

    /* 운영장 -------------------------------------------------------------- */

    /**
     * 화면을 그리기 전에 세션을 확인하는 데 필요한 것 둘을 한 번에 준다.
     * 요청마다 부르므로 왕복을 둘로 늘리지 않는다.
     */
    if (action === "adminSession") {
      const auth = await this.adminAuth();
      return Response.json({ key: await this.signKey(), gen: auth.gen });
    }

    /**
     * 로그인 판정.
     *
     * 비밀번호 비교 자체는 Worker 가 배포 비밀값과 상수 시간으로 한다. 여기는 그 결과를
     * 받아 잠금을 매기는 자리다. **잠겨 있으면 맞았는지 여부와 무관하게 거절한다.**
     */
    if (action === "adminLogin") {
      const auth = await this.adminAuth();
      if (auth.lockedUntil > now) {
        return Response.json({ ok: false, retryAfter: Math.ceil((auth.lockedUntil - now) / 1000) });
      }
      if (!body.ok) {
        auth.fails += 1;
        if (auth.fails >= MAX_FAILS) {
          auth.fails = 0;
          auth.lockedUntil = now + LOCK_MS;
        }
        await this.state.storage.put("admin", auth);
        return Response.json({ ok: false });
      }
      const fingerprint = String(body.fingerprint ?? "");
      if (auth.fingerprint !== fingerprint) {
        // 비밀번호가 바뀌었다. 옛 비밀번호로 받아 간 세션을 여기서 끊는다.
        auth.gen = randomHex(8);
        auth.fingerprint = fingerprint;
      }
      auth.fails = 0;
      auth.lockedUntil = 0;
      await this.state.storage.put("admin", auth);
      return Response.json({ ok: true, gen: auth.gen });
    }

    /** 운영자가 직접 모든 운영 세션을 끊는다. 노트북을 잃어버린 자리에 쓴다. */
    if (action === "adminRotate") {
      const auth = await this.adminAuth();
      auth.gen = randomHex(8);
      await this.state.storage.put("admin", auth);
      return Response.json({ ok: true, gen: auth.gen });
    }

    /* 방 ----------------------------------------------------------------- */

    if (action === "list") {
      const all = [...(await this.rooms()).values()].sort((a, b) => b.created - a.created);
      return Response.json({ rooms: all.map(publicRoom) });
    }

    if (action === "get") {
      const room = (await this.rooms()).get(slug);
      return Response.json({ room: room ? publicRoom(room) : null });
    }

    if (action === "create") {
      if (!validSlug(slug)) {
        return Response.json({ error: "주소로 쓸 수 없는 이름입니다" }, { status: 400 });
      }
      if ((await this.rooms()).has(slug)) {
        return Response.json({ error: "이미 있는 방입니다" }, { status: 409 });
      }
      const password = String(body.password ?? "");
      if (password.length < 4) {
        return Response.json({ error: "비밀번호는 네 자 이상입니다" }, { status: 400 });
      }
      const salt = randomHex(16);
      await this.put({
        slug,
        title: String(body.title ?? slug).slice(0, 60) || slug,
        // 주소와 비밀번호를 먼저 정하고 커리큘럼을 고른 뒤 운영자가 직접 입장을 연다.
        open: false,
        unlocked: [],
        salt,
        hash: await stretch(password, salt),
        gen: randomHex(8),
        created: now,
        fails: 0,
        lockedUntil: 0,
      });
      return Response.json({ ok: true });
    }

    const room = (await this.rooms()).get(slug);
    if (!room) return Response.json({ error: "없는 방입니다" }, { status: 404 });

    if (action === "remove") {
      await this.state.storage.delete(`room:${slug}`);
      return Response.json({ ok: true });
    }

    /**
     * 검수를 마친 방을 수강생에게 줄 제품 주소로 옮긴다.
     *
     * 방을 새로 만들면 기존 비밀번호 원문을 다시 알아야 한다. 주소와 이름만 바꾸면 비밀번호
     * 해시는 그대로 보존할 수 있다. 두 키를 따로 쓰면 중간에 두 방이 보이거나 둘 다 사라질 수
     * 있으므로 한 트랜잭션에서 새 키를 쓰고 옛 키를 지운다.
     */
    if (action === "rename") {
      const nextSlug = typeof body.nextSlug === "string" ? body.nextSlug.trim() : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!validSlug(nextSlug)) {
        return Response.json({ error: "주소로 쓸 수 없는 이름입니다" }, { status: 400 });
      }
      if (!title || title.length > 60) {
        return Response.json({ error: "강의방 이름은 한 자 이상 60자 이하로 적어 주세요" }, { status: 400 });
      }

      const moved = await this.state.storage.transaction(async (txn) => {
        const current = await txn.get<Room>(`room:${slug}`);
        if (!current) return "missing";
        if (nextSlug !== slug && (await txn.get<Room>(`room:${nextSlug}`))) return "exists";

        current.slug = nextSlug;
        current.title = title;
        if (nextSlug !== slug) {
          // 예전 검수 주소에서 받은 세션으로 제품 방에 들어오지 못하게 한다.
          current.gen = randomHex(8);
          current.fails = 0;
          current.lockedUntil = 0;
        }
        await txn.put(`room:${nextSlug}`, current);
        if (nextSlug !== slug) await txn.delete(`room:${slug}`);
        return "ok";
      });

      if (moved === "missing") {
        return Response.json({ error: "없는 방입니다" }, { status: 404 });
      }
      if (moved === "exists") {
        return Response.json({ error: "옮길 주소에 이미 방이 있습니다" }, { status: 409 });
      }
      return Response.json({ ok: true, slug: nextSlug });
    }

    if (action === "password") {
      const password = String(body.password ?? "");
      if (password.length < 4) {
        return Response.json({ error: "비밀번호는 네 자 이상입니다" }, { status: 400 });
      }
      room.salt = randomHex(16);
      room.hash = await stretch(password, room.salt);
      // 세대를 새로 뽑아 앞의 세션을 전부 끊는다. 안 그러면 이미 들어온 사람이 그대로 남는다.
      room.gen = randomHex(8);
      room.fails = 0;
      room.lockedUntil = 0;
      await this.put(room);
      return Response.json({ ok: true });
    }

    /**
     * 로그인 잠금을 푼다.
     *
     * 수강생이 여덟 번 틀리면 5분 막힌다. 강의 중의 5분은 길고, 그 사이 그 사람은 아무것도
     * 못 본다. 비밀번호를 바꾸면 풀리기는 하지만 세대가 돌아 **이미 들어와 있는 사람이 전부
     * 튕긴다.** 한 사람 때문에 강의실 전체를 내보내지 않으려고 따로 둔다.
     */
    if (action === "unlock") {
      room.fails = 0;
      room.lockedUntil = 0;
      await this.put(room);
      return Response.json({ ok: true });
    }

    if (action === "open") {
      room.open = Boolean(body.open);
      // 방을 닫아도 선택한 커리큘럼은 남긴다. 다시 열 때 같은 구성을 그대로 쓸 수 있다.
      await this.put(room);
      return Response.json({ ok: true });
    }

    if (action === "toggle") {
      const category = String(body.category ?? "");
      const at = room.unlocked.indexOf(category);
      if (at >= 0) room.unlocked.splice(at, 1);
      else room.unlocked.push(category);
      await this.put(room);
      return Response.json({ ok: true });
    }

    if (action === "login") {
      if (room.lockedUntil > now) {
        return Response.json({ ok: false, retryAfter: Math.ceil((room.lockedUntil - now) / 1000) });
      }
      const given = await stretch(String(body.password ?? ""), room.salt);
      if (!safeEqual(given, room.hash)) {
        room.fails += 1;
        // 공개 주소에 짧은 비밀번호가 걸려 있다. 계속 두드리면 잠근다.
        if (room.fails >= MAX_FAILS) {
          room.fails = 0;
          room.lockedUntil = now + LOCK_MS;
        }
        await this.put(room);
        return Response.json({ ok: false });
      }
      if (room.fails || room.lockedUntil) {
        room.fails = 0;
        room.lockedUntil = 0;
        await this.put(room);
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "모르는 동작입니다" }, { status: 400 });
  }
}

export type Call = { status: number; data: Record<string, any> };

export async function call(env: Env, body: Record<string, unknown>): Promise<Call> {
  const stub = env.CLASSROOM.get(env.CLASSROOM.idFromName("main"));
  const res = await stub.fetch("https://classroom/do", { method: "POST", body: JSON.stringify(body) });
  return { status: res.status, data: (await res.json()) as Record<string, any> };
}
