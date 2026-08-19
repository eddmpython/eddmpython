# 강의장 로컬 테스트. 바탕화면 바로가기 "eddmpython 강의장 테스트" 가 이 파일을 부른다.
#
# 하는 일 다섯이다.
#   1. course/curriculum 을 Worker 번들용 모듈로 다시 굽는다
#   2. 운영 설정과 .dev.vars 의 토큰을 맞춘다
#   3. 클라이언트 빌드 산출물이 없으면 만든다 (강의장만 볼 거면 없어도 되지만 /blog 가 깨진다)
#   4. 운영 화면을 따로 띄운다. 로컬 대상으로 잡혀 있다
#   5. wrangler dev 를 띄운다
#
# 교안을 고친 뒤 다시 실행하면 1번이 최신 내용을 반영한다.

$ErrorActionPreference = 'Stop'
$site = Split-Path -Parent $PSScriptRoot
$repo = Split-Path -Parent $site
Set-Location $site

Write-Host ''
Write-Host '  강의장 로컬 테스트' -ForegroundColor Cyan
Write-Host '  ------------------'

Write-Host '  1/4  교안을 다시 굽는 중...' -ForegroundColor DarkGray
node scripts/build-course.mjs

Write-Host '  2/4  운영 토큰을 맞추는 중...' -ForegroundColor DarkGray
node scripts/classroom-admin.mjs --sync-only

$dist = Join-Path $repo '..\eddmpython.out\site-dist'
if (-not (Test-Path $dist)) {
    Write-Host '  3/4  사이트 빌드가 없어 새로 만드는 중... (처음 한 번만 오래 걸립니다)' -ForegroundColor DarkGray
    npx vite build
} else {
    Write-Host '  3/4  사이트 빌드 있음. 건너뜁니다' -ForegroundColor DarkGray
}

Start-Process powershell -ArgumentList @(
    '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command',
    "Set-Location '$site'; node scripts/classroom-admin.mjs --open"
)

Write-Host ''
Write-Host '  운영 화면   http://127.0.0.1:8799  (따로 열린 창)' -ForegroundColor Cyan
Write-Host '  수강생      http://localhost:8787/cr/<만든 이름>' -ForegroundColor Cyan
Write-Host ''
Write-Host '  운영 화면에서 강의장을 만들면 그 주소가 바로 생깁니다' -ForegroundColor DarkGray
Write-Host '  Ctrl+C 로 끕니다' -ForegroundColor DarkGray
Write-Host ''

Write-Host '  4/4  wrangler dev 시작' -ForegroundColor DarkGray
# 상태는 저장소 밖에 둔다. 다만 --persist-to 는 스토리지만 옮기고 번들과 임시 파일은
# 여전히 site/.wrangler 에 생긴다. wrangler 가 그 경로를 바꾸는 방법을 주지 않으므로
# 끝나는 자리에서 지운다.
try {
    npx wrangler dev --port 8787 --persist-to ../../eddmpython.out/wrangler-state
} finally {
    node scripts/clean-wrangler.mjs
}
