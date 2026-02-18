import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createFileInfoTool } from '../src/agent/tools/file-info.js'

let tmpDir

function exec(tool, args) {
  return tool.invoke({}, JSON.stringify(args))
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanter-fileinfo-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('file_info tool', () => {
  it('returns info for an existing file', async () => {
    fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'line1\nline2\nline3')

    const tool = createFileInfoTool({ inputDir: tmpDir })
    const info = JSON.parse(await exec(tool, { filePath: 'test.txt' }))
    assert.equal(info.exists, true)
    assert.equal(info.type, 'file')
    assert.equal(info.lines, 3)
    assert.ok(info.size > 0)
  })

  it('returns info for a directory', async () => {
    fs.mkdirSync(path.join(tmpDir, 'mydir'))

    const tool = createFileInfoTool({ inputDir: tmpDir })
    const info = JSON.parse(await exec(tool, { filePath: 'mydir' }))
    assert.equal(info.exists, true)
    assert.equal(info.type, 'directory')
    assert.equal(info.lines, undefined)
  })

  it('returns exists: false for missing file', async () => {
    const tool = createFileInfoTool({ inputDir: tmpDir })
    const info = JSON.parse(await exec(tool, { filePath: 'nope.txt' }))
    assert.equal(info.exists, false)
  })

  it('counts lines correctly', async () => {
    fs.writeFileSync(path.join(tmpDir, 'lines.txt'), 'a\nb\nc\nd\ne')

    const tool = createFileInfoTool({ inputDir: tmpDir })
    const info = JSON.parse(await exec(tool, { filePath: 'lines.txt' }))
    assert.equal(info.lines, 5)
  })

  it('rejects paths outside input directory', async () => {
    const tool = createFileInfoTool({ inputDir: tmpDir })
    const info = JSON.parse(await exec(tool, { filePath: '../../../etc/passwd' }))
    assert.equal(info.exists, false)
    assert.ok(info.error)
  })
})
