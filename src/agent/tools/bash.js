import { tool } from '@openai/agents'
import { z } from 'zod'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export function createBashTool({ inputDir }) {
  return tool({
    name: 'bash',
    description: 'Execute a shell command. Commands run in the input directory by default. Use for inspecting project structure, running build tools, etc.',
    parameters: z.object({
      command: z.string().describe('The shell command to execute'),
      cwd: z.string().optional().describe('Working directory (defaults to input directory)'),
    }),
    async execute({ command, cwd }) {
      const workDir = cwd || inputDir

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd: workDir,
          timeout: 60000,
          maxBuffer: 1024 * 1024,
        })
        let result = ''
        if (stdout) result += stdout
        if (stderr) result += (result ? '\n' : '') + stderr
        return result.trim() || '(command completed with no output)'
      } catch (err) {
        let result = `Command failed with exit code ${err.code || 'unknown'}`
        if (err.stdout) result += `\nstdout: ${err.stdout}`
        if (err.stderr) result += `\nstderr: ${err.stderr}`
        return result
      }
    },
  })
}
