/**
 * Context trimmer for the callModelInputFilter.
 *
 * Strategy:
 *   1. Never touch the system instructions (separate field).
 *   2. Always keep the first user message (the task assignment).
 *   3. Always keep the most recent N items (the "tail").
 *   4. Inject current task list so the LLM always knows where it left off.
 *   5. If over budget, remove oldest items from the middle.
 *
 * Token estimation: ~4 chars per token (rough but consistent).
 */

const CHARS_PER_TOKEN = 4
const TAIL_ITEMS = 40

function estimateItemTokens(item) {
  let chars = 0

  if (item.type === 'message' || !item.type) {
    if (typeof item.content === 'string') {
      chars = item.content.length
    } else if (Array.isArray(item.content)) {
      for (const part of item.content) {
        chars += part.text ? part.text.length : 1000
      }
    }
  } else if (item.type === 'function_call') {
    chars = (item.name || '').length + (item.arguments || '').length
  } else if (item.type === 'function_call_result') {
    if (typeof item.output === 'string') {
      chars = item.output.length
    } else if (item.output && typeof item.output === 'object') {
      if (Array.isArray(item.output)) {
        for (const part of item.output) {
          chars += part.text ? part.text.length : 1000
        }
      } else {
        chars += item.output.text ? item.output.text.length : 1000
      }
    }
  } else {
    chars = JSON.stringify(item).length
  }

  return Math.ceil(chars / CHARS_PER_TOKEN)
}

function buildTaskSummary(getTasks) {
  if (!getTasks) return null
  const tasks = getTasks()
  if (!tasks || tasks.length === 0) return null

  const lines = ['## Current Task Status (injected by system — these tasks already exist)']
  lines.push('')
  lines.push('DO NOT create these tasks again — they are already in the task store. Use `task list` or `task get` to check details. Only create NEW tasks if you need to add work not listed here.')
  lines.push('')
  for (const t of tasks) {
    const icon = t.status === 'done' ? '✓' : t.status === 'in_progress' ? '→' : '○'
    lines.push(`${icon} #${t.id} [${t.status}] ${t.name}`)
  }
  lines.push('')
  lines.push('Focus on the next incomplete (todo/in_progress) task. Previous tool results for completed tasks may have been trimmed from context to save space.')
  return lines.join('\n')
}

export function createContextTrimmer({ maxContextTokens, getTasks, emitter, agentName }) {
  return ({ modelData }) => {
    emitter.emit('inference:start', { agentName })

    const { input, instructions } = modelData

    const instructionTokens = instructions ? Math.ceil(instructions.length / CHARS_PER_TOKEN) : 0
    const responseReserve = 4096
    const inputBudget = maxContextTokens - instructionTokens - responseReserve

    if (inputBudget <= 0) return modelData

    const taskSummary = buildTaskSummary(getTasks)
    const taskSummaryTokens = taskSummary ? Math.ceil(taskSummary.length / CHARS_PER_TOKEN) : 0

    const itemTokens = input.map(estimateItemTokens)
    const totalTokens = itemTokens.reduce((a, b) => a + b, 0) + taskSummaryTokens

    if (totalTokens <= inputBudget) {
      if (taskSummary) {
        return { input: [...input, { role: 'system', content: taskSummary }], instructions }
      }
      return modelData
    }

    // Find head boundary: everything up to and including the first user message
    let headEnd = 0
    for (let i = 0; i < input.length; i++) {
      if (input[i].role === 'user') { headEnd = i + 1; break }
    }
    if (headEnd === 0) headEnd = 1

    const tailStart = Math.max(headEnd, input.length - TAIL_ITEMS)

    const head = input.slice(0, headEnd)
    const headTokens = itemTokens.slice(0, headEnd).reduce((a, b) => a + b, 0)

    const tail = input.slice(tailStart)
    const tailTokens = itemTokens.slice(tailStart).reduce((a, b) => a + b, 0)

    const middle = input.slice(headEnd, tailStart)
    const middleItemTokens = itemTokens.slice(headEnd, tailStart)

    const fixedTokens = headTokens + tailTokens + taskSummaryTokens
    const middleBudget = inputBudget - fixedTokens

    if (middleBudget <= 0) {
      // Even head + tail exceed budget — trim tail aggressively
      const result = [...head]
      if (taskSummary) result.push({ role: 'system', content: taskSummary })
      let remaining = Math.max(0, inputBudget - headTokens - taskSummaryTokens)
      for (let i = tail.length - 1; i >= 0; i--) {
        const t = estimateItemTokens(tail[i])
        if (t <= remaining) { remaining -= t } else { tail.splice(i, 1) }
      }
      result.push(...tail)
      return { input: result, instructions }
    }

    // Keep most recent middle items, drop oldest
    const kept = []
    let used = 0
    for (let i = middle.length - 1; i >= 0; i--) {
      if (used + middleItemTokens[i] <= middleBudget) {
        kept.unshift(middle[i])
        used += middleItemTokens[i]
      }
    }

    const dropped = middle.length - kept.length
    const trimNotice = {
      role: 'system',
      content: `[Context trimmed: ${dropped} older conversation items were removed to fit within context limits. Use the task list below to understand progress.]`,
    }

    const result = [...head, trimNotice]
    if (taskSummary) result.push({ role: 'system', content: taskSummary })
    result.push(...kept, ...tail)

    return { input: result, instructions }
  }
}

export { estimateItemTokens, buildTaskSummary, CHARS_PER_TOKEN, TAIL_ITEMS }
