import path from 'node:path'
import os from 'node:os'

export function deriveProjectName(inputPath) {
  const resolved = path.resolve(inputPath)
  return resolved.replace(/\//g, '-').replace(/^-/, '')
}

export function getLanterHome() {
  return path.join(os.homedir(), '.lanter')
}

export function getProjectsDir() {
  return path.join(getLanterHome(), 'projects')
}

export function getProjectDir(inputPath) {
  return path.join(getProjectsDir(), deriveProjectName(inputPath))
}
