import type { CalendarEvent } from './calendarImport'

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

/** 가져올 캘린더 이름 (구글 캘린더에 보이는 이름 그대로) */
export const IMPORT_CALENDARS = ['촬영', '업무'] as const

const API = 'https://www.googleapis.com/calendar/v3'

export class CalendarApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function get<T>(token: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API + path)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    let reason = ''
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      reason = body.error?.message ?? ''
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new CalendarApiError('구글 연결이 만료됐어요. 다시 연결해 주세요.', 401)
    if (res.status === 403) {
      throw new CalendarApiError(
        `캘린더를 읽을 권한이 없어요. Google Cloud에서 Calendar API가 켜져 있는지 확인해 주세요.${reason ? ` (${reason})` : ''}`,
        403,
      )
    }
    throw new CalendarApiError(`캘린더를 불러오지 못했어요. (${res.status}${reason ? ` ${reason}` : ''})`, res.status)
  }
  return (await res.json()) as T
}

interface CalendarListEntry {
  id: string
  summary?: string
  summaryOverride?: string
}

/** 이름이 '촬영' · '업무'인 캘린더를 찾는다. 없는 이름은 missing으로 돌려준다 */
export async function findImportCalendars(token: string) {
  const list = await get<{ items?: CalendarListEntry[] }>(token, '/users/me/calendarList', {
    maxResults: '250',
  })
  const items = list.items ?? []
  const found: { name: string; id: string }[] = []
  const missing: string[] = []
  for (const name of IMPORT_CALENDARS) {
    const hit = items.find((c) => (c.summaryOverride ?? c.summary)?.trim() === name)
    if (hit) found.push({ name, id: hit.id })
    else missing.push(name)
  }
  return { found, missing }
}

/** 기간 안의 일정. 반복 일정은 하루씩 펼쳐서 받는다 */
export async function listEvents(
  token: string,
  calendarId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = []
  let pageToken = ''
  do {
    const page = await get<{ items?: CalendarEvent[]; nextPageToken?: string }>(
      token,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
        ...(pageToken ? { pageToken } : {}),
      },
    )
    events.push(...(page.items ?? []))
    pageToken = page.nextPageToken ?? ''
  } while (pageToken)
  return events
}
