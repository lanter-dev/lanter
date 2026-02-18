import { tool } from '@openai/agents'
import { z } from 'zod'
import fg from 'fast-glob'
import { truncateToolOutput } from './truncate.js'

export function createGlobTool({ inputDir }) {
  return tool({
    name: 'glob',
    description: 'Search for files matching a glob pattern in the input directory. Returns matching file paths.',
    parameters: z.object({
      pattern: z.string().describe('The glob pattern to match (e.g., "**/*.js", "src/**/*.py")'),
      type: z.enum(['files', 'directories', 'all']).default('files').describe('What to match: "files", "directories", or "all"'),
    }),
    async execute({ pattern, type }) {
      try {
        const opts = {
          cwd: inputDir,
          dot: false,
        }
        if (type === 'directories') {
          opts.onlyDirectories = true
          opts.markDirectories = true
        } else if (type === 'all') {
          opts.onlyFiles = false
          opts.markDirectories = true
        } else {
          opts.onlyFiles = true
        }
        const files = await fg(pattern, opts)
        if (files.length === 0) {
          return 'No files matched the pattern.'
        }
        const result = files.sort().join('\n')
        return truncateToolOutput(result)
      } catch (err) {
        return `Error searching files: ${err.message}`
      }
    },
  })
}
