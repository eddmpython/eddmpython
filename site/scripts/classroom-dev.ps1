# 강의장 로컬 테스트. 바탕화면 바로가기 "eddmpython 강의장 테스트" 가 이 파일을 부른다.
#
# 하는 일 다섯이다.
#   1. 형제 저장소 eddmpython-course 의 교안을 로컬 KV 에 넣는다
#   2. 운영 설정과 .dev.vars 의 토큰을 맞춘다
#   3. 클라이언트 빌드 산출물이 없으면 만든다 (강의장만 볼 거면 없어도 되지만 /blog 가 깨진다)
#   4. 운영 화면을 따로 띄운다. 로컬 대상으로 잡혀 있다
#   5. wrangler dev 를 띄운다
#
# 교안을 고친 뒤 다시 실행하면 1번이 최신 내용을 반영한다.
# 교안만 바꿨으면 eddmpython-course 에서 npm run publish:local 만 해도 된다.

$ErrorActionPreference = 'Stop'
$site = Split-Path -Parent $PSScriptRoot
$repo = Split-Path -Parent $site
Set-Location $site

Write-Host ''
Write-Host '  강의장 로컬 테스트' -ForegroundColor Cyan
Write-Host '  ------------------'

# 8787 을 이미 누가 잡고 있으면 새로 띄운 것이 아니라 그쪽이 응답한다. 두 번 당했다.
# 옛 코드가 답하는데 새 코드를 시험하고 있다고 믿는 것이 제일 나쁘다.
$busy = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    Write-Host ''
    Write-Host '  8787 을 이미 다른 프로세스가 쓰고 있습니다' -ForegroundColor Red
    foreach ($c in $busy) {
        $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
        Write-Host "    PID $($c.OwningProcess)  $($p.ProcessName)  시작 $($p.StartTime)"
    }
    Write-Host ''
    Write-Host '  그대로 두면 새 코드가 아니라 그쪽이 응답합니다. 먼저 끄세요' -ForegroundColor Yellow
    Read-Host '  엔터를 누르면 닫습니다'
    exit 1
}

Write-Host '  1/4  교안을 로컬 강의장에 넣는 중...' -ForegroundColor DarkGray
$course = Join-Path $repo '..\eddmpython-course'
if (Test-Path $course) {
    Push-Location $course
    node scripts/publish.mjs --local
    Pop-Location
} else {
    Write-Host '  교안 저장소가 없습니다. 강의장이 빈 채로 뜹니다' -ForegroundColor Yellow
    Write-Host '  git clone https://github.com/eddmpython/eddmpython-course ..\..\eddmpython-course' -ForegroundColor DarkGray
}

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
