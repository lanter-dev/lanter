import { tool } from '@openai/agents'
import { z } from 'zod'
import fg from 'fast-glob'

export function createGlobTool({ inputDir }) {
  return tool({
    name: 'glob',
    description: 'Search for files matching a glob pattern in the input directory. Returns matching file paths.',
    parameters: z.object({
      pattern: z.string().describe('The glob pattern to match (e.g., "**/*.js", "src/**/*.py")'),
    }),
    async execute({ pattern }) {
      try {
        const files = await fg(pattern, {
          cwd: inputDir,
          dot: false,
          onlyFiles: true,
        })
        if (files.length === 0) {
          return 'No files matched the pattern.'
        }
        return files.sort().join('\n')
      } catch (err) {
        return `Error searching files: ${err.message}`
      }
    },
  })
}
