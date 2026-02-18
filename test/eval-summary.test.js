import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createEvalSummaryTool } from '../src/agent/tools/eval-summary.js'

function exec(tool, args) {
  return tool.invoke({}, JSON.stringify(args))
}

const validSummary = {
  verdict: 'moderate',
  risks: ['Complex ORM queries', 'No equivalent for macro system'],
  blockers: [],
  effort: 'large',
  documents: [
    { path: 'dependencies.md', description: 'Dependency mapping' },
    { path: 'interfaces/rest/openapi.yaml', description: 'REST API contract' },
  ],
}

describe('eval_summary tool', () => {
  it('records the summary and returns confirmation', async () => {
    const { tool } = createEvalSummaryTool()
    const result = await exec(tool, validSummary)
    assert.ok(result.includes('Summary recorded'))
  })

  it('getSummary returns null before tool is called', () => {
    const { getSummary } = createEvalSummaryTool()
    assert.equal(getSummary(), null)
  })

  it('getSummary returns the submitted summary', async () => {
    const { tool, getSummary } = createEvalSummaryTool()
    await exec(tool, validSummary)
    const summary = getSummary()
    assert.equal(summary.verdict, 'moderate')
    assert.equal(summary.effort, 'large')
    assert.equal(summary.risks.length, 2)
    assert.equal(summary.blockers.length, 0)
    assert.equal(summary.documents.length, 2)
    assert.equal(summary.documents[0].path, 'dependencies.md')
  })

  it('each createEvalSummaryTool gets its own store', async () => {
    const { tool: tool1, getSummary: get1 } = createEvalSummaryTool()
    const { getSummary: get2 } = createEvalSummaryTool()
    await exec(tool1, validSummary)
    assert.ok(get1() !== null)
    assert.equal(get2(), null)
  })

  it('accepts all verdict values', async () => {
    for (const verdict of ['straightforward', 'moderate', 'complex', 'high-risk']) {
      const { tool, getSummary } = createEvalSummaryTool()
      await exec(tool, { ...validSummary, verdict })
      assert.equal(getSummary().verdict, verdict)
    }
  })

  it('accepts all effort values', async () => {
    for (const effort of ['small', 'medium', 'large', 'very-large']) {
      const { tool, getSummary } = createEvalSummaryTool()
      await exec(tool, { ...validSummary, effort })
      assert.equal(getSummary().effort, effort)
    }
  })
})
