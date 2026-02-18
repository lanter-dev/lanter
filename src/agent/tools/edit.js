import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'

export function createEditTool({ outputDir }) {
  return tool({
    name: 'edit_file',
    description: 'Edit a file by replacing an exact string match with new content. The old_string must appear exactly once in the file.',
    parameters: z.object({
      filePath: z.string().describe('The path to the file to edit'),
      oldString: z.string().describe('The exact string to find and replace'),
      newString: z.string().describe('The replacement string'),
    }),
    async execute({ filePath, oldString, newString }) {
      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(outputDir, filePath)

      try {
        const content = await fs.promises.readFile(resolved, 'utf-8')
        const occurrences = content.split(oldString).length - 1

        if (occurrences === 0) {
          return `Error: old_string not found in ${resolved}`
        }
        if (occurrences > 1) {
          return `Error: old_string found ${occurrences} times in ${resolved}. Must be unique.`
        }

        const updated = content.replace(oldString, newString)
        await fs.promises.writeFile(resolved, updated)
        return `Successfully edited ${resolved}`
      } catch (err) {
        return `Error editing file ${resolved}: ${err.message}`
      }
    },
  })
}
