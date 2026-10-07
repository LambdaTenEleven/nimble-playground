import type { CSSProperties } from 'react'

const paths = {
  play: 'm9 5 10 7-10 7V5Z',
  plus: 'M12 5v14M5 12h14',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8',
  download: 'M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5',
  upload: 'M12 16V4m-5 5 5-5 5 5M5 16v5h14v-5',
  close: 'm6 6 12 12M6 18 18 6',
  refresh: 'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6',
  moon: 'M21 13a9 9 0 0 1-10-10 9 9 0 1 0 10 10Z',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5-5-5 5 5 5',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h5',
  check: 'm5 12 4 4L19 6',
  compare: 'M3 4h7v16H3V4Zm11 0h7v16h-7V4Z',
  sidebar: 'M4 4h16v16H4V4Zm5 0v16',
  results: 'M4 4h16v16H4V4Zm11 0v16',
  example: 'M9 3h6M10 3v6l-6 10a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M8 14h8',
  menu: 'M4 6h16M4 12h16M4 18h10',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  alert:
    'M12 9v4m0 4h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  // An eight-tooth cogwheel with a centre hole.
  settings:
    'M10.6 5.1 11 2.6a9.5 9.5 0 0 1 2 0l.4 2.5a7 7 0 0 1 2.5 1.1l2-1.6a9.5 9.5 0 0 1 1.5 1.5l-1.6 2a7 7 0 0 1 1.1 2.5l2.5.4a9.5 9.5 0 0 1 0 2l-2.5.4a7 7 0 0 1-1.1 2.5l1.6 2a9.5 9.5 0 0 1-1.5 1.5l-2-1.6a7 7 0 0 1-2.5 1.1l-.4 2.5a9.5 9.5 0 0 1-2 0l-.4-2.5a7 7 0 0 1-2.5-1.1l-2 1.6a9.5 9.5 0 0 1-1.5-1.5l1.6-2a7 7 0 0 1-1.1-2.5L2.6 13a9.5 9.5 0 0 1 0-2l2.5-.4a7 7 0 0 1 1.1-2.5l-1.6-2a9.5 9.5 0 0 1 1.5-1.5l2 1.6a7 7 0 0 1 2.5-1.1ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.7,
  style,
}: {
  name: IconName
  size?: number
  /** Dot icons (more, grip) need a heavier stroke to be visible. */
  strokeWidth?: number
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  )
}
