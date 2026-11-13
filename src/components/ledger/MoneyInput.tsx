import { formatAmountInput, parseAmount } from '../../lib/format'

interface MoneyInputProps {
  value: number
  onChange: (value: number) => void
  autoFocus?: boolean
  placeholder?: string
  ariaLabel?: string
}

/** 숫자만 받고 천 단위 콤마를 붙이는 금액 입력 */
export function MoneyInput({ value, onChange, autoFocus, placeholder = '0', ariaLabel }: MoneyInputProps) {
  return (
    <input
      className="lg-input lg-num"
      inputMode="numeric"
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={value ? formatAmountInput(String(value)) : ''}
      onChange={(e) => onChange(parseAmount(e.target.value))}
    />
  )
}
