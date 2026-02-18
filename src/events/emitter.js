import { EventEmitter } from 'node:events'

export function createEmitter() {
  return new EventEmitter()
}
