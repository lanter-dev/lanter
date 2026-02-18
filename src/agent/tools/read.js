import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'
import { truncateToolOutput } from './truncate.js'

export function createReadTool({ inputDir, outputDir }) {
  return tool({
    name: 'read_file',
    description: 'Read the contents of a file. Use absolute paths or paths relative to the input/output directories.',
    parameters: z.object({
      filePath: z.string().describe('The path to the file to read'),
    }),
    async execute({ filePath }) {
      let resolved = filePath
      if (!path.isAbsolute(filePath)) {
        const inInput = path.resolve(inputDir, filePath)
        const inOutput = outputDir ? path.resolve(outputDir, filePath) : null
        if (fs.existsSync(inInput)) {
          resolved = inInput
        } else if (inOutput && fs.existsSync(inOutput)) {
          resolved = inOutput
        } else {
          resolved = inInput
        }
      }

      try {
        const content = await fs.promises.readFile(resolved, 'utf-8')
        return truncateToolOutput(content)
      } catch (err) {
        return `Error reading file ${resolved}: ${err.message}`
      }
    },
  })
}
