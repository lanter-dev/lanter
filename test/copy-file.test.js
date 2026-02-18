import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createCopyFileTool } from '../src/agent/tools/copy-file.js'

function exec(tool, args) {
  return tool.invoke({}, JSON.stringify(args))
}

let tmpDir, inputDir, outputDir

beforeEach(async () => {
  tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'copy-file-test-'))
  inputDir = path.join(tmpDir, 'input')
  outputDir = path.join(tmpDir, 'output')
  await fs.promises.mkdir(inputDir, { recursive: true })
  await fs.promises.mkdir(outputDir, { recursive: true })
})

afterEach(async () => {
  await fs.promises.rm(tmpDir, { recursive: true, force: true })
})

describe('copy_file tool', () => {
  it('copies a file from input to output', async () => {
    await fs.promises.writeFile(path.join(inputDir, 'README.md'), '# Hello')
    const tool = createCopyFileTool({ inputDir, outputDir })
    const result = await exec(tool, { filePath: 'README.md' })
    assert.ok(result.includes('Copied'))
    const content = await fs.promises.readFile(path.join(outputDir, 'README.md'), 'utf-8')
    assert.equal(content, '# Hello')
  })

  it('copies to a custom destination path', async () => {
    await fs.promises.writeFile(path.join(inputDir, 'LICENSE'), 'MIT')
    const tool = createCopyFileTool({ inputDir, outputDir })
    const result = await exec(tool, { filePath: 'LICENSE', destPath: 'docs/LICENSE' })
    assert.ok(result.includes('Copied'))
    const content = await fs.promises.readFile(path.join(outputDir, 'docs', 'LICENSE'), 'utf-8')
    assert.equal(content, 'MIT')
  })

  it('preserves nested directory structure', async () => {
    await fs.promises.mkdir(path.join(inputDir, 'assets', 'images'), { recursive: true })
    await fs.promises.writeFile(path.join(inputDir, 'assets', 'images', 'logo.png'), 'png-data')
    const tool = createCopyFileTool({ inputDir, outputDir })
    const result = await exec(tool, { filePath: 'assets/images/logo.png' })
    assert.ok(result.includes('Copied'))
    const content = await fs.promises.readFile(path.join(outputDir, 'assets', 'images', 'logo.png'), 'utf-8')
    assert.equal(content, 'png-data')
  })

  it('rejects source outside input directory', async () => {
    const tool = createCopyFileTool({ inputDir, outputDir })
    const result = await exec(tool, { filePath: '../../../etc/passwd' })
    assert.ok(result.includes('Error'))
    assert.ok(result.includes('input directory'))
  })

  it('rejects destination outside output directory', async () => {
    await fs.promises.writeFile(path.join(inputDir, 'README.md'), '# Hello')
    const tool = createCopyFileTool({ inputDir, outputDir })
    const result = await exec(tool, { filePath: 'README.md', destPath: '../../etc/evil' })
    assert.ok(result.includes('Error'))
    assert.ok(result.includes('output directory'))
  })

  it('returns error when source file does not exist', async () => {
    const tool = createCopyFileTool({ inputDir, outputDir })
    const result = await exec(tool, { filePath: 'nonexistent.md' })
    assert.ok(result.includes('Error'))
    assert.ok(result.includes('not found'))
  })

  it('returns error when no output directory configured', async () => {
    const tool = createCopyFileTool({ inputDir, outputDir: null })
    const result = await exec(tool, { filePath: 'README.md' })
    assert.ok(result.includes('Error'))
    assert.ok(result.includes('no output directory'))
  })
})
