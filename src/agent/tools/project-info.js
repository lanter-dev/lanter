import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'

const MANIFEST_FILES = [
  'package.json',
  'requirements.txt',
  'Pipfile',
  'pyproject.toml',
  'setup.py',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Gemfile',
  'composer.json',
  'pubspec.yaml',
  'Package.swift',
  'CMakeLists.txt',
  'Makefile',
]

const VERSION_FILES = [
  '.nvmrc',
  '.node-version',
  '.python-version',
  '.ruby-version',
  '.java-version',
  '.tool-versions',
  'rust-toolchain.toml',
  'rust-toolchain',
]

export function createProjectInfoTool({ inputDir }) {
  return tool({
    name: 'project_info',
    description: 'Detect project type, manifests, and runtime hints. Returns structured information about the project without executing any commands.',
    parameters: z.object({}),
    async execute() {
      const info = {
        manifests: [],
        runtimeHints: {},
      }

      for (const file of MANIFEST_FILES) {
        const filePath = path.join(inputDir, file)
        if (fs.existsSync(filePath)) {
          info.manifests.push(file)
        }
      }

      for (const file of VERSION_FILES) {
        const filePath = path.join(inputDir, file)
        if (fs.existsSync(filePath)) {
          try {
            const content = (await fs.promises.readFile(filePath, 'utf-8')).trim()
            info.runtimeHints[file] = content
          } catch {
            info.runtimeHints[file] = '(could not read)'
          }
        }
      }

      const pkgPath = path.join(inputDir, 'package.json')
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf-8'))
          info.packageJson = {
            name: pkg.name,
            version: pkg.version,
            engines: pkg.engines || null,
            dependencyCount: pkg.dependencies ? Object.keys(pkg.dependencies).length : 0,
            devDependencyCount: pkg.devDependencies ? Object.keys(pkg.devDependencies).length : 0,
            scripts: pkg.scripts ? Object.keys(pkg.scripts) : [],
          }
        } catch { /* malformed package.json */ }
      }

      return JSON.stringify(info, null, 2)
    },
  })
}
