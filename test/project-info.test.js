import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createProjectInfoTool } from '../src/agent/tools/project-info.js'

let tmpDir

function exec(tool, args) {
  return tool.invoke({}, JSON.stringify(args))
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanter-projinfo-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('project_info tool', () => {
  it('detects manifest files', async () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}')
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'flask')

    const tool = createProjectInfoTool({ inputDir: tmpDir })
    const info = JSON.parse(await exec(tool, {}))
    assert.ok(info.manifests.includes('package.json'))
    assert.ok(info.manifests.includes('requirements.txt'))
  })

  it('reads runtime version files', async () => {
    fs.writeFileSync(path.join(tmpDir, '.nvmrc'), '20.11.0')

    const tool = createProjectInfoTool({ inputDir: tmpDir })
    const info = JSON.parse(await exec(tool, {}))
    assert.equal(info.runtimeHints['.nvmrc'], '20.11.0')
  })

  it('parses package.json fields', async () => {
    const pkg = {
      name: 'test-app',
      version: '1.2.3',
      engines: { node: '>=20' },
      dependencies: { express: '^4', lodash: '^4' },
      devDependencies: { jest: '^29' },
      scripts: { test: 'jest', build: 'tsc' },
    }
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg))

    const tool = createProjectInfoTool({ inputDir: tmpDir })
    const info = JSON.parse(await exec(tool, {}))
    assert.equal(info.packageJson.name, 'test-app')
    assert.equal(info.packageJson.version, '1.2.3')
    assert.deepEqual(info.packageJson.engines, { node: '>=20' })
    assert.equal(info.packageJson.dependencyCount, 2)
    assert.equal(info.packageJson.devDependencyCount, 1)
    assert.deepEqual(info.packageJson.scripts, ['test', 'build'])
  })

  it('returns empty results for bare directory', async () => {
    const tool = createProjectInfoTool({ inputDir: tmpDir })
    const info = JSON.parse(await exec(tool, {}))
    assert.deepEqual(info.manifests, [])
    assert.deepEqual(info.runtimeHints, {})
    assert.equal(info.packageJson, undefined)
  })
})
