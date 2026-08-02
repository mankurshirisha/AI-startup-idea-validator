// utils.ts — Shared utility/helper functions (classnames merging, formatters, etc.)
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ')
}
