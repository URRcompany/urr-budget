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
```
