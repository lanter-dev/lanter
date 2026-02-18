import { tool } from '@openai/agents'
import { z } from 'zod'

export function createRunSummaryTool() {
  let summary = null

  const summaryTool = tool({
    name: 'run_summary',
    description:
      'Submit the final conversion summary. Call this exactly once as the very last step after all files have been converted.',
    parameters: z.object({
      status: z
        .enum(['complete', 'partial', 'failed'])
        .describe('Overall conversion status'),
      filesConverted: z
        .array(
          z.object({
            sourcePath: z.string().describe('Relative path of the source file'),
            outputPath: z.string().describe('Relative path of the converted output file'),
          }),
        )
        .describe('List of successfully converted files'),
      filesSkipped: z
        .array(
          z.object({
            sourcePath: z.string().describe('Relative path of the skipped source file'),
            reason: z.string().describe('Why the file was skipped'),
          }),
        )
        .describe('List of files that were skipped'),
      warnings: z
        .array(z.string())
        .describe('Warnings encountered during conversion'),
      notes: z
        .string()
        .optional()
        .describe('Optional notes about the conversion'),
    }),
    async execute(args) {
      summary = args
      return 'Summary recorded. Conversion complete.'
    },
  })

  return {
    tool: summaryTool,
    getSummary: () => summary,
  }
}
