import fs from 'node:fs'
import path from 'node:path'
import { getProjectDir } from '../utils/paths.js'

export async function ensureProjectDir(inputPath) {
  const projectDir = getProjectDir(inputPath)
  await fs.promises.mkdir(projectDir, { recursive: true })
  return projectDir
}

export function getArtifactPath(inputPath, artifactName) {
  return path.join(getProjectDir(inputPath), artifactName)
}

export async function saveArtifact(inputPath, artifactName, content) {
  const projectDir = await ensureProjectDir(inputPath)
  const artifactPath = path.join(projectDir, artifactName)
  await fs.promises.mkdir(path.dirname(artifactPath), { recursive: true })
  await fs.promises.writeFile(artifactPath, content)
  return artifactPath
}

export async function loadArtifact(inputPath, artifactName) {
  const artifactPath = getArtifactPath(inputPath, artifactName)
  try {
    return await fs.promises.readFile(artifactPath, 'utf-8')
  } catch {
    return null
  }
}
