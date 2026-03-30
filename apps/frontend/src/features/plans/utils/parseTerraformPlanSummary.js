const PLAN_TOTALS_REGEX = /Plan:\s+(\d+)\s+to add,\s+(\d+)\s+to change,\s+(\d+)\s+to destroy\./i

function classifyResourceLine(line) {
  const trimmed = String(line || '').trim()
  if (!trimmed.startsWith('# ')) return null

  const match = trimmed.match(/^#\s+([^\s]+)\s+(.*)$/)
  if (!match) return null

  const resource = match[1]
  const detail = match[2].toLowerCase()

  if (detail.includes('must be replaced')) {
    return { resource, action: 'replace' }
  }
  if (detail.includes('will be destroyed')) {
    return { resource, action: 'destroy' }
  }
  if (detail.includes('will be updated in-place')) {
    return { resource, action: 'change' }
  }
  if (detail.includes('will be created')) {
    return { resource, action: 'add' }
  }

  return null
}

export function parseTerraformPlanSummary(logText) {
  const text = String(logText || '')
  if (!text.trim()) return null

  const totalsMatch = text.match(PLAN_TOTALS_REGEX)
  const lines = text.split('\n')
  const resourceActions = lines
    .map(classifyResourceLine)
    .filter(Boolean)

  const replaceCount = resourceActions.filter((item) => item.action === 'replace').length
  const examples = resourceActions
    .filter((item) => item.action === 'replace' || item.action === 'destroy')
    .slice(0, 5)

  const add = totalsMatch ? Number(totalsMatch[1]) : resourceActions.filter((item) => item.action === 'add').length
  const change = totalsMatch ? Number(totalsMatch[2]) : resourceActions.filter((item) => item.action === 'change').length
  const destroy = totalsMatch ? Number(totalsMatch[3]) : resourceActions.filter((item) => item.action === 'destroy').length

  const severity = destroy > 0 || replaceCount > 0
    ? 'destructive'
    : change > 0
      ? 'caution'
      : add > 0
        ? 'safe'
        : 'none'

  return {
    add,
    change,
    destroy,
    replace: replaceCount,
    severity,
    examples,
    hasChanges: add > 0 || change > 0 || destroy > 0 || replaceCount > 0,
  }
}
