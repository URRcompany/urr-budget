import type { Category, Expense, Project } from '../types'
import { formatDate, formatKRW } from './format'

/** 기본 카테고리 ID (`DEFAULT_CATEGORY_DEFS`) */
export const EQUIPMENT_CATEGORY_ID = 'equipment'

const EQUIPMENT_NAME_RE = /장비/

/** 장비대여 카테고리인지 (기본 ID 또는 이름에 '장비' 포함) */
export function isEquipmentCategory(category: Category | undefined): boolean {
  if (!category) return false
  if (category.id === EQUIPMENT_CATEGORY_ID) return true
  return EQUIPMENT_NAME_RE.test(category.name)
}

/** 프로젝트에 등록된 장비대여 지출 (날짜 오름차순) */
export function getEquipmentExpenses(project: Project): Expense[] {
  const categoryById = new Map(project.categories.map((c) => [c.id, c]))
  return project.expenses
    .filter((e) => isEquipmentCategory(categoryById.get(e.categoryId)))
    .slice()
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date)
      if (byDate !== 0) return byDate
      return a.title.localeCompare(b.title, 'ko')
    })
}

function formatShareDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const m = d.getMonth() + 1
  const day = d.getDate()
  return `${m}/${day}`
}

/**
 * 카카오톡 등에 붙여넣기 좋은 장비대여 목록 텍스트.
 * 이모지·마크다운 없이 줄바꿈 위주의 평문.
 */
export function formatEquipmentShareText(project: Project): string {
  const items = getEquipmentExpenses(project)
  const lines: string[] = []

  lines.push(`[장비대여] ${project.name}`)
  if (project.client.trim()) {
    lines.push(`클라이언트: ${project.client.trim()}`)
  }
  if (project.shootDate) {
    lines.push(`촬영일: ${formatDate(project.shootDate)}`)
  }
  lines.push('')

  if (items.length === 0) {
    lines.push('등록된 장비대여 내역이 없습니다.')
    return lines.join('\n')
  }

  for (const [i, e] of items.entries()) {
    const parts = [e.title.trim() || '장비']
    if (e.vendor.trim()) parts.push(e.vendor.trim())
    parts.push(formatKRW(e.amount))
    if (e.date) parts.push(formatShareDate(e.date))
    lines.push(`${i + 1}. ${parts.join(' · ')}`)
    if (e.note.trim()) {
      lines.push(`   └ ${e.note.trim()}`)
    }
  }

  const total = items.reduce((sum, e) => sum + e.amount, 0)
  lines.push('')
  lines.push(`합계 ${items.length}건 · ${formatKRW(total)}`)

  return lines.join('\n')
}

/** 클립보드 복사 (Clipboard API 실패 시 textarea fallback) */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through
    }
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** 장비대여 목록을 카톡 공유용으로 클립보드에 복사 */
export async function copyEquipmentShareText(
  project: Project,
): Promise<{ ok: boolean; text: string; count: number }> {
  const text = formatEquipmentShareText(project)
  const count = getEquipmentExpenses(project).length
  const ok = await copyTextToClipboard(text)
  return { ok, text, count }
}
