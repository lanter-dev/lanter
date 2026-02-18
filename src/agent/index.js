import { Agent, Runner, setTracingDisabled } from '@openai/agents'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTools } from './tools/index.js'
import { getModelProvider } from '../providers/index.js'
import { createContextTrimmer } from './context-trimmer.js'
import { loadArtifact } from '../project/index.js'
import { getProjectDir } from '../utils/paths.js'
import fg from 'fast-glob'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function loadPrompt(name) {
  const promptPath = path.join(__dirname, 'prompts', `${name}.md`)
  return fs.promises.readFile(promptPath, 'utf-8')
}

const MAX_TURNS = 500

const noopEmitter = { emit: () => {} }

export async function runAgent({ config, command, inputDir, outputDir, destination, emitter }) {
  const em = emitter || noopEmitter

  setTracingDisabled(true)

  const model = getModelProvider(config)
  const systemPrompt = await loadPrompt(command)
  const { tools, getTasks, getSummary } = createTools({ inputDir, outputDir, command })

  em.emit('tasks:init', { getTasks })

  const agent = new Agent({
    name: `lanter-${command}`,
    instructions: systemPrompt,
    model,
    tools,
  })

  let userMessage
  if (command === 'evaluate') {
    userMessage = [
      `Evaluate the codebase at: ${inputDir}`,
      `Target conversion language: ${destination}`,
      `Write evaluation documents to: ${outputDir}`,
    ].join('\n')
  } else if (command === 'run') {
    userMessage = await buildRunMessage({ inputDir, outputDir, destination })
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

  const callModelInputFilter = createContextTrimmer({
    maxContextTokens: config.maxContextTokens,
    getTasks,
    emitter: em,
    agentName: agent.name,
  })

  const result = await runner.run(agent, userMessage, { callModelInputFilter, maxTurns: MAX_TURNS })

  if (getSummary) {
    const summary = getSummary()
    if (summary) return { summary, finalOutput: result.finalOutput }
  }

  return { finalOutput: result.finalOutput }
}

async function buildRunMessage({ inputDir, outputDir, destination }) {
  const parts = [
    `Convert the codebase at: ${inputDir}`,
    `Target language: ${destination}`,
    `Write converted files to: ${outputDir}`,
  ]

  // Load evaluation summary if available
  const evalSummaryJson = await loadArtifact(inputDir, 'evaluation/summary.json')
  if (evalSummaryJson) {
    try {
      const evalSummary = JSON.parse(evalSummaryJson)
      parts.push('')
      parts.push('## Evaluation Summary')
      if (evalSummary.verdict) parts.push(`Verdict: ${evalSummary.verdict}`)
      if (evalSummary.effort) parts.push(`Effort: ${evalSummary.effort}`)
      if (evalSummary.risks?.length > 0) {
        parts.push(`Risks: ${evalSummary.risks.join('; ')}`)
      }
      if (evalSummary.blockers?.length > 0) {
        parts.push(`Blockers: ${evalSummary.blockers.join('; ')}`)
      }
    } catch {
      // ignore malformed summary
    }
  }

  // Load evaluation documents
  const evalDocs = ['plan.md', 'dependencies.md', 'platform.md', 'deployment.md']
  for (const docName of evalDocs) {
    const content = await loadArtifact(inputDir, `evaluation/${docName}`)
    if (content) {
      parts.push('')
      parts.push(`## Evaluation: ${docName}`)
      parts.push(content)
    }
  }

  // Load interface specs
  const projectDir = getProjectDir(inputDir)
  const interfacesDir = path.join(projectDir, 'evaluation', 'interfaces')
  try {
    const interfaceFiles = await fg('**/*', { cwd: interfacesDir, onlyFiles: true })
    for (const relPath of interfaceFiles) {
      const content = await fs.promises.readFile(path.join(interfacesDir, relPath), 'utf-8')
      parts.push('')
      parts.push(`## Interface: ${relPath}`)
      parts.push(content)
    }
  } catch {
    // interfaces dir may not exist
  }

  // Append source file listing (cap at 500)
  try {
    const sourceFiles = await fg('**/*', { cwd: inputDir, onlyFiles: true })
    if (sourceFiles.length > 0) {
      parts.push('')
      parts.push('## Source Files')
      const capped = sourceFiles.slice(0, 500)
      parts.push(capped.join('\n'))
      if (sourceFiles.length > 500) {
        parts.push(`... and ${sourceFiles.length - 500} more files`)
      }
    }
  } catch {
    // ignore glob errors
  }

  return parts.join('\n')
}
