export interface Category {
  id: string
  name: string
  color: string
  planned: number
}

export interface Expense {
  id: string
  title: string
  amount: number
  categoryId: string
  date: string
  note: string
  vendor: string
}

export interface Project {
  id: string
  name: string
  client: string
  shootDate: string
  /** 클라이언트 계약·매출 금액 */
  revenue: number
  /** 제작 예산 한도 */
  totalBudget: number
  categories: Category[]
  expenses: Expense[]
  createdAt: string
}

export interface AppStore {
  version: 2
  projects: Project[]
  activeProjectId: string | null
}

export const CATEGORY_PALETTE = [
  '#C4782A',
  '#2A6F7C',
  '#5B6B3A',
  '#8B4D6B',
  '#B85C38',
  '#3D6B5A',
  '#4A5E8C',
  '#6B5A3D',
  '#7A4E4E',
  '#4E6B7A',
  '#6B6B6B',
  '#8C6B3A',
]

/** 영상제작 세부 비용 카테고리 기본값 */
export const DEFAULT_CATEGORY_DEFS: Omit<Category, 'planned'>[] = [
  { id: 'labor', name: '인건비', color: '#2A6F7C' },
  { id: 'cast', name: '출연료', color: '#C4782A' },
  { id: 'meals', name: '식비', color: '#3D6B5A' },
  { id: 'transport', name: '교통비', color: '#4E6B7A' },
  { id: 'equipment', name: '장비대여비', color: '#5B6B3A' },
  { id: 'location', name: '로케이션비', color: '#8B4D6B' },
  { id: 'art', name: '미술·소품', color: '#B85C38' },
  { id: 'post', name: '후반작업', color: '#4A5E8C' },
  { id: 'insurance', name: '보험·허가', color: '#7A4E4E' },
  { id: 'other', name: '기타', color: '#6B6B6B' },
]

export function createDefaultCategories(
  planned: Partial<Record<string, number>> = {},
): Category[] {
  return DEFAULT_CATEGORY_DEFS.map((c) => ({
    ...c,
    planned: planned[c.id] ?? 0,
  }))
}

export function createEmptyProject(partial?: Partial<Project>): Project {
  const now = new Date().toISOString()
  return {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: '새 프로젝트',
    client: '',
    shootDate: '',
    revenue: 0,
    totalBudget: 0,
    categories: createDefaultCategories(),
    expenses: [],
    createdAt: now,
    ...partial,
  }
}

export function createSampleProjects(): Project[] {
  return [
    {
      id: 'p_sample_dawn',
      name: '브랜드 필름 — 새벽의 레시피',
      client: '한빛 키친',
      shootDate: '2026-09-12',
      revenue: 35_000_000,
      totalBudget: 28_000_000,
      createdAt: '2026-07-01T00:00:00.000Z',
      categories: createDefaultCategories({
        labor: 6_500_000,
        cast: 5_000_000,
        meals: 800_000,
        transport: 600_000,
        equipment: 4_200_000,
        location: 2_800_000,
        art: 1_800_000,
        post: 3_500_000,
        insurance: 500_000,
        other: 1_000_000,
      }),
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
          title: 'DP / 조명팀',
          amount: 2_400_000,
          categoryId: 'labor',
          date: '2026-09-12',
          note: '촬영일 1일',
          vendor: '',
        },
        {
          id: 'e3',
          title: '카메라·렌즈 패키지',
          amount: 1_850_000,
          categoryId: 'equipment',
          date: '2026-08-25',
          note: 'Alexa Mini + 프라임 세트',
          vendor: '시네렌탈',
        },
        {
          id: 'e4',
          title: '스튜디오 대여',
          amount: 1_200_000,
          categoryId: 'location',
          date: '2026-09-12',
          note: '키친 세트 스튜디오',
          vendor: '프레임워크 스튜디오',
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
          categoryId: 'meals',
          date: '2026-09-12',
          note: '12인분',
          vendor: '테이블나인',
        },
        {
          id: 'e7',
          title: '팀 이동·주차',
          amount: 180_000,
          categoryId: 'transport',
          date: '2026-09-12',
          note: '밴 1대',
          vendor: '',
        },
        {
          id: 'e8',
          title: '색보정·마스터',
          amount: 1_500_000,
          categoryId: 'post',
          date: '2026-09-20',
          note: '60초 컷 기준',
          vendor: '그레이드룸',
        },
      ],
    },
    {
      id: 'p_sample_mv',
      name: '뮤직비디오 — Night Drive',
      client: '소울웨이브',
      shootDate: '2026-10-05',
      revenue: 18_000_000,
      totalBudget: 14_000_000,
      createdAt: '2026-07-15T00:00:00.000Z',
      categories: createDefaultCategories({
        labor: 4_000_000,
        cast: 2_000_000,
        meals: 500_000,
        transport: 800_000,
        equipment: 3_000_000,
        location: 1_500_000,
        art: 900_000,
        post: 2_000_000,
        insurance: 300_000,
        other: 500_000,
      }),
      expenses: [
        {
          id: 'e9',
          title: '카메라 오퍼레이터',
          amount: 1_200_000,
          categoryId: 'labor',
          date: '2026-10-05',
          note: '',
          vendor: '',
        },
        {
          id: 'e10',
          title: '야간 로케이션 허가',
          amount: 450_000,
          categoryId: 'location',
          date: '2026-09-28',
          note: '한강 야경',
          vendor: '',
        },
        {
          id: 'e11',
          title: '짐벌·라이트 렌탈',
          amount: 780_000,
          categoryId: 'equipment',
          date: '2026-10-04',
          note: '2일',
          vendor: '시네렌탈',
        },
      ],
    },
  ]
}

export function projectSpent(project: Project): number {
  return project.expenses.reduce((sum, e) => sum + e.amount, 0)
}

export function projectNetProfit(project: Project): number {
  return project.revenue - projectSpent(project)
}

export function projectMargin(project: Project): number | null {
  if (project.revenue <= 0) return null
  return projectNetProfit(project) / project.revenue
}
