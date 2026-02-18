import { tool } from '@openai/agents'
import { z } from 'zod'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export function createGrepTool({ inputDir }) {
  return tool({
    name: 'grep',
    description: 'Search file contents for a pattern using grep. Returns matching lines with file paths and line numbers.',
    parameters: z.object({
      pattern: z.string().describe('The search pattern (regex supported)'),
      glob: z.string().optional().describe('Optional glob to filter files (e.g., "*.js")'),
    }),
    async execute({ pattern, glob }) {
      try {
        const args = ['-rn', '--color=never']
        if (glob) {
          args.push(`--include=${glob}`)
        }
        args.push(pattern, '.')

        const { stdout } = await execFileAsync('grep', args, {
          cwd: inputDir,
          maxBuffer: 1024 * 1024,
        })
        const lines = stdout.trim().split('\n')
        if (lines.length > 200) {
          return lines.slice(0, 200).join('\n') + `\n... (${lines.length - 200} more matches)`
        }
        return stdout.trim() || 'No matches found.'
      } catch (err) {
        if (err.code === 1) {
          return 'No matches found.'
        }
        return `Error searching: ${err.message}`
      }
    },
  })
}
