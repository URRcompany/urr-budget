interface ProjectCreateFormProps {
  formId?: string
  onSubmit: (input: {
    name: string
    client: string
    shootDate: string
    revenue: number
    totalBudget: number
  }) => void
}

export function ProjectCreateForm({ formId, onSubmit }: ProjectCreateFormProps) {
  return (
    <form
      id={formId}
      className="form project-create-form"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSubmit({
          name: String(fd.get('name') || ''),
          client: String(fd.get('client') || ''),
          shootDate: String(fd.get('shootDate') || ''),
          revenue: Math.max(0, Number(fd.get('revenue')) || 0),
          totalBudget: Math.max(0, Number(fd.get('totalBudget')) || 0),
        })
      }}
    >
      <label className="field">
        <span>프로젝트명</span>
        <input name="name" required placeholder="예: 브랜드 CF 30초" autoFocus />
      </label>
      <label className="field">
        <span>클라이언트</span>
        <input name="client" placeholder="선택 사항" />
      </label>
      <label className="field">
        <span>촬영일</span>
        <input name="shootDate" type="date" />
      </label>
      <div className="field-row">
        <label className="field">
          <span>계약·매출 (원)</span>
          <input name="revenue" type="number" min={0} step={100000} placeholder="0" />
        </label>
        <label className="field">
          <span>제작 예산 (원)</span>
          <input name="totalBudget" type="number" min={0} step={100000} placeholder="0" />
        </label>
      </div>
    </form>
  )
}
