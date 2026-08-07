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
  /* 이 제품 섹션에 실행 가능한 Python 셀을 붙인다. */
  cell?: string;
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
    primary: { label: "앱 열기", href: "https://xlpod.eddmpython.com/" },
  },
  {
    id: "pyproc",
    name: "pyproc",
    dotClass: "bg-pyproc",
    status: "npm 배포 중",
    tagline: "브라우저 안에 살아 있는 Python 컴퓨터.",
    description:
      "서버 없이 탭 안에서 진짜 CPython 을 돌리고, 그 상태를 탭이 닫혀도 유지합니다. 아래 셀이 바로 pyproc 으로 돌아갑니다.",
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
    cell: 'total = sum(range(1, 101))\nf"1 부터 100 까지 합은 {total}"',
    primary: { label: "데모 열기", href: "https://eddmpython.github.io/pyproc/" },
    secondary: { label: "GitHub", href: "https://github.com/eddmpython/pyproc" },
  },
];
