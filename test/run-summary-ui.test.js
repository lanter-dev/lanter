import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatRunSummary } from '../src/ui/run-summary.js'

const fullSummary = {
  status: 'complete',
  filesConverted: [
    { sourcePath: 'src/index.js', outputPath: 'src/index.py' },
    { sourcePath: 'src/utils.js', outputPath: 'src/utils.py' },
  ],
  filesSkipped: [
    { sourcePath: 'src/native.c', reason: 'Native C extension' },
  ],
  warnings: ['Type information lost in conversion'],
  notes: 'All core modules converted successfully.',
}

describe('formatRunSummary', () => {
  it('returns empty string for null summary', () => {
    assert.equal(formatRunSummary(null), '')
    assert.equal(formatRunSummary(undefined), '')
  })

  it('includes the status in uppercase', () => {
    const output = formatRunSummary(fullSummary)
    assert.ok(output.includes('COMPLETE'))
  })

  it('includes file counts', () => {
    const output = formatRunSummary(fullSummary)
    assert.ok(output.includes('2'))
    assert.ok(output.includes('1'))
  })

  it('lists converted files with source and output', () => {
    const output = formatRunSummary(fullSummary)
    assert.ok(output.includes('src/index.js'))
    assert.ok(output.includes('src/index.py'))
    assert.ok(output.includes('src/utils.js'))
    assert.ok(output.includes('src/utils.py'))
  })

  it('lists skipped files with reasons', () => {
    const output = formatRunSummary(fullSummary)
    assert.ok(output.includes('src/native.c'))
    assert.ok(output.includes('Native C extension'))
  })

  it('lists warnings', () => {
    const output = formatRunSummary(fullSummary)
    assert.ok(output.includes('Type information lost in conversion'))
  })

  it('includes notes', () => {
    const output = formatRunSummary(fullSummary)
    assert.ok(output.includes('All core modules converted successfully.'))
  })

  it('omits converted section when empty', () => {
    const output = formatRunSummary({ ...fullSummary, filesConverted: [] })
    assert.ok(!output.includes('Converted:'))
  })

  it('omits skipped section when empty', () => {
    const output = formatRunSummary({ ...fullSummary, filesSkipped: [] })
    assert.ok(!output.includes('Skipped:'))
  })

  it('omits warnings section when empty', () => {
    const output = formatRunSummary({ ...fullSummary, warnings: [] })
    assert.ok(!output.includes('Warnings:'))
  })

  it('omits notes section when not provided', () => {
    const noNotes = { ...fullSummary }
    delete noNotes.notes
    const output = formatRunSummary(noNotes)
    assert.ok(!output.includes('Notes:'))
  })

  it('shows correct status for partial', () => {
    const output = formatRunSummary({ ...fullSummary, status: 'partial' })
    assert.ok(output.includes('PARTIAL'))
  })

  it('shows correct status for failed', () => {
    const output = formatRunSummary({ ...fullSummary, status: 'failed' })
    assert.ok(output.includes('FAILED'))
  })
})
