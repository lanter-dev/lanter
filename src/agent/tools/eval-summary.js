import { tool } from '@openai/agents'
import { z } from 'zod'

export function createEvalSummaryTool() {
  let summary = null

  const summaryTool = tool({
    name: 'eval_summary',
    description:
      'Submit the final evaluation summary. Call this exactly once as the very last step of the evaluation after all documents have been written.',
    parameters: z.object({
      verdict: z
        .enum(['straightforward', 'moderate', 'complex', 'high-risk'])
        .describe('Overall feasibility verdict'),
      risks: z
        .array(z.string())
        .describe('Top risks (up to 5)'),
      blockers: z
        .array(z.string())
        .describe('Blocking issues that must be resolved before conversion (empty array if none)'),
      effort: z
        .enum(['small', 'medium', 'large', 'very-large'])
        .describe('Estimated total conversion effort'),
      documents: z
        .array(
          z.object({
            path: z.string().describe('Relative path of the generated document'),
            description: z.string().describe('One-line description of what this document covers'),
          }),
        )
        .describe('List of evaluation documents generated'),
    }),
    async execute(args) {
      summary = args
      return 'Summary recorded. Evaluation complete.'
    },
  })

  return {
    tool: summaryTool,
    getSummary: () => summary,
  }
}
