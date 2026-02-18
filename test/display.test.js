import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createDisplay } from '../src/ui/display.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fake ora-like spinner. Tracks text, prefixText, and whether it was started/stopped.
 */
function makeFakeSpinner() {
  return {
    text: '',
    prefixText: '',
    started: false,
    stopped: false,
    start(text) { this.text = text; this.started = true; this.stopped = false; return this },
    stop() { this.stopped = true; this.started = false; return this },
  }
}

function setup() {
  const emitter = new EventEmitter()
  const spinner = makeFakeSpinner()
  const display = createDisplay(emitter, { _createSpinner: () => spinner })
  return { emitter, display, spinner }
}

function toolCycle(emitter, toolName, args, result = '') {
  emitter.emit('tool:start', { toolName, args })
  emitter.emit('tool:done', { toolName, result })
}

// ---------------------------------------------------------------------------
// inference:start
// ---------------------------------------------------------------------------

describe('inference:start', () => {
  it('starts the spinner with "thinking..."', () => {
    const { emitter, display, spinner } = setup()
    emitter.emit('inference:start', {})
    assert.equal(spinner.text, 'thinking...')
    assert.ok(spinner.started)
    display.stop()
  })

  it('repeated calls update text without adding to history', () => {
    const { emitter, display, spinner } = setup()
    for (let i = 0; i < 5; i++) emitter.emit('inference:start', {})
    assert.equal(spinner.text, 'thinking...')
    assert.deepEqual(display._getHistory(), [])
    display.stop()
  })

  it('never adds "thinking..." to history', () => {
    const { emitter, display } = setup()
    for (let i = 0; i < 5; i++) emitter.emit('inference:start', {})
    assert.deepEqual(display._getHistory(), [])
    display.stop()
  })
})

// ---------------------------------------------------------------------------
// tool:start
// ---------------------------------------------------------------------------

describe('tool:start', () => {
  it('shows the correct read_file label', () => {
    const { emitter, display, spinner } = setup()
    emitter.emit('tool:start', { toolName: 'read_file', args: { filePath: '/src/app.js' } })
    assert.equal(spinner.text, 'read: /src/app.js')
    display.stop()
  })

  it('shows the correct glob label', () => {
    const { emitter, display, spinner } = setup()
    emitter.emit('tool:start', { toolName: 'glob', args: { pattern: '**/*.ts' } })
    assert.equal(spinner.text, 'glob: **/*.ts')
    display.stop()
  })

  it('shows the correct list_dir label', () => {
    const { emitter, display, spinner } = setup()
    emitter.emit('tool:start', { toolName: 'list_dir', args: { dirPath: 'src' } })
    assert.equal(spinner.text, 'ls: src')
    display.stop()
  })

  it('replaces inference label when a tool starts', () => {
    const { emitter, display, spinner } = setup()
    emitter.emit('inference:start', {})
    assert.equal(spinner.text, 'thinking...')
    emitter.emit('tool:start', { toolName: 'glob', args: { pattern: '**/*' } })
    assert.equal(spinner.text, 'glob: **/*')
    display.stop()
  })

  it('parallel tool:start events each enqueue a label', () => {
    const { emitter, display } = setup()
    emitter.emit('tool:start', { toolName: 'glob', args: { pattern: '**/*' } })
    emitter.emit('tool:start', { toolName: 'list_dir', args: { dirPath: 'src' } })
    assert.deepEqual(display._getInflight(), ['glob: **/*', 'ls: src'])
    display.stop()
  })
})

// ---------------------------------------------------------------------------
// tool:done — sequential
// ---------------------------------------------------------------------------

describe('tool:done (sequential)', () => {
  it('commits the tool label to history', () => {
    const { emitter, display } = setup()
    toolCycle(emitter, 'read_file', { filePath: '/a.js' })
    assert.deepEqual(display._getHistory(), ['read: /a.js'])
    display.stop()
  })

  it('clears inflight queue after completion', () => {
    const { emitter, display } = setup()
    toolCycle(emitter, 'glob', { pattern: '**/*' })
    assert.equal(display._getInflight().length, 0)
    display.stop()
  })

  it('updates prefixText with completed history', () => {
    const { emitter, display, spinner } = setup()
    toolCycle(emitter, 'glob', { pattern: '**/*' })
    assert.ok(spinner.prefixText.includes('glob: **/*'))
    display.stop()
  })
})

// ---------------------------------------------------------------------------
// tool:done — parallel (the regression case)
// ---------------------------------------------------------------------------

describe('tool:done (parallel)', () => {
  it('two parallel tools produce exactly two distinct history entries', () => {
    const { emitter, display } = setup()
    emitter.emit('tool:start', { toolName: 'glob', args: { pattern: '**/*' } })
    emitter.emit('tool:start', { toolName: 'list_dir', args: { dirPath: 'src' } })
    emitter.emit('tool:done', { toolName: 'glob', result: '' })
    emitter.emit('tool:done', { toolName: 'list_dir', result: '' })
    const h = display._getHistory()
    assert.equal(h.length, 2)
    assert.ok(h.includes('glob: **/*'))
    assert.ok(h.includes('ls: src'))
    display.stop()
  })

  it('three parallel tools committed in FIFO order', () => {
    const { emitter, display } = setup()
    emitter.emit('tool:start', { toolName: 'read_file', args: { filePath: '/a.js' } })
    emitter.emit('tool:start', { toolName: 'read_file', args: { filePath: '/b.js' } })
    emitter.emit('tool:start', { toolName: 'list_dir',  args: { dirPath: '.' } })
    emitter.emit('tool:done',  { toolName: 'read_file', result: '' })
    emitter.emit('tool:done',  { toolName: 'read_file', result: '' })
    emitter.emit('tool:done',  { toolName: 'list_dir',  result: '' })
    const h = display._getHistory()
    assert.equal(h.length, 3)
    assert.equal(h[0], 'read: /a.js')
    assert.equal(h[1], 'read: /b.js')
    assert.equal(h[2], 'ls: .')
    display.stop()
  })

  it('spinner stays active while tools remain in flight', () => {
    const { emitter, display, spinner } = setup()
    emitter.emit('tool:start', { toolName: 'glob', args: { pattern: '**/*' } })
    emitter.emit('tool:start', { toolName: 'list_dir', args: { dirPath: 'src' } })
    emitter.emit('tool:done', { toolName: 'glob', result: '' })
    assert.ok(spinner.started || !spinner.stopped, 'spinner should still be active')
    assert.equal(spinner.text, 'ls: src')
    display.stop()
  })

  it('parallel tools capped by HISTORY_SIZE (3) when more than 3 complete', () => {
    const { emitter, display } = setup()
    const files = ['/a.js', '/b.js', '/c.js', '/d.js']
    for (const f of files) emitter.emit('tool:start', { toolName: 'read_file', args: { filePath: f } })
    for (const _f of files) emitter.emit('tool:done',  { toolName: 'read_file', result: '' })
    const h = display._getHistory()
    assert.equal(h.length, 3)
    assert.ok(!h.includes('read: /a.js'), '/a.js should be evicted')
    assert.ok(h.includes('read: /b.js'))
    assert.ok(h.includes('read: /c.js'))
    assert.ok(h.includes('read: /d.js'))
    display.stop()
  })

  it('prefixText shows only the last 3 completed items', () => {
    const { emitter, display, spinner } = setup()
    const files = ['/a.js', '/b.js', '/c.js', '/d.js']
    for (const f of files) emitter.emit('tool:start', { toolName: 'read_file', args: { filePath: f } })
    for (const _f of files) emitter.emit('tool:done',  { toolName: 'read_file', result: '' })
    assert.ok(!spinner.prefixText.includes('/a.js'), '/a.js should not be in prefixText')
    assert.ok(spinner.prefixText.includes('/b.js'))
    assert.ok(spinner.prefixText.includes('/c.js'))
    assert.ok(spinner.prefixText.includes('/d.js'))
    display.stop()
  })
})

// ---------------------------------------------------------------------------
// History ring buffer — general behaviour
// ---------------------------------------------------------------------------

describe('history ring buffer', () => {
  it('only the last 3 sequential tools are kept', () => {
    const { emitter, display } = setup()
    toolCycle(emitter, 'read_file', { filePath: '/a.js' })
    toolCycle(emitter, 'read_file', { filePath: '/b.js' })
    toolCycle(emitter, 'read_file', { filePath: '/c.js' })
    toolCycle(emitter, 'read_file', { filePath: '/d.js' })
    const h = display._getHistory()
    assert.equal(h.length, 3)
    assert.ok(!h.includes('read: /a.js'))
    assert.ok(h.includes('read: /b.js'))
    assert.ok(h.includes('read: /c.js'))
    assert.ok(h.includes('read: /d.js'))
    display.stop()
  })

  it('inference events between tools do not pollute history', () => {
    const { emitter, display } = setup()
    emitter.emit('inference:start', {})
    emitter.emit('inference:start', {})
    toolCycle(emitter, 'glob', { pattern: '**/*' })
    emitter.emit('inference:start', {})
    const h = display._getHistory()
    assert.ok(!h.includes('thinking...'))
    assert.ok(h.includes('glob: **/*'))
    display.stop()
  })
})

// ---------------------------------------------------------------------------
// agent:done
// ---------------------------------------------------------------------------

describe('agent:done', () => {
  it('stops the spinner', () => {
    const { emitter, display, spinner } = setup()
    emitter.emit('inference:start', {})
    emitter.emit('agent:done', { agentName: 'test-agent', output: 'done' })
    assert.ok(spinner.stopped)
    display.stop()
  })

  it('clears the inflight queue', () => {
    const { emitter, display } = setup()
    emitter.emit('tool:start', { toolName: 'glob', args: { pattern: '**/*' } })
    emitter.emit('agent:done', { agentName: 'test-agent', output: 'done' })
    assert.equal(display._getInflight().length, 0)
    display.stop()
  })

  it('does not throw when there is no active spinner', () => {
    const { emitter, display } = setup()
    assert.doesNotThrow(() => emitter.emit('agent:done', { agentName: 'x', output: '' }))
    display.stop()
  })
})

// ---------------------------------------------------------------------------
// stop()
// ---------------------------------------------------------------------------

describe('stop()', () => {
  it('stops the spinner', () => {
    const { emitter, display, spinner } = setup()
    emitter.emit('inference:start', {})
    display.stop()
    assert.ok(spinner.stopped)
  })

  it('clears the inflight queue', () => {
    const { emitter, display } = setup()
    emitter.emit('tool:start', { toolName: 'glob', args: { pattern: '**/*' } })
    display.stop()
    assert.equal(display._getInflight().length, 0)
  })

  it('is safe to call with no active spinner', () => {
    const { display } = setup()
    assert.doesNotThrow(() => display.stop())
  })

  it('is safe to call multiple times', () => {
    const { emitter, display } = setup()
    emitter.emit('tool:start', { toolName: 'glob', args: { pattern: '**/*' } })
    assert.doesNotThrow(() => { display.stop(); display.stop() })
  })
})

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

describe('audit log', () => {
  it('writes a timestamped line for each event', async () => {
    const os = await import('node:os')
    const fs = await import('node:fs')
    const path = await import('node:path')

    const logPath = path.default.join(os.default.tmpdir(), `lanter-test-${Date.now()}.log`)
    const emitter = new EventEmitter()
    const spinner = makeFakeSpinner()
    const display = createDisplay(emitter, { auditLogPath: logPath, _createSpinner: () => spinner })

    emitter.emit('inference:start', { agentName: 'test' })
    emitter.emit('tool:start', { toolName: 'glob', args: { pattern: '**/*' } })
    emitter.emit('tool:done', { toolName: 'glob', result: 'files' })
    emitter.emit('agent:done', { agentName: 'test', output: '' })

    await new Promise((resolve) => setTimeout(resolve, 50))

    const contents = fs.default.readFileSync(logPath, 'utf-8')
    assert.ok(contents.includes('inference:start'))
    assert.ok(contents.includes('tool:start'))
    assert.ok(contents.includes('tool:done'))
    assert.ok(contents.includes('agent:done'))
    for (const line of contents.trim().split('\n')) {
      assert.match(line, /^\d{4}-\d{2}-\d{2}T/, `should start with ISO date: ${line}`)
    }

    fs.default.unlinkSync(logPath)
    display.stop()
  })
})

// ---------------------------------------------------------------------------
// Task board in prefixText
// ---------------------------------------------------------------------------

describe('task board display', () => {
  it('shows task board in prefixText after tasks:init', () => {
    const { emitter, display, spinner } = setup()
    const getTasks = () => [
      { id: '1', name: 'Convert config', status: 'done' },
      { id: '2', name: 'Convert utils', status: 'in_progress' },
    ]
    emitter.emit('tasks:init', { getTasks })
    emitter.emit('inference:start', {})
    assert.ok(spinner.prefixText.includes('Convert config'))
    assert.ok(spinner.prefixText.includes('Convert utils'))
    display.stop()
  })

  it('updates task board on each spinner refresh', () => {
    const { emitter, display, spinner } = setup()
    const tasks = [
      { id: '1', name: 'Task A', status: 'todo' },
    ]
    emitter.emit('tasks:init', { getTasks: () => tasks })
    emitter.emit('inference:start', {})
    assert.ok(spinner.prefixText.includes('todo') || spinner.prefixText.includes('○'))

    // Mutate the task status
    tasks[0].status = 'done'
    toolCycle(emitter, 'glob', { pattern: '**/*' })
    assert.ok(spinner.prefixText.includes('Task A'))
    // Should now have strikethrough (done styling)
    assert.ok(spinner.prefixText.includes('\x1b[9m'))
    display.stop()
  })

  it('prefixText has no task board when no tasks:init emitted', () => {
    const { emitter, display, spinner } = setup()
    toolCycle(emitter, 'glob', { pattern: '**/*' })
    // Should only have history, no task board markers
    assert.ok(!spinner.prefixText.includes('○'))
    assert.ok(!spinner.prefixText.includes('⟳'))
    display.stop()
  })
})
