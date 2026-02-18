import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createCountLinesTool } from '../src/agent/tools/count-lines.js'

let tmpDir

function exec(tool, args) {
  return tool.invoke({}, JSON.stringify(args))
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanter-countlines-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('count_lines tool', () => {
  it('counts lines per file and total', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.js'), 'line1\nline2\nline3')
    fs.writeFileSync(path.join(tmpDir, 'b.js'), 'one\ntwo')

    const tool = createCountLinesTool({ inputDir: tmpDir })
    const result = await exec(tool, { pattern: '*.js' })
    assert.ok(result.includes('a.js'))
    assert.ok(result.includes('b.js'))
    assert.ok(result.includes('total'))
    // a.js has 3 lines, b.js has 2 lines, total = 5
    assert.ok(result.includes('5\ttotal'))
  })

  it('returns no-match message for unmatched pattern', async () => {
    const tool = createCountLinesTool({ inputDir: tmpDir })
    const result = await exec(tool, { pattern: '*.xyz' })
    assert.equal(result, 'No files matched the pattern.')
  })

  it('handles nested patterns', async () => {
    fs.mkdirSync(path.join(tmpDir, 'src'))
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.py'), 'print("hi")\n')

    const tool = createCountLinesTool({ inputDir: tmpDir })
    const result = await exec(tool, { pattern: 'src/**/*.py' })
    assert.ok(result.includes('src/main.py'))
    assert.ok(result.includes('total'))
  })
})
