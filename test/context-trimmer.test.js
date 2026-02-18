import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createContextTrimmer,
  estimateItemTokens,
  buildTaskSummary,
  CHARS_PER_TOKEN,
} from '../src/agent/context-trimmer.js'

// ---------------------------------------------------------------------------
// estimateItemTokens
// ---------------------------------------------------------------------------

describe('estimateItemTokens', () => {
  it('estimates user message tokens from string content', () => {
    const item = { role: 'user', content: 'a'.repeat(400) }
    assert.equal(estimateItemTokens(item), 100) // 400 / 4
  })

  it('estimates assistant message tokens from array content', () => {
    const item = {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: 'a'.repeat(800) }],
    }
    assert.equal(estimateItemTokens(item), 200)
  })

  it('estimates function_call tokens', () => {
    const item = {
      type: 'function_call',
      name: 'read_file',
      arguments: '{"filePath":"src/index.js"}',
    }
    const expected = Math.ceil(('read_file'.length + '{"filePath":"src/index.js"}'.length) / CHARS_PER_TOKEN)
    assert.equal(estimateItemTokens(item), expected)
  })

  it('estimates function_call_result tokens from string output', () => {
    const item = {
      type: 'function_call_result',
      output: 'x'.repeat(2000),
    }
    assert.equal(estimateItemTokens(item), 500)
  })
})

// ---------------------------------------------------------------------------
// buildTaskSummary
// ---------------------------------------------------------------------------

describe('buildTaskSummary', () => {
  it('returns null when no getTasks provided', () => {
    assert.equal(buildTaskSummary(null), null)
  })

  it('returns null for empty task list', () => {
    assert.equal(buildTaskSummary(() => []), null)
  })

  it('includes all tasks with status icons', () => {
    const tasks = [
      { id: '1', name: 'Discover', status: 'done' },
      { id: '2', name: 'Dependencies', status: 'in_progress' },
      { id: '3', name: 'Interfaces', status: 'todo' },
    ]
    const summary = buildTaskSummary(() => tasks)
    assert.ok(summary.includes('✓ #1'))
    assert.ok(summary.includes('→ #2'))
    assert.ok(summary.includes('○ #3'))
    assert.ok(summary.includes('Discover'))
    assert.ok(summary.includes('Dependencies'))
    assert.ok(summary.includes('Interfaces'))
  })

  it('includes anti-duplicate warning', () => {
    const tasks = [{ id: '1', name: 'Test', status: 'todo' }]
    const summary = buildTaskSummary(() => tasks)
    assert.ok(summary.includes('DO NOT create these tasks again'))
    assert.ok(summary.includes('already exist'))
  })
})

// ---------------------------------------------------------------------------
// createContextTrimmer — passthrough
// ---------------------------------------------------------------------------

describe('createContextTrimmer — fits in budget', () => {
  const noop = { emit: () => {} }

  it('passes through when input fits within budget', () => {
    const filter = createContextTrimmer({
      maxContextTokens: 100000,
      getTasks: () => [],
      emitter: noop,
      agentName: 'test',
    })

    const input = [
      { role: 'user', content: 'Hello' },
      { type: 'function_call', name: 'glob', arguments: '{"pattern":"**/*"}' },
      { type: 'function_call_result', output: 'file1.js\nfile2.js' },
    ]

    const result = filter({ modelData: { input, instructions: 'You are helpful.' } })
    // Should be same input (no trimming), possibly with task message appended
    assert.ok(result.input.length >= input.length)
  })

  it('injects task summary when tasks exist and input fits', () => {
    const tasks = [{ id: '1', name: 'Test task', status: 'in_progress' }]
    const filter = createContextTrimmer({
      maxContextTokens: 100000,
      getTasks: () => tasks,
      emitter: noop,
      agentName: 'test',
    })

    const input = [{ role: 'user', content: 'Do something' }]
    const result = filter({ modelData: { input, instructions: 'System.' } })

    const systemMsgs = result.input.filter((i) => i.role === 'system')
    assert.ok(systemMsgs.length > 0)
    assert.ok(systemMsgs.some((m) => m.content.includes('Test task')))
  })
})

// ---------------------------------------------------------------------------
// createContextTrimmer — trimming
// ---------------------------------------------------------------------------

describe('createContextTrimmer — trims when over budget', () => {
  const noop = { emit: () => {} }

  it('removes old middle items to fit within budget', () => {
    // Each result ~250 tokens (1000 chars / 4)
    const mediumOutput = 'x'.repeat(1000)

    const input = [
      { role: 'user', content: 'Convert the codebase' },
    ]
    // Add 100 tool call/result pairs (~200 items, ~25K+ tokens total)
    // This ensures middle section is large enough to require trimming
    for (let i = 0; i < 100; i++) {
      input.push({ type: 'function_call', name: 'read_file', arguments: `{"filePath":"file${i}.js"}` })
      input.push({ type: 'function_call_result', output: mediumOutput, callId: `call_${i}` })
    }

    const filter = createContextTrimmer({
      maxContextTokens: 20000, // Budget allows ~80K chars. Input is ~100K+ chars, so middle gets trimmed.
      getTasks: () => [{ id: '1', name: 'Active work', status: 'in_progress' }],
      emitter: noop,
      agentName: 'test',
    })

    const result = filter({ modelData: { input, instructions: 'System prompt here.' } })

    // Should have fewer items than the original
    assert.ok(result.input.length < input.length, `expected fewer items: got ${result.input.length} vs ${input.length}`)

    // Should still have the user message at the start
    assert.equal(result.input[0].role, 'user')
    assert.equal(result.input[0].content, 'Convert the codebase')

    // Should have a trim notice
    const trimNotice = result.input.find((i) => i.role === 'system' && i.content.includes('Context trimmed'))
    assert.ok(trimNotice, 'should include context trimmed notice')

    // Should have task summary
    const taskMsg = result.input.find((i) => i.role === 'system' && i.content.includes('Active work'))
    assert.ok(taskMsg, 'should include task summary')

    // Should preserve recent items (tail)
    const lastItem = result.input[result.input.length - 1]
    assert.equal(lastItem.type, 'function_call_result')
  })

  it('preserves instructions field unchanged', () => {
    const bigOutput = 'x'.repeat(10000)
    const input = [
      { role: 'user', content: 'Hello' },
      { type: 'function_call_result', output: bigOutput },
      { type: 'function_call_result', output: bigOutput },
    ]

    const filter = createContextTrimmer({
      maxContextTokens: 1000,
      getTasks: null,
      emitter: noop,
      agentName: 'test',
    })

    const instructions = 'Do not change me.'
    const result = filter({ modelData: { input, instructions } })
    assert.equal(result.instructions, instructions)
  })

  it('emits inference:start event', () => {
    const events = []
    const emitter = { emit: (name, data) => events.push({ name, data }) }

    const filter = createContextTrimmer({
      maxContextTokens: 100000,
      getTasks: () => [],
      emitter,
      agentName: 'my-agent',
    })

    filter({ modelData: { input: [{ role: 'user', content: 'hi' }], instructions: '' } })
    assert.equal(events.length, 1)
    assert.equal(events[0].name, 'inference:start')
    assert.equal(events[0].data.agentName, 'my-agent')
  })
})
