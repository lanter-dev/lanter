import { Agent, Runner, setTracingDisabled } from '@openai/agents'
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

const MAX_TURNS = 500

const noopEmitter = { emit: () => {} }

export async function runAgent({ config, command, inputDir, outputDir, destination, emitter }) {
  const em = emitter || noopEmitter

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

  const runner = new Runner()

  runner.on('agent_start', (_context, ag) => {
    em.emit('agent:start', { agentName: ag.name })
  })

  runner.on('agent_end', (_context, ag, output) => {
    em.emit('agent:done', { agentName: ag.name, output })
  })

  runner.on('agent_tool_start', (_context, _ag, tool, { toolCall }) => {
    let args = {}
    try {
      args = typeof toolCall.arguments === 'string'
        ? JSON.parse(toolCall.arguments)
        : (toolCall.arguments || {})
    } catch {
      args = {}
    }
    em.emit('tool:start', { toolName: tool.name, args })
  })

  runner.on('agent_tool_end', (_context, _ag, tool, result) => {
    em.emit('tool:done', { toolName: tool.name, result })
  })

  const callModelInputFilter = ({ modelData }) => {
    em.emit('inference:start', { agentName: agent.name })
    return modelData
  }

  const result = await runner.run(agent, userMessage, { callModelInputFilter, maxTurns: MAX_TURNS })
  return result.finalOutput
}
