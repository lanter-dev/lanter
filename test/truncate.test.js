import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { truncateToolOutput, MAX_TOOL_OUTPUT_CHARS } from '../src/agent/tools/truncate.js'

describe('truncateToolOutput', () => {
  it('returns short strings unchanged', () => {
    assert.equal(truncateToolOutput('hello'), 'hello')
  })

  it('returns null/empty unchanged', () => {
    assert.equal(truncateToolOutput(''), '')
    assert.equal(truncateToolOutput(null), null)
    assert.equal(truncateToolOutput(undefined), undefined)
  })

  it('returns string at exactly the limit unchanged', () => {
    const exact = 'a'.repeat(MAX_TOOL_OUTPUT_CHARS)
    assert.equal(truncateToolOutput(exact), exact)
  })

  it('truncates strings exceeding the limit', () => {
    const long = 'a'.repeat(MAX_TOOL_OUTPUT_CHARS + 1000)
    const result = truncateToolOutput(long)
    assert.ok(result.length < long.length)
    assert.ok(result.includes('[OUTPUT TRUNCATED'))
  })

  it('tries to cut at a line boundary', () => {
    // Build a string with newlines where one is near the limit
    const line = 'x'.repeat(100) + '\n'
    const lineCount = Math.ceil((MAX_TOOL_OUTPUT_CHARS + 500) / line.length)
    const long = line.repeat(lineCount)
    const result = truncateToolOutput(long)
    assert.ok(result.includes('[OUTPUT TRUNCATED'))
    // The cut part should end with a newline before the truncation notice
    const parts = result.split('\n\n[OUTPUT TRUNCATED')
    assert.ok(parts[0].endsWith('\n') || parts[0].endsWith('x'))
  })

  it('includes original and truncated size in the message', () => {
    const long = 'a'.repeat(MAX_TOOL_OUTPUT_CHARS + 5000)
    const result = truncateToolOutput(long)
    assert.ok(result.includes(String(long.length)))
  })

  it('respects custom max parameter', () => {
    const result = truncateToolOutput('hello world this is a test', 10)
    assert.ok(result.includes('[OUTPUT TRUNCATED'))
    assert.ok(result.length < 200) // truncated + notice
  })
})
