# 강의장 로컬 테스트. 바탕화면 바로가기가 이 파일을 부른다.
#
# 하는 일 넷이다.
#   1. course/curriculum 을 Worker 번들용 모듈로 다시 굽는다
#   2. 클라이언트 빌드 산출물이 없으면 만든다 (강의장만 볼 거면 없어도 되지만 /blog 가 깨진다)
#   3. wrangler dev 를 띄운다
#   4. 브라우저로 운영자 화면과 강의장을 연다
#
# 교안을 고친 뒤 다시 실행하면 1번이 최신 내용을 반영한다.

$ErrorActionPreference = 'Stop'
$site = Split-Path -Parent $PSScriptRoot
$repo = Split-Path -Parent $site
Set-Location $site

Write-Host ''
Write-Host '  강의장 로컬 테스트' -ForegroundColor Cyan
Write-Host '  ------------------'

if (-not (Test-Path (Join-Path $site '.dev.vars'))) {
    Write-Host '  .dev.vars 가 없습니다. site/.dev.vars.example 를 복사해서 값을 채우세요' -ForegroundColor Yellow
    Read-Host '  엔터를 누르면 닫습니다'
    exit 1
}

Write-Host '  1/3  교안을 다시 굽는 중...' -ForegroundColor DarkGray
node scripts/build-course.mjs

$dist = Join-Path $repo '..\eddmpython.out\site-dist'
if (-not (Test-Path $dist)) {
    Write-Host '  2/3  사이트 빌드가 없어 새로 만드는 중... (처음 한 번만 오래 걸립니다)' -ForegroundColor DarkGray
    npx vite build
} else {
    Write-Host '  2/3  사이트 빌드 있음. 건너뜁니다' -ForegroundColor DarkGray
}

$vars = Get-Content (Join-Path $site '.dev.vars') | Where-Object { $_ -match '^CR_(PASSWORD|ADMIN_KEY)=' }
Write-Host ''
Write-Host '  들어가는 곳' -ForegroundColor Cyan
Write-Host '    수강생   http://localhost:8787/cr'
Write-Host '    운영자   http://localhost:8787/cr/admin'
foreach ($v in $vars) {
    $parts = $v -split '=', 2
    $label = if ($parts[0] -eq 'CR_PASSWORD') { '강의장 비밀번호' } else { '운영자 키    ' }
    Write-Host "    $label  $($parts[1])" -ForegroundColor DarkGray
}
Write-Host ''
Write-Host '  Ctrl+C 로 끕니다' -ForegroundColor DarkGray
Write-Host ''

Start-Job -ScriptBlock {
    Start-Sleep -Seconds 4
    Start-Process 'http://localhost:8787/cr/admin'
} | Out-Null

Write-Host '  3/3  wrangler dev 시작' -ForegroundColor DarkGray
npx wrangler dev --port 8787
