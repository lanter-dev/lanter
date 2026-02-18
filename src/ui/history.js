export const HISTORY_SIZE = 3

export function truncate(str, max = 60) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function labelForTool(toolName, args) {
  if (toolName === 'read_file') return `read: ${truncate(args.filePath)}`
  if (toolName === 'glob') return `glob: ${truncate(args.pattern)}`
  if (toolName === 'grep') return `grep: ${truncate(args.pattern)}`
  if (toolName === 'bash') return `bash: ${truncate(args.command)}`
  if (toolName === 'edit_file') return `edit: ${truncate(args.filePath)}`
  if (toolName === 'write_file') return `write: ${truncate(args.filePath)}`
  return truncate(toolName)
}

export function formatElapsed(ms) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * Push a label into the ring buffer in-place.
 * Returns the same array (mutated).
 */
export function pushHistory(history, label) {
  if (!label) return history
  history.push(label)
  if (history.length > HISTORY_SIZE) history.shift()
  return history
}
