import { Command } from 'commander'
import { registerEvaluateCommand } from './commands/evaluate.js'
import { registerRunCommand } from './commands/run.js'
import { registerConfigCommand } from './commands/config.js'

export function createProgram() {
  const program = new Command()

  program
    .name('lanter')
    .description('CLI tool that uses agentic AI to convert codebases between programming languages')
    .version('0.1.0')
    .option('-p, --provider <name>', 'AI provider (openai, anthropic, ollama)')
    .option('-m, --model <name>', 'Model name to use')

  registerEvaluateCommand(program)
  registerRunCommand(program)
  registerConfigCommand(program)

  return program
}
