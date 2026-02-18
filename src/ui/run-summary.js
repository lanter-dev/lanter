import chalk from 'chalk'

const STATUS_STYLE = {
  complete: chalk.green.bold,
  partial: chalk.yellow.bold,
  failed: chalk.red.bold,
}

export function formatRunSummary(summary) {
  if (!summary) return ''

  const lines = []

  // Status
  const style = STATUS_STYLE[summary.status] || chalk.bold
  lines.push(style(`  Status: ${summary.status.toUpperCase()}`))
  lines.push(`  Files converted: ${summary.filesConverted.length}`)
  lines.push(`  Files skipped:   ${summary.filesSkipped.length}`)
  lines.push('')

  // Converted files
  if (summary.filesConverted.length > 0) {
    lines.push(chalk.green('  Converted:'))
    for (const file of summary.filesConverted) {
      lines.push(`    ${chalk.dim(file.sourcePath)} ${chalk.dim('\u2192')} ${file.outputPath}`)
    }
    lines.push('')
  }

  // Skipped files
  if (summary.filesSkipped.length > 0) {
    lines.push(chalk.yellow('  Skipped:'))
    for (const file of summary.filesSkipped) {
      lines.push(`    ${chalk.dim(file.sourcePath)}: ${file.reason}`)
    }
    lines.push('')
  }

  // Warnings
  if (summary.warnings.length > 0) {
    lines.push(chalk.yellow('  Warnings:'))
    for (const warning of summary.warnings) {
      lines.push(`    - ${warning}`)
    }
    lines.push('')
  }

  // Notes
  if (summary.notes) {
    lines.push(chalk.blue('  Notes:'))
    lines.push(`    ${summary.notes}`)
  }

  return lines.join('\n')
}
