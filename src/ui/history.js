export const HISTORY_SIZE = 3

export function truncate(str, max = 60) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function labelForTool(toolName, args) {
  if (toolName === 'read_file') return `read: ${truncate(args.filePath)}`
  if (toolName === 'glob') return `glob: ${truncate(args.pattern)}`
  if (toolName === 'grep') return `grep: ${truncate(args.pattern)}`
  if (toolName === 'list_dir') return `ls: ${truncate(args.dirPath || '.')}`
  if (toolName === 'file_info') return `info: ${truncate(args.filePath)}`
  if (toolName === 'count_lines') return `wc: ${truncate(args.pattern)}`
  if (toolName === 'project_info') return 'project: info'
  if (toolName === 'edit_file') return `edit: ${truncate(args.filePath)}`
  if (toolName === 'write_file') return `write: ${truncate(args.filePath)}`
  if (toolName === 'eval_summary') return `eval: summary (${args.verdict || '…'})`
  if (toolName === 'run_summary') return `run: summary (${args.status || '…'})`
  if (toolName === 'copy_file') return `copy: ${truncate(args.filePath)}`
  if (toolName === 'task') {
    const { action } = args
    if (action === 'create') return `task: create ${truncate(args.name ? `"${args.name}"` : '', 50)}`
    if (action === 'update') return `task: update #${args.taskId}${args.status ? ` → ${args.status}` : ''}`
    if (action === 'get') return `task: get #${args.taskId}`
    if (action === 'list') return args.status ? `task: list (${args.status})` : 'task: list'
    return 'task'
  }
  return truncate(toolName)
}

export function formatElapsed(ms) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function pushHistory(history, label) {
  if (!label) return history
  history.push(label)
  if (history.length > HISTORY_SIZE) history.shift()
  return history
}

const STATUS_ICONS = {
  done: '\x1b[32m✔\x1b[0m',
  in_progress: '\x1b[33m⟳\x1b[0m',
  todo: '\x1b[2m○\x1b[0m',
}

export function formatTaskBoard(tasks) {
  if (!tasks || tasks.length === 0) return []
  return tasks.map((t) => {
    const icon = STATUS_ICONS[t.status] || STATUS_ICONS.todo
    if (t.status === 'done') {
      return `  ${icon} \x1b[2m\x1b[9m${t.name}\x1b[0m`
    }
    if (t.status === 'in_progress') {
      return `  ${icon} \x1b[33m${t.name}\x1b[0m`
    }
    return `  ${icon} ${t.name}`
  })
}
