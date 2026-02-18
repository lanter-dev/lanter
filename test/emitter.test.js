import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createEmitter } from '../src/events/emitter.js'

describe('createEmitter', () => {
  it('returns an EventEmitter instance', () => {
    const emitter = createEmitter()
    assert.ok(emitter instanceof EventEmitter)
  })

  it('delivers events to subscribers', () => {
    const emitter = createEmitter()
    const received = []

    emitter.on('tool:start', (payload) => received.push(payload))
    emitter.emit('tool:start', { toolName: 'read_file', args: { filePath: '/a.js' } })

    assert.equal(received.length, 1)
    assert.equal(received[0].toolName, 'read_file')
  })

  it('supports multiple subscribers for the same event', () => {
    const emitter = createEmitter()
    let count = 0

    emitter.on('inference:start', () => count++)
    emitter.on('inference:start', () => count++)
    emitter.emit('inference:start', {})

    assert.equal(count, 2)
  })

  it('does not deliver events to unrelated subscribers', () => {
    const emitter = createEmitter()
    const received = []

    emitter.on('tool:start', (p) => received.push(p))
    emitter.emit('tool:done', { toolName: 'glob', result: '' })

    assert.equal(received.length, 0)
  })

  it('each createEmitter call returns an independent instance', () => {
    const a = createEmitter()
    const b = createEmitter()
    const aEvents = []

    a.on('agent:done', (p) => aEvents.push(p))
    b.emit('agent:done', { agentName: 'b-agent' })

    assert.equal(aEvents.length, 0)
  })

  it('passes payload through unmodified', () => {
    const emitter = createEmitter()
    const payload = { toolName: 'bash', args: { command: 'ls' } }
    let captured

    emitter.on('tool:start', (p) => { captured = p })
    emitter.emit('tool:start', payload)

    assert.deepEqual(captured, payload)
  })
})
