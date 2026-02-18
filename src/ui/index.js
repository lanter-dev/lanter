import ora from 'ora'
import chalk from 'chalk'

let currentSpinner = null

export function startTask(title) {
  currentSpinner = ora(title).start()
  return currentSpinner
}

export function endTask(spinner, message, success = true) {
  const s = spinner || currentSpinner
  if (!s) return
  if (success) {
    s.succeed(message || s.text)
  } else {
    s.fail(message || s.text)
  }
  if (s === currentSpinner) currentSpinner = null
}

export function logStep(msg) {
  console.log(chalk.blue('  ▸ ') + msg)
}

export function logError(msg) {
  console.error(chalk.red('  ✖ ') + msg)
}

export function logSuccess(msg) {
  console.log(chalk.green('  ✔ ') + msg)
}

export function logWarning(msg) {
  console.log(chalk.yellow('  ⚠ ') + msg)
}

export function showReport(report) {
  console.log()
  console.log(chalk.bold.underline('Evaluation Report'))
  console.log()
  console.log(report)
  console.log()
}
