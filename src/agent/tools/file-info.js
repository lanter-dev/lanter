import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'

export function createFileInfoTool({ inputDir }) {
  return tool({
    name: 'file_info',
    description: 'Get metadata about a file or directory: existence, type, size, and line count. Path is relative to the input directory.',
    parameters: z.object({
      filePath: z.string().describe('File path relative to input directory'),
    }),
    async execute({ filePath }) {
      const resolved = path.resolve(inputDir, filePath)
      if (!resolved.startsWith(inputDir)) {
        return JSON.stringify({ exists: false, error: 'path is outside the input directory' })
      }

      try {
        const stat = await fs.promises.stat(resolved)
        const info = {
          exists: true,
          type: stat.isDirectory() ? 'directory' : 'file',
          size: stat.size,
        }
        if (stat.isFile()) {
          const content = await fs.promises.readFile(resolved, 'utf-8')
          info.lines = content.split('\n').length
        }
        return JSON.stringify(info)
      } catch (err) {
        if (err.code === 'ENOENT') {
          return JSON.stringify({ exists: false })
        }
        return JSON.stringify({ exists: false, error: err.message })
      }
    },
  })
}
