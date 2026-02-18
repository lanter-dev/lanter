import { tool } from '@openai/agents'
import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'

export function createCopyFileTool({ inputDir, outputDir }) {
  return tool({
    name: 'copy_file',
    description:
      'Copy a file from the source (input) directory to the output directory. Use this for non-code files that do not need conversion (README, LICENSE, images, etc.).',
    parameters: z.object({
      filePath: z
        .string()
        .describe('Path relative to the input directory of the file to copy'),
      destPath: z
        .string()
        .default('')
        .describe('Path relative to the output directory. Empty string means same relative path as source.'),
    }),
    async execute({ filePath, destPath }) {
      if (!outputDir) {
        return 'Error: no output directory configured'
      }

      const sourcePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(inputDir, filePath)

      // Ensure source is within input directory
      if (!sourcePath.startsWith(path.resolve(inputDir))) {
        return `Error: source must be within the input directory: ${sourcePath}`
      }

      const relativeDest = destPath || filePath
      const targetPath = path.isAbsolute(relativeDest)
        ? relativeDest
        : path.resolve(outputDir, relativeDest)

      // Ensure destination is within output directory
      if (!targetPath.startsWith(path.resolve(outputDir))) {
        return `Error: cannot write outside the output directory: ${targetPath}`
      }

      try {
        await fs.promises.access(sourcePath)
      } catch {
        return `Error: source file not found: ${sourcePath}`
      }

      try {
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true })
        await fs.promises.copyFile(sourcePath, targetPath)
        return `Copied ${filePath} → ${relativeDest}`
      } catch (err) {
        return `Error copying file: ${err.message}`
      }
    },
  })
}
