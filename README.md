# ReelBudget

영상제작 프로젝트의 **받을 돈(미수금) · 입금 · 인건비 · 장비 비용**을 정리하는 정산장부 웹·PC 앱입니다.

## 기능

- **아직 받을 돈**: 촬영이 끝났는데 다 못 받은 금액을 맨 위에 크게 표시 (촬영 예정 건은 따로)
- **프로젝트별**: 받을 금액(계약), 입금 내역(계약금·잔금 나눠서), 입금 기한
  - 상태 자동 표시: 미수금 / 일부 입금 / 입금 완료 / 촬영 예정 / 기한 지남
  - 「입금 받음 처리」 한 번으로 남은 금액 입금 기록
- **인건비**: 이름 · 역할 · 금액 · 지급 여부, 인건비 탭에서 사람별 합계와 미지급액
- **장비 비용 / 기타 지출**, 장비 탭에서 항목별 합계
- 연도별 보기
- **구글 캘린더에서 가져오기**: '촬영' · '업무' 캘린더 일정 메모의 `페이: 40` 줄을 받을 금액(40만 원)으로 가져옴. 이미 가져온 일정은 페이·날짜가 바뀌면 알려주고, 입금·인건비 기록은 그대로 둠
- 브라우저 `localStorage` 자동 저장 + (설정 시) Firebase 클라우드 동기화
- JSON 백업 내보내기 / 가져오기
- **데스크톱 앱**: Electron 기반 Windows / macOS / Linux 설치형

## 웹 (모바일 + PC 브라우저)

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`

## PC 데스크톱 앱

개발 모드 (Vite + Electron 창):

```bash
npm run dev:desktop
```

설치 파일 빌드:

```bash
npm run build:desktop
```

`release/` 폴더에 OS별 설치 파일이 생성됩니다.

## 빌드 (웹만)

```bash
npm run build
npm run preview
```

## 계산 검증

```bash
npx --yes tsx scripts/check-money.ts
npx --yes tsx scripts/check-ledger.ts
npx --yes tsx scripts/check-cloud-sync.ts
npx --yes tsx scripts/check-calendar-import.ts
```

## 구글 캘린더 가져오기 설정

로그인에 쓰는 OAuth 클라이언트와 같은 Google Cloud 프로젝트에서:

1. **API 및 서비스 → 라이브러리**에서 **Google Calendar API** 사용 설정
2. **OAuth 동의 화면 → 데이터 액세스(범위)**에 `.../auth/calendar.readonly` 추가

캘린더 토큰은 브라우저 메모리에만 있고 저장하지 않습니다.
