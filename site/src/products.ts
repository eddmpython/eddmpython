export type Product = {
  id: string;
  name: string;
  /* Tailwind 색 유틸 클래스. 제품별 포인트 컬러 (브랜드 아키텍처 시트 기준). */
  dotClass: string;
  status: string;
  tagline: string;
  description: string;
  /* 제품이 실제로 하는 일. 확인된 동작만 적는다. */
  points: string[];
  /* 실제 제품 화면 캡처를 배경 위에 합성한 에셋. */
  heroShot: string;
  shotAlt: string;
  install?: string;
  /* 이 제품 섹션에 붙는 실행 셀. 전부 pyproc 머신 위에서 돈다. */
  cells?: Array<{ label: string; code: string }>;
  cellPackages?: string[];
  /* 기본 코드 셀 대신 시트 데모를 붙인다 (xlpod). */
  cellKind?: "sheet";
  cellNote?: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

export const PRODUCTS: Product[] = [
  {
    id: "dartlab",
    name: "DartLab",
    dotClass: "bg-dartlab",
    status: "PyPI 배포 중",
    tagline: "종목코드 하나. 기업의 전체 이야기.",
    description:
      "한국 DART 와 미국 SEC EDGAR 공시를 한 줄의 Python 으로 읽고 비교하는 라이브러리입니다.",
    points: [
      "재무제표, 비율, 신용위험, 산업 위치를 Company 인터페이스 하나로",
      "한국과 미국 기업을 같은 문법으로 대칭 비교",
      "공시뷰어로 분기 보고서 원문을 나란히 비교",
      "2,664 개 상장사 전종목 스캔과 34 개 산업 지도",
    ],
    heroShot: "/shots/hero-viewer.webp",
    shotAlt: "DartLab 공시뷰어에서 분기 보고서를 나란히 비교하는 화면",
    install: "pip install dartlab",
    cells: [
      {
        label: "기업 열기",
        code: `import dartlab

c = dartlab.Company("005930")
c`,
      },
      {
        label: "재무제표",
        code: `import dartlab

c = dartlab.Company("005930")
c.panel("IS")`,
      },
      {
        label: "비율",
        code: `import dartlab

c = dartlab.Company("005930")
c.panel("ratios")`,
      },
      {
        label: "전체 이야기",
        code: `import dartlab

c = dartlab.Company("005930")
c.story()`,
      },
    ],
    cellPackages: ["dartlab"],
    cellNote:
      "종목코드를 바꿔도 됩니다. 첫 실행은 런타임과 DartLab 을 받느라 30초쯤 걸립니다.",
    primary: { label: "문서 보기", href: "https://eddmpython.github.io/dartlab/" },
    secondary: { label: "GitHub", href: "https://github.com/eddmpython/dartlab" },
  },
  {
    id: "codaro",
    name: "Codaro",
    dotClass: "bg-codaro",
    status: "베타",
    tagline: "다운로드 없이 시작하는 Python 학습.",
    description:
      "브라우저에서 배우고, 고치고, 바로 실행합니다. 설치도 가입도 필요 없습니다.",
    points: [
      "문법 목차가 아니라 남길 결과를 기준으로 472 개 레슨",
      "예제를 고쳐서 실행하고 결과를 즉시 확인",
      "실제 파일과 패키지가 필요해지면 Local 스튜디오로 이어짐",
      "학습 상태를 그대로 들고 넘어가 예약 자동화까지",
    ],
    heroShot: "/shots/hero-learn.webp",
    shotAlt: "Codaro 학습 페이지에서 결과 기준으로 레슨을 고르는 화면",
    cells: [
      {
        label: "레슨: 값 모으기",
        code: `# 도시별 매출을 합쳐 1위를 찾습니다. 숫자를 바꿔 보세요
sales = [("서울", 120), ("부산", 85), ("대구", 64), ("서울", 40)]

total = {}
for city, amount in sales:
    total[city] = total.get(city, 0) + amount

top = max(total, key=total.get)
f"{total} 에서 1위는 {top}"`,
      },
      {
        label: "레슨: 조건으로 거르기",
        code: `# 조건에 맞는 것만 남깁니다.
items = [
    {"name": "노트북", "price": 1_450_000},
    {"name": "마우스", "price": 32_000},
    {"name": "모니터", "price": 280_000},
]

cheap = [i["name"] for i in items if i["price"] < 300_000]
f"30만원 미만: {cheap}"`,
      },
    ],
    cellNote: "Codaro 학습 카드와 같은 방식입니다. 고쳐서 바로 실행해 보세요",
    primary: { label: "Web Learn 열기", href: "https://eddmpython.github.io/codaro/" },
    secondary: {
      label: "Windows 런처",
      href: "https://github.com/eddmpython/codaro/releases/latest",
    },
  },
  {
    id: "xlpod",
    name: "xlpod",
    dotClass: "bg-xlpod",
    status: "라이브",
    tagline: "셀 수식 안에서 진짜 Python 이 도는 스프레드시트.",
    description:
      "Excel 과 Google Sheets 를 오가는 사용자를 위한 비공개 작업공간입니다.",
    points: [
      "원본 Excel, Google Sheets, OneDrive, SharePoint 를 그대로 열기",
      "셀 수식 안에서 Python 을 동기 실행",
      "필요한 방법을 시트 안에서 배우고 바로 적용",
      "결과를 원본에 안전하게 되돌려 저장",
    ],
    heroShot: "/shots/hero-xlpod.webp",
    shotAlt: "xlpod 시작 화면: Excel, Google Drive, OneDrive, SharePoint 연결",
    cellKind: "sheet",
    cellNote: "xlpod 은 이 방식으로 셀 수식이 Python 함수를 부릅니다.",
    primary: { label: "앱 열기", href: "https://xlpod.eddmpython.com/" },
  },
  {
    id: "pyproc",
    name: "pyproc",
    dotClass: "bg-pyproc",
    status: "npm 배포 중",
    tagline: "브라우저 안에 살아 있는 Python 컴퓨터.",
    description:
      "서버 없이 탭 안에서 진짜 CPython 을 돌리고, 그 상태를 탭이 닫혀도 유지합니다. 이 페이지의 모든 실행 셀이 pyproc 위에서 돕니다.",
    points: [
      "애플리케이션 서버 없이 브라우저 안에서 실제 CPython 실행",
      "탭을 닫아도 살아남는 영속 머신과 여러 탭 공유",
      "체크포인트와 되감기, git 처럼 갈라지는 실행 히스토리",
      "워커마다 독립 인터프리터로 실제 병렬 처리",
      "서명된 머신 이미지로 통째 이식",
    ],
    heroShot: "/shots/hero-pyproc.webp",
    shotAlt: "pyproc 데모 페이지: 브라우저 안 영속 Python 컴퓨터",
    install: "npm install pyproc",
    cells: [
      {
        label: "상태가 남는다",
        code: `# 실행을 두 번 눌러 보세요 머신이 값을 기억합니다.
counter = globals().get("counter", 0) + 1
f"이 머신에서 {counter} 번째 실행"`,
      },
      {
        label: "무거운 준비는 한 번만",
        code: `# 한 번 만든 데이터는 다음 실행에도 그대로 있습니다.
if "data" not in globals():
    data = list(range(1_000_000))

f"{len(data):,} 개 유지 중 · 합계 {sum(data):,}"`,
      },
      {
        label: "위 셀이 남긴 것",
        code: `# DartLab 이나 xlpod 셀을 먼저 돌렸다면 그 결과가 여기 그대로 있습니다.
sorted(k for k in globals() if not k.startswith("_"))`,
      },
    ],
    cellNote:
      "같은 머신을 페이지 전체가 나눠 씁니다. 위 제품 셀을 먼저 돌리고 여기서 확인해 보세요",
    primary: { label: "데모 열기", href: "https://eddmpython.github.io/pyproc/" },
    secondary: { label: "GitHub", href: "https://github.com/eddmpython/pyproc" },
  },
];
