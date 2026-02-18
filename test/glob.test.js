import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createGlobTool } from '../src/agent/tools/glob.js'

let tmpDir

function exec(tool, args) {
  return tool.invoke({}, JSON.stringify(args))
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanter-glob-'))
  fs.mkdirSync(path.join(tmpDir, 'src'))
  fs.writeFileSync(path.join(tmpDir, 'src', 'app.js'), '')
  fs.writeFileSync(path.join(tmpDir, 'src', 'utils.js'), '')
  fs.mkdirSync(path.join(tmpDir, 'src', 'lib'))
  fs.writeFileSync(path.join(tmpDir, 'src', 'lib', 'helper.js'), '')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('glob tool — type parameter', () => {
  it('defaults to files only', async () => {
    const tool = createGlobTool({ inputDir: tmpDir })
    const result = await exec(tool, { pattern: 'src/**/*' })
    assert.ok(result.includes('app.js'))
    assert.ok(result.includes('utils.js'))
    assert.ok(result.includes('helper.js'))
    // Should not include bare directory names without trailing slash
    const lines = result.split('\n')
    for (const line of lines) {
      assert.ok(!line.endsWith('/'), `unexpected directory entry: ${line}`)
    }
  })

  it('returns only directories with type "directories"', async () => {
    const tool = createGlobTool({ inputDir: tmpDir })
    const result = await exec(tool, { pattern: 'src/**/*', type: 'directories' })
    assert.ok(result.includes('lib'))
    // Should not include .js files
    assert.ok(!result.includes('app.js'))
    assert.ok(!result.includes('utils.js'))
  })

  it('returns both files and directories with type "all"', async () => {
    const tool = createGlobTool({ inputDir: tmpDir })
    const result = await exec(tool, { pattern: 'src/**/*', type: 'all' })
    assert.ok(result.includes('app.js'))
    assert.ok(result.includes('lib'))
  })

  it('backward compatible: no type param matches only files', async () => {
    const tool = createGlobTool({ inputDir: tmpDir })
    const result = await exec(tool, { pattern: '**/*.js' })
    const lines = result.split('\n')
    assert.equal(lines.length, 3)
    for (const line of lines) {
      assert.ok(line.endsWith('.js'))
    }
  })
})
