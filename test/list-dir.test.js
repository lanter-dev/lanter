import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createListDirTool } from '../src/agent/tools/list-dir.js'

let tmpDir

function exec(tool, args) {
  return tool.invoke({}, JSON.stringify(args))
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanter-listdir-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('list_dir tool', () => {
  it('lists files and directories with type indicators', async () => {
    fs.writeFileSync(path.join(tmpDir, 'hello.txt'), 'hi')
    fs.mkdirSync(path.join(tmpDir, 'subdir'))

    const tool = createListDirTool({ inputDir: tmpDir })
    const result = await exec(tool, {})
    assert.ok(result.includes('[file] hello.txt'))
    assert.ok(result.includes('[dir]  subdir'))
  })

  it('shows file sizes in bytes', async () => {
    fs.writeFileSync(path.join(tmpDir, 'data.txt'), 'abcdef')

    const tool = createListDirTool({ inputDir: tmpDir })
    const result = await exec(tool, {})
    assert.ok(result.includes('(6 bytes)'))
  })

  it('returns entries sorted alphabetically', async () => {
    fs.writeFileSync(path.join(tmpDir, 'b.txt'), '')
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), '')
    fs.writeFileSync(path.join(tmpDir, 'c.txt'), '')

    const tool = createListDirTool({ inputDir: tmpDir })
    const result = await exec(tool, {})
    const lines = result.split('\n')
    assert.ok(lines[0].includes('a.txt'))
    assert.ok(lines[1].includes('b.txt'))
    assert.ok(lines[2].includes('c.txt'))
  })

  it('reports empty directory', async () => {
    const tool = createListDirTool({ inputDir: tmpDir })
    const result = await exec(tool, {})
    assert.equal(result, '(empty directory)')
  })

  it('lists subdirectory when dirPath is specified', async () => {
    fs.mkdirSync(path.join(tmpDir, 'sub'))
    fs.writeFileSync(path.join(tmpDir, 'sub', 'inner.js'), 'code')

    const tool = createListDirTool({ inputDir: tmpDir })
    const result = await exec(tool, { dirPath: 'sub' })
    assert.ok(result.includes('inner.js'))
  })

  it('rejects paths outside input directory', async () => {
    const tool = createListDirTool({ inputDir: tmpDir })
    const result = await exec(tool, { dirPath: '../../../etc' })
    assert.ok(result.includes('outside the input directory'))
  })

  it('handles missing directory gracefully', async () => {
    const tool = createListDirTool({ inputDir: tmpDir })
    const result = await exec(tool, { dirPath: 'nonexistent' })
    assert.ok(result.includes('Error'))
  })
})
