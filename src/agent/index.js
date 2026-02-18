import { Agent, run, setTracingDisabled } from '@openai/agents'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTools } from './tools/index.js'
import { getModelProvider } from '../providers/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function loadPrompt(name) {
  const promptPath = path.join(__dirname, 'prompts', `${name}.md`)
  return fs.promises.readFile(promptPath, 'utf-8')
}

export async function runAgent({ config, command, inputDir, outputDir, destination }) {
  // Disable tracing for non-OpenAI providers
  if (config.provider !== 'openai') {
    setTracingDisabled(true)
  }

  const model = getModelProvider(config)
  const systemPrompt = await loadPrompt(command)
  const tools = createTools({ inputDir, outputDir })

  const agent = new Agent({
    name: `lanter-${command}`,
    instructions: systemPrompt,
    model,
    tools,
  })

  let userMessage
  if (command === 'evaluate') {
    userMessage = `Evaluate the codebase at: ${inputDir}`
    if (destination) {
      userMessage += `\nTarget conversion language: ${destination}`
    }
  } else if (command === 'run') {
    userMessage = [
      `Convert the codebase at: ${inputDir}`,
      `Target language: ${destination}`,
      `Write converted files to: ${outputDir}`,
    ].join('\n')
  }

  const result = await run(agent, userMessage)
  return result.finalOutput
}
