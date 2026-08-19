# 강의장 운영. 바탕화면 바로가기 "eddmpython 강의장 운영" 이 이 파일을 부른다.
#
# 강의장에 가서 여는 화면이다. 운영 화면은 이 노트북에만 뜨고 공개 서버에는 없다.
# 여기서 강의장을 만들면 그 자리에서 주소가 살아난다. 비밀번호도 여기서 건다.
#
# 대상과 토큰은 site/.classroom-admin.json 에 있다. 처음 실행하면 만들어 준다.

$ErrorActionPreference = 'Stop'
$site = Split-Path -Parent $PSScriptRoot
Set-Location $site

Write-Host ''
Write-Host '  강의장 운영' -ForegroundColor Cyan
Write-Host '  -----------'
Write-Host '  이 창을 닫으면 운영 화면도 닫힙니다' -ForegroundColor DarkGray

node scripts/classroom-admin.mjs --open
