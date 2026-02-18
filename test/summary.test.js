import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatSummary } from '../src/ui/summary.js'

const fullSummary = {
  verdict: 'moderate',
  effort: 'large',
  risks: ['Complex ORM queries', 'No macro equivalent'],
  blockers: ['Proprietary SDK with no alternative'],
  documents: [
    { path: 'dependencies.md', description: 'Dependency mapping' },
    { path: 'interfaces/rest/openapi.yaml', description: 'REST API spec' },
  ],
}

describe('formatSummary', () => {
  it('returns empty string for null summary', () => {
    assert.equal(formatSummary(null), '')
    assert.equal(formatSummary(undefined), '')
  })

  it('includes the verdict in uppercase', () => {
    const output = formatSummary(fullSummary)
    assert.ok(output.includes('MODERATE'))
  })

  it('includes the effort level', () => {
    const output = formatSummary(fullSummary)
    assert.ok(output.includes('large'))
  })

  it('lists all risks', () => {
    const output = formatSummary(fullSummary)
    assert.ok(output.includes('Complex ORM queries'))
    assert.ok(output.includes('No macro equivalent'))
  })

  it('lists all blockers', () => {
    const output = formatSummary(fullSummary)
    assert.ok(output.includes('Proprietary SDK with no alternative'))
  })

  it('lists documents with descriptions', () => {
    const output = formatSummary(fullSummary, '/out')
    assert.ok(output.includes('/out/dependencies.md'))
    assert.ok(output.includes('Dependency mapping'))
    assert.ok(output.includes('/out/interfaces/rest/openapi.yaml'))
    assert.ok(output.includes('REST API spec'))
  })

  it('omits risks section when empty', () => {
    const output = formatSummary({ ...fullSummary, risks: [] })
    assert.ok(!output.includes('Risks:'))
  })

  it('omits blockers section when empty', () => {
    const output = formatSummary({ ...fullSummary, blockers: [] })
    assert.ok(!output.includes('Blockers:'))
  })

  it('shows document paths without prefix when no outputDir', () => {
    const output = formatSummary(fullSummary)
    assert.ok(output.includes('dependencies.md'))
  })
})
