import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'node:fs'
import fg from 'fast-glob'
import { truncateToolOutput } from './truncate.js'

export function createCountLinesTool({ inputDir }) {
  return tool({
    name: 'count_lines',
    description: 'Count lines in files matching a glob pattern. Returns per-file line counts and a total.',
    parameters: z.object({
      pattern: z.string().describe('Glob pattern to match files (e.g., "**/*.js", "src/**/*.py")'),
    }),
    async execute({ pattern }) {
      try {
        const files = await fg(pattern, {
          cwd: inputDir,
          dot: false,
          onlyFiles: true,
          absolute: true,
        })

        if (files.length === 0) {
          return 'No files matched the pattern.'
        }

        let total = 0
        const lines = []
        for (const file of files.sort()) {
          const content = await fs.promises.readFile(file, 'utf-8')
          const count = content.split('\n').length
          total += count
          const rel = file.slice(inputDir.length + 1)
          lines.push(`${count}\t${rel}`)
        }
        lines.push(`${total}\ttotal`)
        return truncateToolOutput(lines.join('\n'))
      } catch (err) {
        return `Error counting lines: ${err.message}`
      }
    },
  })
}
