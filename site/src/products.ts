export type Product = {
  id: string;
  name: string;
  /* Tailwind 색 유틸 클래스. 제품별 포인트 컬러 (브랜드 아키텍처 시트 기준). */
  dotClass: string;
  status: string;
  tagline: string;
  description: string;
  /* 실제 제품 화면 캡처. 가짜 목업을 쓰지 않는다. */
  shot: string;
  shotAlt: string;
  /* 카드 썸네일에서 추가로 적용할 이미지 클래스 (줌 등) */
  shotClass?: string;
  /* 히어로 뷰어 슬라이드에서 적용할 이미지 클래스 */
  heroShotClass?: string;
  install?: string;
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
      "한국 DART와 미국 SEC EDGAR 공시를 한 줄의 Python으로 읽고 비교하는 라이브러리입니다. 재무제표·비율·신용위험·산업·매크로를 Company 인터페이스 하나로 다룹니다.",
    shot: "/shots/dartlab.webp",
    shotAlt: "DartLab Terminal에서 삼성전자를 분석하는 화면",
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
      "브라우저에서 배우고, 고치고, 바로 실행합니다. 실제 파일과 패키지, 예약 자동화가 필요해지면 같은 학습 상태를 그대로 Local 스튜디오로 이어갑니다.",
    shot: "/shots/codaro.webp",
    shotAlt: "Codaro Web Learn에서 브라우저로 Python을 실행하는 화면",
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
    tagline: "셀 수식 안에서 진짜 Python이 도는 스프레드시트.",
    description:
      "Excel과 Google Sheets를 오가는 사용자를 위한 비공개 작업공간입니다. 실제 데이터를 열고, 방법을 배우고, 반복 작업을 자동화해 결과를 원본에 안전하게 저장합니다.",
    shot: "/shots/xlpod.webp",
    shotAlt: "xlpod 시작 화면: Excel, Google Drive, OneDrive, SharePoint 연결",
    shotClass: "scale-[1.6] group-hover:scale-[1.66]",
    heroShotClass: "scale-[1.25]",
    primary: { label: "앱 열기", href: "https://xlpod.eddmpython.com/" },
  },
];
