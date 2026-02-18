import { createReadTool } from './read.js'
import { createWriteTool } from './write.js'
import { createEditTool } from './edit.js'
import { createGlobTool } from './glob.js'
import { createGrepTool } from './grep.js'
import { createBashTool } from './bash.js'

export function createTools({ inputDir, outputDir }) {
  const tools = [
    createReadTool({ inputDir, outputDir }),
    createGlobTool({ inputDir }),
    createGrepTool({ inputDir }),
    createBashTool({ inputDir }),
  ]

  if (outputDir) {
    tools.push(createWriteTool({ outputDir }))
    tools.push(createEditTool({ outputDir }))
  }

  return tools
}
