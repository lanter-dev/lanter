#!/usr/bin/env node

import { createProgram } from '../src/cli/index.js'

const program = createProgram()

try {
  await program.parseAsync(process.argv)
} catch (err) {
  console.error(`Error: ${err.message}`)
  process.exit(1)
}
