import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'
import { truncateToolOutput } from './truncate.js'

export function createListDirTool({ inputDir }) {
  return tool({
    name: 'list_dir',
    description: 'List the contents of a directory. Returns entries with type indicators and file sizes. Paths are relative to the input directory.',
    parameters: z.object({
      dirPath: z.string().optional().describe('Directory path relative to input directory (defaults to ".")'),
    }),
    async execute({ dirPath = '.' }) {
      const resolved = path.resolve(inputDir, dirPath)
      if (!resolved.startsWith(inputDir)) {
        return 'Error: path is outside the input directory.'
      }

      try {
        const entries = await fs.promises.readdir(resolved, { withFileTypes: true })
        if (entries.length === 0) {
          return '(empty directory)'
        }

        const lines = []
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
          if (entry.isDirectory()) {
            lines.push(`[dir]  ${entry.name}`)
          } else {
            try {
              const stat = await fs.promises.stat(path.join(resolved, entry.name))
              lines.push(`[file] ${entry.name} (${stat.size} bytes)`)
            } catch {
              lines.push(`[file] ${entry.name}`)
            }
          }
        }
        return truncateToolOutput(lines.join('\n'))
      } catch (err) {
        return `Error listing directory: ${err.message}`
      }
    },
  })
}
