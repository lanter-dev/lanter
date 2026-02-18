import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { truncate, labelForTool, formatElapsed, pushHistory, formatTaskBoard, HISTORY_SIZE } from '../src/ui/history.js'

describe('truncate', () => {
  it('returns the string unchanged when within limit', () => {
    assert.equal(truncate('short'), 'short')
  })

  it('truncates at 60 characters and appends ellipsis by default', () => {
    const long = 'a'.repeat(61)
    const result = truncate(long)
    assert.equal(result.length, 61) // 60 chars + ellipsis char
    assert.ok(result.endsWith('…'))
  })

  it('respects a custom max', () => {
    const result = truncate('hello world', 5)
    assert.equal(result, 'hello…')
  })

  it('returns empty string for falsy input', () => {
    assert.equal(truncate(''), '')
    assert.equal(truncate(null), '')
    assert.equal(truncate(undefined), '')
  })

  it('does not truncate a string exactly at the limit', () => {
    const exact = 'a'.repeat(60)
    assert.equal(truncate(exact), exact)
  })
})

describe('labelForTool', () => {
  it('formats read_file with filePath', () => {
    assert.equal(labelForTool('read_file', { filePath: '/src/app.js' }), 'read: /src/app.js')
  })

  it('formats glob with pattern', () => {
    assert.equal(labelForTool('glob', { pattern: '**/*.ts' }), 'glob: **/*.ts')
  })

  it('formats grep with pattern', () => {
    assert.equal(labelForTool('grep', { pattern: 'console\\.log' }), 'grep: console\\.log')
  })

  it('formats list_dir with dirPath', () => {
    assert.equal(labelForTool('list_dir', { dirPath: 'src' }), 'ls: src')
  })

  it('formats list_dir with default dirPath', () => {
    assert.equal(labelForTool('list_dir', {}), 'ls: .')
  })

  it('formats file_info with filePath', () => {
    assert.equal(labelForTool('file_info', { filePath: 'package.json' }), 'info: package.json')
  })

  it('formats count_lines with pattern', () => {
    assert.equal(labelForTool('count_lines', { pattern: '**/*.js' }), 'wc: **/*.js')
  })

  it('formats project_info', () => {
    assert.equal(labelForTool('project_info', {}), 'project: info')
  })

  it('formats edit_file with filePath', () => {
    assert.equal(labelForTool('edit_file', { filePath: '/src/index.js' }), 'edit: /src/index.js')
  })

  it('formats write_file with filePath', () => {
    assert.equal(labelForTool('write_file', { filePath: '/out/main.py' }), 'write: /out/main.py')
  })

  it('formats eval_summary with verdict', () => {
    assert.equal(labelForTool('eval_summary', { verdict: 'moderate' }), 'eval: summary (moderate)')
  })

  it('formats eval_summary without verdict', () => {
    assert.equal(labelForTool('eval_summary', {}), 'eval: summary (…)')
  })

  it('formats run_summary with status', () => {
    assert.equal(labelForTool('run_summary', { status: 'complete' }), 'run: summary (complete)')
  })

  it('formats run_summary without status', () => {
    assert.equal(labelForTool('run_summary', {}), 'run: summary (…)')
  })

  it('formats copy_file with filePath', () => {
    assert.equal(labelForTool('copy_file', { filePath: 'README.md' }), 'copy: README.md')
  })

  it('formats task create with name', () => {
    assert.equal(labelForTool('task', { action: 'create', name: 'Convert config' }), 'task: create "Convert config"')
  })

  it('formats task update with status', () => {
    assert.equal(labelForTool('task', { action: 'update', taskId: '3', status: 'done' }), 'task: update #3 → done')
  })

  it('formats task update without status', () => {
    assert.equal(labelForTool('task', { action: 'update', taskId: '3', name: 'Renamed' }), 'task: update #3')
  })

  it('formats task list without filter', () => {
    assert.equal(labelForTool('task', { action: 'list' }), 'task: list')
  })

  it('formats task list with status filter', () => {
    assert.equal(labelForTool('task', { action: 'list', status: 'in_progress' }), 'task: list (in_progress)')
  })

  it('formats task get', () => {
    assert.equal(labelForTool('task', { action: 'get', taskId: '2' }), 'task: get #2')
  })

  it('falls back to tool name for unknown tools', () => {
    assert.equal(labelForTool('some_tool', {}), 'some_tool')
  })

  it('truncates long file paths', () => {
    const longPath = '/very/long/' + 'x'.repeat(60)
    const result = labelForTool('read_file', { filePath: longPath })
    assert.ok(result.startsWith('read: '))
    assert.ok(result.endsWith('…'))
    // label prefix (6) + 60 chars + ellipsis = 67
    assert.equal(result.length, 67)
  })
})

describe('formatElapsed', () => {
  it('shows milliseconds for values under 1000ms', () => {
    assert.equal(formatElapsed(0), '0ms')
    assert.equal(formatElapsed(500), '500ms')
    assert.equal(formatElapsed(999), '999ms')
  })

  it('shows seconds with one decimal at 1000ms', () => {
    assert.equal(formatElapsed(1000), '1.0s')
  })

  it('shows seconds with one decimal for larger values', () => {
    assert.equal(formatElapsed(2500), '2.5s')
    assert.equal(formatElapsed(10000), '10.0s')
  })
})

describe('pushHistory', () => {
  it('adds a label to an empty history', () => {
    const h = pushHistory([], 'read: /a.js')
    assert.deepEqual(h, ['read: /a.js'])
  })

  it('accumulates up to HISTORY_SIZE items', () => {
    let h = []
    for (let i = 0; i < HISTORY_SIZE; i++) {
      h = pushHistory(h, `item-${i}`)
    }
    assert.equal(h.length, HISTORY_SIZE)
  })

  it('evicts the oldest item when exceeding HISTORY_SIZE', () => {
    let h = []
    for (let i = 0; i < HISTORY_SIZE + 1; i++) {
      h = pushHistory(h, `item-${i}`)
    }
    assert.equal(h.length, HISTORY_SIZE)
    assert.ok(!h.includes('item-0'), 'oldest item should be evicted')
    assert.ok(h.includes(`item-${HISTORY_SIZE}`), 'newest item should be present')
  })

  it('does not add empty labels', () => {
    const h = pushHistory([], '')
    assert.deepEqual(h, [])
  })

  it('does not add falsy labels', () => {
    const h = pushHistory([], null)
    assert.deepEqual(h, [])
  })

  it('mutates and returns the same array reference', () => {
    const h = []
    const result = pushHistory(h, 'x')
    assert.equal(result, h)
  })

  it('maintains insertion order', () => {
    let h = []
    h = pushHistory(h, 'first')
    h = pushHistory(h, 'second')
    h = pushHistory(h, 'third')
    assert.deepEqual(h, ['first', 'second', 'third'])
  })

  it('sliding window keeps only the last HISTORY_SIZE entries', () => {
    let h = []
    const labels = ['a', 'b', 'c', 'd', 'e']
    for (const l of labels) h = pushHistory(h, l)
    assert.deepEqual(h, labels.slice(-HISTORY_SIZE))
  })
})

describe('formatTaskBoard', () => {
  it('returns empty array for no tasks', () => {
    assert.deepEqual(formatTaskBoard([]), [])
    assert.deepEqual(formatTaskBoard(null), [])
    assert.deepEqual(formatTaskBoard(undefined), [])
  })

  it('renders todo tasks with dim circle', () => {
    const lines = formatTaskBoard([{ id: '1', name: 'Setup', status: 'todo' }])
    assert.equal(lines.length, 1)
    assert.ok(lines[0].includes('Setup'))
    assert.ok(lines[0].includes('○'))
  })

  it('renders in_progress tasks in yellow', () => {
    const lines = formatTaskBoard([{ id: '2', name: 'Converting', status: 'in_progress' }])
    assert.equal(lines.length, 1)
    assert.ok(lines[0].includes('Converting'))
    // yellow ANSI code \x1b[33m
    assert.ok(lines[0].includes('\x1b[33m'))
  })

  it('renders done tasks with strikethrough and dim', () => {
    const lines = formatTaskBoard([{ id: '3', name: 'Finished', status: 'done' }])
    assert.equal(lines.length, 1)
    assert.ok(lines[0].includes('Finished'))
    // green check
    assert.ok(lines[0].includes('\x1b[32m'))
    // strikethrough \x1b[9m
    assert.ok(lines[0].includes('\x1b[9m'))
  })

  it('renders mixed statuses in order', () => {
    const tasks = [
      { id: '1', name: 'Done task', status: 'done' },
      { id: '2', name: 'Active task', status: 'in_progress' },
      { id: '3', name: 'Pending task', status: 'todo' },
    ]
    const lines = formatTaskBoard(tasks)
    assert.equal(lines.length, 3)
    assert.ok(lines[0].includes('Done task'))
    assert.ok(lines[1].includes('Active task'))
    assert.ok(lines[2].includes('Pending task'))
  })
})
