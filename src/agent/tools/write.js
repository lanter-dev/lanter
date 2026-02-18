import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'

export function createWriteTool({ outputDir }) {
  return tool({
    name: 'write_file',
    description: 'Write content to a file in the output directory. Creates parent directories as needed.',
    parameters: z.object({
      filePath: z.string().describe('The path relative to the output directory'),
      content: z.string().describe('The content to write to the file'),
    }),
    async execute({ filePath, content }) {
      if (!outputDir) {
        return 'Error: no output directory configured'
      }

      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(outputDir, filePath)

      // Ensure we're writing within the output directory
      if (!resolved.startsWith(path.resolve(outputDir))) {
        return `Error: cannot write outside the output directory: ${resolved}`
      }

      try {
        await fs.promises.mkdir(path.dirname(resolved), { recursive: true })
        await fs.promises.writeFile(resolved, content)
        return `Successfully wrote ${resolved}`
      } catch (err) {
        return `Error writing file ${resolved}: ${err.message}`
      }
    },
  })
}
