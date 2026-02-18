import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createTaskTool } from '../src/agent/tools/task.js'

function makeTool() {
  return createTaskTool()
}

function exec(tool, args) {
  return tool.invoke({}, JSON.stringify(args))
}

describe('task tool – create', () => {
  it('creates a task and returns JSON with all fields', async () => {
    const { tool } = makeTool()
    const raw = await exec(tool, { action: 'create', name: 'Convert config' })
    const task = JSON.parse(raw)
    assert.equal(task.id, '1')
    assert.equal(task.name, 'Convert config')
    assert.equal(task.status, 'todo')
    assert.equal(task.priority, 'medium')
    assert.equal(task.description, '')
    assert.ok(task.createdAt)
    assert.ok(task.updatedAt)
  })

  it('accepts optional description and priority', async () => {
    const { tool } = makeTool()
    const raw = await exec(tool, {
      action: 'create',
      name: 'Setup deps',
      description: 'Install all dependencies',
      priority: 'high',
    })
    const task = JSON.parse(raw)
    assert.equal(task.description, 'Install all dependencies')
    assert.equal(task.priority, 'high')
  })

  it('auto-increments IDs', async () => {
    const { tool } = makeTool()
    const t1 = JSON.parse(await exec(tool, { action: 'create', name: 'A' }))
    const t2 = JSON.parse(await exec(tool, { action: 'create', name: 'B' }))
    assert.equal(t1.id, '1')
    assert.equal(t2.id, '2')
  })

  it('returns error when name is missing', async () => {
    const { tool } = makeTool()
    const result = await exec(tool, { action: 'create' })
    assert.ok(result.startsWith('Error'))
  })

  it('rejects duplicate task names', async () => {
    const { tool } = makeTool()
    await exec(tool, { action: 'create', name: 'Setup deps' })
    const result = await exec(tool, { action: 'create', name: 'Setup deps' })
    assert.ok(result.includes('already exists'))
    assert.ok(result.includes('#1'))
  })
})

describe('task tool – update', () => {
  it('updates status of an existing task', async () => {
    const { tool } = makeTool()
    await exec(tool, { action: 'create', name: 'Test' })
    const raw = await exec(tool, { action: 'update', taskId: '1', status: 'done' })
    const task = JSON.parse(raw)
    assert.equal(task.status, 'done')
  })

  it('updates name and description', async () => {
    const { tool } = makeTool()
    await exec(tool, { action: 'create', name: 'Old name' })
    const raw = await exec(tool, { action: 'update', taskId: '1', name: 'New name', description: 'Details' })
    const task = JSON.parse(raw)
    assert.equal(task.name, 'New name')
    assert.equal(task.description, 'Details')
  })

  it('returns error for missing taskId', async () => {
    const { tool } = makeTool()
    const result = await exec(tool, { action: 'update', status: 'done' })
    assert.ok(result.startsWith('Error'))
  })

  it('returns error for non-existent task', async () => {
    const { tool } = makeTool()
    const result = await exec(tool, { action: 'update', taskId: '99' })
    assert.ok(result.includes('not found'))
  })
})

describe('task tool – get', () => {
  it('retrieves a task by ID', async () => {
    const { tool } = makeTool()
    await exec(tool, { action: 'create', name: 'My task' })
    const raw = await exec(tool, { action: 'get', taskId: '1' })
    const task = JSON.parse(raw)
    assert.equal(task.name, 'My task')
  })

  it('returns error for missing taskId', async () => {
    const { tool } = makeTool()
    const result = await exec(tool, { action: 'get' })
    assert.ok(result.startsWith('Error'))
  })

  it('returns error for non-existent task', async () => {
    const { tool } = makeTool()
    const result = await exec(tool, { action: 'get', taskId: '42' })
    assert.ok(result.includes('not found'))
  })
})

describe('task tool – list', () => {
  it('lists all tasks as one-line-per-task', async () => {
    const { tool } = makeTool()
    await exec(tool, { action: 'create', name: 'Task A' })
    await exec(tool, { action: 'create', name: 'Task B' })
    const result = await exec(tool, { action: 'list' })
    assert.ok(result.includes('#1'))
    assert.ok(result.includes('#2'))
    assert.ok(result.includes('Task A'))
    assert.ok(result.includes('Task B'))
  })

  it('filters by status', async () => {
    const { tool } = makeTool()
    await exec(tool, { action: 'create', name: 'Task A' })
    await exec(tool, { action: 'create', name: 'Task B' })
    await exec(tool, { action: 'update', taskId: '1', status: 'done' })
    const result = await exec(tool, { action: 'list', status: 'todo' })
    assert.ok(!result.includes('Task A'))
    assert.ok(result.includes('Task B'))
  })

  it('returns message when no tasks found', async () => {
    const { tool } = makeTool()
    const result = await exec(tool, { action: 'list' })
    assert.equal(result, 'No tasks found.')
  })
})

describe('task tool – isolation', () => {
  it('each createTaskTool() gets its own store', async () => {
    const { tool: tool1 } = makeTool()
    const { tool: tool2 } = makeTool()
    await exec(tool1, { action: 'create', name: 'Only in tool1' })
    const list1 = await exec(tool1, { action: 'list' })
    const list2 = await exec(tool2, { action: 'list' })
    assert.ok(list1.includes('Only in tool1'))
    assert.equal(list2, 'No tasks found.')
  })
})

describe('task tool – getTasks accessor', () => {
  it('returns empty array when no tasks exist', () => {
    const { getTasks } = makeTool()
    assert.deepEqual(getTasks(), [])
  })

  it('returns snapshot of all tasks', async () => {
    const { tool, getTasks } = makeTool()
    await exec(tool, { action: 'create', name: 'Task A' })
    await exec(tool, { action: 'create', name: 'Task B' })
    const tasks = getTasks()
    assert.equal(tasks.length, 2)
    assert.equal(tasks[0].name, 'Task A')
    assert.equal(tasks[1].name, 'Task B')
  })

  it('reflects status updates', async () => {
    const { tool, getTasks } = makeTool()
    await exec(tool, { action: 'create', name: 'Task A' })
    await exec(tool, { action: 'update', taskId: '1', status: 'done' })
    const tasks = getTasks()
    assert.equal(tasks[0].status, 'done')
  })
})
