import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { truncate, labelForTool, formatElapsed, pushHistory, HISTORY_SIZE } from '../src/ui/history.js'

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

  it('formats bash with command', () => {
    assert.equal(labelForTool('bash', { command: 'ls -la' }), 'bash: ls -la')
  })

  it('formats edit_file with filePath', () => {
    assert.equal(labelForTool('edit_file', { filePath: '/src/index.js' }), 'edit: /src/index.js')
  })

  it('formats write_file with filePath', () => {
    assert.equal(labelForTool('write_file', { filePath: '/out/main.py' }), 'write: /out/main.py')
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
