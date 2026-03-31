const PLAN_TOTALS_REGEX = /Plan:\s+(\d+)\s+to add,\s+(\d+)\s+to change,\s+(\d+)\s+to destroy\./gi

const ACTION_PRIORITY = {
  replace: 4,
  destroy: 3,
  change: 2,
  add: 1,
}

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

  const totalsMatches = [...text.matchAll(PLAN_TOTALS_REGEX)]
  const lines = text.split('\n')
  const rawResourceActions = lines
    .map(classifyResourceLine)
    .filter(Boolean)

  const resourceActionMap = new Map()
  rawResourceActions.forEach((item) => {
    const previous = resourceActionMap.get(item.resource)
    if (!previous || ACTION_PRIORITY[item.action] > ACTION_PRIORITY[previous.action]) {
      resourceActionMap.set(item.resource, item)
    }
  })

  const resourceActions = Array.from(resourceActionMap.values())
  const replaceCount = resourceActions.filter((item) => item.action === 'replace').length
  const examples = resourceActions
    .filter((item) => item.action === 'replace' || item.action === 'destroy')
    .slice(0, 5)

  const latestTotals = totalsMatches.length > 0 ? totalsMatches[totalsMatches.length - 1] : null

  const add = latestTotals
    ? Number(latestTotals[1])
    : resourceActions.filter((item) => item.action === 'add').length
  const change = latestTotals
    ? Number(latestTotals[2])
    : resourceActions.filter((item) => item.action === 'change').length
  const destroy = latestTotals
    ? Number(latestTotals[3])
    : resourceActions.filter((item) => item.action === 'destroy').length

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
