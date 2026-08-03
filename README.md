# ReelBudget

영상제작 프로젝트 예산을 다중으로 관리하는 웹·PC 앱입니다.

## 기능

- **다중 프로젝트**: 생성 · 삭제 · 목록에서 합산 순수익 확인
- **세부 비용 카테고리**: 인건비, 출연료, 식비, 교통비, 장비대여비, 로케이션비 등
- **지출 CRUD** 및 카테고리 필터
- **최종 순수익**: 계약·매출 − 총 집행 비용 (마진율 포함)
- **PC 레이아웃**: 1024px 이상에서 사이드바 + 2열 대시보드
- **데스크톱 앱**: Electron 기반 Windows / macOS / Linux 설치형
- 브라우저 `localStorage` 자동 저장

## 웹 (모바일 + PC 브라우저)

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` — 화면 너비 1024px 이상이면 PC 레이아웃이 적용됩니다.

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
