import { tool } from '@openai/agents'
import { z } from 'zod'

export function createTaskTool() {
  const tasks = new Map()
  let nextId = 1

  const taskTool = tool({
    name: 'task',
    description:
      'Manage tasks to plan and track progress. Actions: create (new task), update (change status/details), get (single task), list (all or filtered).',
    parameters: z.object({
      action: z.enum(['create', 'update', 'get', 'list']).describe('The action to perform'),
      taskId: z.string().default('').describe('Task ID (required for get/update)'),
      name: z.string().default('').describe('Task name (required for create, optional for update)'),
      description: z.string().default('').describe('Task description'),
      status: z.string().default('').describe('Task status: "todo", "in_progress", "done" (for update or list filter)'),
      priority: z.string().default('').describe('Task priority: "low", "medium", "high"'),
    }),
    async execute(args) {
      const { action } = args

      if (action === 'create') {
        if (!args.name) return 'Error: name is required for create'
        // Prevent duplicate task names
        for (const existing of tasks.values()) {
          if (existing.name === args.name) {
            return `Error: task "${args.name}" already exists as #${existing.id} [${existing.status}]. Use task update to modify it, or task list to see all tasks.`
          }
        }
        const id = String(nextId++)
        const now = new Date().toISOString()
        const task = {
          id,
          name: args.name,
          description: args.description || '',
          status: 'todo',
          priority: args.priority || 'medium',
          createdAt: now,
          updatedAt: now,
        }
        tasks.set(id, task)
        return JSON.stringify(task)
      }

      if (action === 'update') {
        if (!args.taskId) return 'Error: taskId is required for update'
        const task = tasks.get(args.taskId)
        if (!task) return `Error: task #${args.taskId} not found`
        if (args.name) task.name = args.name
        if (args.description) task.description = args.description
        if (args.status) task.status = args.status
        if (args.priority) task.priority = args.priority
        task.updatedAt = new Date().toISOString()
        return JSON.stringify(task)
      }

      if (action === 'get') {
        if (!args.taskId) return 'Error: taskId is required for get'
        const task = tasks.get(args.taskId)
        if (!task) return `Error: task #${args.taskId} not found`
        return JSON.stringify(task)
      }

      if (action === 'list') {
        let entries = [...tasks.values()]
        if (args.status) entries = entries.filter((t) => t.status === args.status)
        if (entries.length === 0) return 'No tasks found.'
        return entries.map((t) => `#${t.id} [${t.status}] ${t.name}`).join('\n')
      }

      return `Error: unknown action "${action}"`
    },
  })

  return {
    tool: taskTool,
    getTasks: () => [...tasks.values()],
  }
}
