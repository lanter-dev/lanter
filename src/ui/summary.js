import chalk from 'chalk'

const VERDICT_STYLE = {
  'straightforward': chalk.green.bold,
  'moderate': chalk.yellow.bold,
  'complex': chalk.rgb(255, 165, 0).bold, // orange
  'high-risk': chalk.red.bold,
}

export function formatSummary(summary, outputDir) {
  if (!summary) return ''

  const lines = []

  // Verdict
  const style = VERDICT_STYLE[summary.verdict] || chalk.bold
  lines.push(style(`  Verdict: ${summary.verdict.toUpperCase()}`))
  lines.push(`  Effort:  ${summary.effort}`)
  lines.push('')

  // Risks
  if (summary.risks.length > 0) {
    lines.push(chalk.yellow('  Risks:'))
    for (const risk of summary.risks) {
      lines.push(`    - ${risk}`)
    }
    lines.push('')
  }

  // Blockers
  if (summary.blockers.length > 0) {
    lines.push(chalk.red('  Blockers:'))
    for (const blocker of summary.blockers) {
      lines.push(`    - ${blocker}`)
    }
    lines.push('')
  }

  // Documents
  if (summary.documents.length > 0) {
    lines.push(chalk.blue('  Documents:'))
    for (const doc of summary.documents) {
      const fullPath = outputDir ? `${outputDir}/${doc.path}` : doc.path
      lines.push(`    ${chalk.dim(fullPath)}`)
      lines.push(`      ${doc.description}`)
    }
  }

  return lines.join('\n')
}
