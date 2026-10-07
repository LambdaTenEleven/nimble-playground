import type { PromptPage } from '../usePage'

/** Links between the open prompt's pages, so the way back is always in the same place. */
export function PageTabs({
  page,
  caseCount,
  onChange,
}: {
  page: PromptPage
  caseCount: number
  onChange: (page: PromptPage) => void
}) {
  const tabs: { value: PromptPage; label: string }[] = [
    { value: 'playground', label: 'Editor' },
    { value: 'cases', label: `Test cases · ${caseCount}` },
  ]
  return (
    <nav aria-label="Prompt pages" className="tabs tabs-box tabs-sm flex-nowrap">
      {tabs.map((tab) => (
        <a
          key={tab.value}
          href={`#${tab.value}`}
          className={`tab whitespace-nowrap ${page === tab.value ? 'tab-active' : ''}`}
          aria-current={page === tab.value ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault()
            onChange(tab.value)
          }}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  )
}
