# ReelBudget

영상제작 프로젝트의 **수입 · 인건비 · 월 수익**만 간단하게 기록하는 웹·PC 앱입니다.

## 기능

- **월별 수익**: 홈에서 달을 넘기며 그 달의 수입 − 지출 = 수익 확인
- **프로젝트별 기록** — 딱 네 가지만 입력
  - **수입**: 실제로 받은 금액과 받은 날
  - **인건비**: 사람별(이름 · 역할 · 금액 · 날짜), 같은 사람은 자동 합계
  - **장비 렌탈**
  - **식비·기타** (식비, 비품 등)
- 월 집계는 각 기록의 날짜 기준
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
npx --yes tsx scripts/check-cloud-sync.ts
```
