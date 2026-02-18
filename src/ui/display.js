import ora from 'ora'
import fs from 'node:fs'
import path from 'node:path'
import { labelForTool, formatElapsed, pushHistory } from './history.js'

export function createDisplay(emitter, { auditLogPath, _createSpinner } = {}) {
  const history = []
  const inflightLabels = []
  let spinner = null
  let inferenceStart = null
  let inferenceTimer = null

  const createSpinner = _createSpinner ?? (() => ora({ stream: process.stdout }))

  // Audit log
  let logStream = null
  if (auditLogPath) {
    fs.mkdirSync(path.dirname(auditLogPath), { recursive: true })
    logStream = fs.createWriteStream(auditLogPath, { flags: 'a' })
  }

  function audit(event, detail = '') {
    if (!logStream) return
    logStream.write(`${new Date().toISOString()}  ${event.padEnd(20)}  ${detail}\n`)
  }

  function stopInferenceTimer() {
    if (inferenceTimer) {
      clearInterval(inferenceTimer)
      inferenceTimer = null
    }
  }

  function historyPrefix() {
    if (history.length === 0) return ''
    return history.map(l => `\x1b[2m  ✔ ${l}\x1b[0m`).join('\n') + '\n'
  }

  function ensureSpinner(text) {
    if (!spinner) {
      spinner = createSpinner()
      spinner.prefixText = historyPrefix()
      spinner.start(text)
    } else {
      spinner.prefixText = historyPrefix()
      spinner.text = text
    }
  }

  function stopSpinner() {
    stopInferenceTimer()
    if (spinner) {
      spinner.stop()
      spinner = null
    }
  }

  emitter.on('inference:start', ({ agentName } = {}) => {
    stopInferenceTimer()
    ensureSpinner('thinking...')
    inferenceStart = Date.now()

    inferenceTimer = setInterval(() => {
      if (spinner) {
        spinner.text = `thinking... (${formatElapsed(Date.now() - inferenceStart)})`
      }
    }, 1000)

    audit('inference:start', agentName || '')
  })

  emitter.on('tool:start', (payload) => {
    const label = labelForTool(payload.toolName, payload.args || {})
    inflightLabels.push(label)
    stopInferenceTimer()
    ensureSpinner(label)
    audit('tool:start', `${payload.toolName}  ${JSON.stringify(payload.args || {})}`)
  })

  emitter.on('tool:done', ({ toolName, result } = {}) => {
    const completedLabel = inflightLabels.shift()
    stopInferenceTimer()
    pushHistory(history, completedLabel)

    if (inflightLabels.length > 0) {
      ensureSpinner(inflightLabels[inflightLabels.length - 1])
    } else {
      // Nothing in flight — park the spinner with updated history, no text
      if (spinner) {
        spinner.prefixText = historyPrefix()
        spinner.text = ''
      }
    }

    audit('tool:done', `${toolName}  result_len=${String(result || '').length}`)
  })

  emitter.on('agent:done', ({ agentName } = {}) => {
    stopSpinner()
    inflightLabels.length = 0
    audit('agent:done', agentName || '')
    if (logStream) logStream.end()
    logStream = null
  })

  return {
    stop() {
      stopSpinner()
      inflightLabels.length = 0
      if (logStream) {
        logStream.end()
        logStream = null
      }
    },
    _getHistory: () => [...history],
    _getInflight: () => [...inflightLabels],
  }
}
