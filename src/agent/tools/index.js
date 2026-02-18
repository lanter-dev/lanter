import { createReadTool } from './read.js'
import { createWriteTool } from './write.js'
import { createEditTool } from './edit.js'
import { createGlobTool } from './glob.js'
import { createGrepTool } from './grep.js'
import { createListDirTool } from './list-dir.js'
import { createFileInfoTool } from './file-info.js'
import { createCountLinesTool } from './count-lines.js'
import { createProjectInfoTool } from './project-info.js'
import { createTaskTool } from './task.js'
import { createEvalSummaryTool } from './eval-summary.js'
import { createRunSummaryTool } from './run-summary.js'
import { createCopyFileTool } from './copy-file.js'

export function createTools({ inputDir, outputDir, command }) {
  const { tool: taskTool, getTasks } = createTaskTool()

  const tools = [
    createReadTool({ inputDir, outputDir }),
    createGlobTool({ inputDir }),
    createGrepTool({ inputDir }),
    createListDirTool({ inputDir }),
    createFileInfoTool({ inputDir }),
    createCountLinesTool({ inputDir }),
    createProjectInfoTool({ inputDir }),
    taskTool,
  ]

  if (outputDir) {
    tools.push(createWriteTool({ outputDir }))
    tools.push(createEditTool({ outputDir }))
  }

  let getSummary = null
  if (command === 'evaluate') {
    const evalSummary = createEvalSummaryTool()
    tools.push(evalSummary.tool)
    getSummary = evalSummary.getSummary
  }

  if (command === 'run') {
    const runSummary = createRunSummaryTool()
    tools.push(runSummary.tool)
    getSummary = runSummary.getSummary
    if (outputDir) {
      tools.push(createCopyFileTool({ inputDir, outputDir }))
    }
  }

  return { tools, getTasks, getSummary }
}
