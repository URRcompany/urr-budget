import { APP_NAME, COMPANY_NAME } from '../lib/brand'

interface AppBrandProps {
  /** sm: 프로젝트 상단·사이드바 등 */
  size?: 'default' | 'sm'
  /** ReelBudget 앱명 표시 (기본 true) */
  showAppName?: boolean
  /** 사이드바 등 어두운 배경 */
  inverted?: boolean
}

export function AppBrand({
  size = 'default',
  showAppName = true,
  inverted = false,
}: AppBrandProps) {
  return (
    <div
      className={`app-brand app-brand--${size} ${inverted ? 'app-brand--inverted' : ''}`}
    >
      <p className="app-brand__company">{COMPANY_NAME}</p>
      {showAppName && <p className="app-brand__app">{APP_NAME}</p>}
    </div>
  )
}
