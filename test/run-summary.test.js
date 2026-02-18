import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRunSummaryTool } from '../src/agent/tools/run-summary.js'

function exec(tool, args) {
  return tool.invoke({}, JSON.stringify(args))
}

const validSummary = {
  status: 'complete',
  filesConverted: [
    { sourcePath: 'src/index.js', outputPath: 'src/index.py' },
    { sourcePath: 'src/utils.js', outputPath: 'src/utils.py' },
  ],
  filesSkipped: [
    { sourcePath: 'src/native.c', reason: 'Native C extension, no equivalent' },
  ],
  warnings: ['Some type information lost in conversion'],
  notes: 'Conversion completed successfully with minor caveats.',
}

describe('run_summary tool', () => {
  it('records the summary and returns confirmation', async () => {
    const { tool } = createRunSummaryTool()
    const result = await exec(tool, validSummary)
    assert.ok(result.includes('Summary recorded'))
  })

  it('getSummary returns null before tool is called', () => {
    const { getSummary } = createRunSummaryTool()
    assert.equal(getSummary(), null)
  })

  it('getSummary returns the submitted summary', async () => {
    const { tool, getSummary } = createRunSummaryTool()
    await exec(tool, validSummary)
    const summary = getSummary()
    assert.equal(summary.status, 'complete')
    assert.equal(summary.filesConverted.length, 2)
    assert.equal(summary.filesSkipped.length, 1)
    assert.equal(summary.warnings.length, 1)
    assert.equal(summary.notes, 'Conversion completed successfully with minor caveats.')
    assert.equal(summary.filesConverted[0].sourcePath, 'src/index.js')
  })

  it('each createRunSummaryTool gets its own store', async () => {
    const { tool: tool1, getSummary: get1 } = createRunSummaryTool()
    const { getSummary: get2 } = createRunSummaryTool()
    await exec(tool1, validSummary)
    assert.ok(get1() !== null)
    assert.equal(get2(), null)
  })

  it('accepts all status values', async () => {
    for (const status of ['complete', 'partial', 'failed']) {
      const { tool, getSummary } = createRunSummaryTool()
      await exec(tool, { ...validSummary, status })
      assert.equal(getSummary().status, status)
    }
  })

  it('accepts summary without optional notes', async () => {
    const { tool, getSummary } = createRunSummaryTool()
    const withoutNotes = { ...validSummary }
    delete withoutNotes.notes
    await exec(tool, withoutNotes)
    const summary = getSummary()
    assert.equal(summary.status, 'complete')
    assert.equal(summary.notes, undefined)
  })
})
