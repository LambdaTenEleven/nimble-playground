import { useEffect, useState } from 'react'

export type Page = 'playground' | 'cases' | 'compare' | 'settings'
/** Pages that show the open prompt; Compare and Settings return to the last one visited. */
export type PromptPage = 'playground' | 'cases'
const pages: Page[] = ['playground', 'cases', 'compare', 'settings']
const fromHash = (): Page => pages.find((page) => location.hash === `#${page}`) ?? 'playground'
export const isPromptPage = (page: Page): page is PromptPage =>
  page === 'playground' || page === 'cases'

/** Hash-based page state, so pages survive reloads and the browser's Back button works. */
export function usePage() {
  const [page, setPage] = useState<Page>(fromHash)
  const [promptPage, setPromptPage] = useState<PromptPage>(() => {
    const initial = fromHash()
    return isPromptPage(initial) ? initial : 'playground'
  })
  useEffect(() => {
    const update = () => {
      const next = fromHash()
      setPage(next)
      if (isPromptPage(next)) setPromptPage(next)
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  function navigate(next: Page) {
    location.hash = next
    setPage(next)
    if (isPromptPage(next)) setPromptPage(next)
  }
  return { page, navigate, promptPage }
}
