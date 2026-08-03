export type CategoryId =
  | 'cast'
  | 'crew'
  | 'equipment'
  | 'location'
  | 'art'
  | 'catering'
  | 'post'
  | 'other'

export interface Category {
  id: CategoryId
  name: string
  color: string
  planned: number
}

export interface Expense {
  id: string
  title: string
  amount: number
  categoryId: CategoryId
  date: string
  note: string
  vendor: string
}

export interface Project {
  name: string
  client: string
  shootDate: string
  totalBudget: number
  categories: Category[]
  expenses: Expense[]
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cast', name: '출연·캐스팅', color: '#C4782A', planned: 0 },
  { id: 'crew', name: '스태프', color: '#2A6F7C', planned: 0 },
  { id: 'equipment', name: '장비 렌탈', color: '#5B6B3A', planned: 0 },
  { id: 'location', name: '로케이션', color: '#8B4D6B', planned: 0 },
  { id: 'art', name: '미술·소품', color: '#B85C38', planned: 0 },
  { id: 'catering', name: '식대·교통', color: '#3D6B5A', planned: 0 },
  { id: 'post', name: '후반작업', color: '#4A5E8C', planned: 0 },
  { id: 'other', name: '기타', color: '#6B6B6B', planned: 0 },
]

export function createSampleProject(): Project {
  return {
    name: '브랜드 필름 — 새벽의 레시피',
    client: '한빛 키친',
    shootDate: '2026-09-12',
    totalBudget: 28_000_000,
    categories: [
      { id: 'cast', name: '출연·캐스팅', color: '#C4782A', planned: 6_000_000 },
      { id: 'crew', name: '스태프', color: '#2A6F7C', planned: 7_500_000 },
      { id: 'equipment', name: '장비 렌탈', color: '#5B6B3A', planned: 4_200_000 },
      { id: 'location', name: '로케이션', color: '#8B4D6B', planned: 2_800_000 },
      { id: 'art', name: '미술·소품', color: '#B85C38', planned: 1_800_000 },
      { id: 'catering', name: '식대·교통', color: '#3D6B5A', planned: 1_200_000 },
      { id: 'post', name: '후반작업', color: '#4A5E8C', planned: 3_500_000 },
      { id: 'other', name: '기타', color: '#6B6B6B', planned: 1_000_000 },
    ],
    expenses: [
      {
        id: 'e1',
        title: '메인 모델 출연료',
        amount: 3_500_000,
        categoryId: 'cast',
        date: '2026-08-20',
        note: '1일 촬영',
        vendor: '에이전시 루나',
      },
      {
        id: 'e2',
        title: '카메라·렌즈 패키지',
        amount: 1_850_000,
        categoryId: 'equipment',
        date: '2026-08-25',
        note: 'Alexa Mini + 프라임 세트',
        vendor: '시네렌탈',
      },
      {
        id: 'e3',
        title: '스튜디오 대여',
        amount: 1_200_000,
        categoryId: 'location',
        date: '2026-09-12',
        note: '키친 세트 스튜디오',
        vendor: '프레임워크 스튜디오',
      },
      {
        id: 'e4',
        title: 'DP / 조명팀',
        amount: 2_400_000,
        categoryId: 'crew',
        date: '2026-09-12',
        note: '촬영일 1일',
        vendor: '',
      },
      {
        id: 'e5',
        title: '푸드 스타일링',
        amount: 680_000,
        categoryId: 'art',
        date: '2026-09-11',
        note: '메뉴 3종',
        vendor: '플레이팅 랩',
      },
      {
        id: 'e6',
        title: '촬영일 케이터링',
        amount: 420_000,
        categoryId: 'catering',
        date: '2026-09-12',
        note: '12인분',
        vendor: '테이블나인',
      },
      {
        id: 'e7',
        title: '색보정·마스터',
        amount: 1_500_000,
        categoryId: 'post',
        date: '2026-09-20',
        note: '60초 컷 기준',
        vendor: '그레이드룸',
      },
    ],
  }
}
