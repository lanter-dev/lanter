export const MAX_TOOL_OUTPUT_CHARS = 32000 // ~8K tokens

export function truncateToolOutput(str, max = MAX_TOOL_OUTPUT_CHARS) {
  if (!str || str.length <= max) return str
  const cut = str.lastIndexOf('\n', max)
  const sliceAt = cut > max * 0.5 ? cut : max
  return str.slice(0, sliceAt) + `\n\n[OUTPUT TRUNCATED — showing ${sliceAt} of ${str.length} chars. Use more specific queries (narrower glob, grep pattern, or read specific file ranges) to get the data you need.]`
}
