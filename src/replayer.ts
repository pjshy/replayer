import { Emitter } from './emitter'

export interface RecordEvent<T> {
  timestamp: number
  entity: T
}

interface Action<T> {
  delay: number
  event: RecordEvent<T>
}

export interface ReplayerConfig<T> {
  speed: number
  idleDuration: number
  skipInactive: boolean
  applyEvent: (event: RecordEvent<T> | RecordEvent<T>[]) => void
  shouldSkip?: (event: RecordEvent<T>) => boolean
}

function noop (..._args: any[]) {}

const defaultConfig: ReplayerConfig<any> = {
  speed: 1,
  idleDuration: 5000, // 两次行为之间超过 5s，则认为试一次 idel
  skipInactive: true,
  applyEvent: noop,
}

export class Replayer<T> extends Emitter {
  private baselineTime: number = 0

  private config: ReplayerConfig<T>

  private events: RecordEvent<T>[]

  private actions: Action<T>[] = []

  private raf: number | null = null

  private timeOffset = 0

  private startTimeOffset = 0

  constructor(events: RecordEvent<T>[], config: Partial<ReplayerConfig<T>> = {}) {
    super()

    this.events = events.sort((left, right) => left.timestamp - right.timestamp)
    this.config = { ...defaultConfig, ...config }

    // did mount
    if (this.events.length) {
      this.applyEvent(events[0])
    }
  }

  play = (timeOffset?: number) => {
    this.clear()

    if (typeof timeOffset !== 'undefined') {
      this.timeOffset = timeOffset
    }
    this.baselineTime = this.events[0].timestamp + this.timeOffset
    const actions: Action<T>[] = []
    const syncEvents: RecordEvent<T>[] = []

    for (const event of this.events) {
      if (event.timestamp > this.baselineTime) {
        const delay = event.timestamp - this.baselineTime
        actions.push({ delay, event })
      } else {
        syncEvents.push(event)
      }
    }

    this.applyEvent(syncEvents)

    this.actions.push(...actions)
    this.start()

    this.emit('play')
  }

  pause = () => {
    this.clear()

    this.emit('pause')
  }

  getTotalTime = () => {
    const firstEvent = this.events[0]
    const lastEvent = this.events[this.events.length - 1]

    if (firstEvent && lastEvent) {
      return lastEvent.timestamp - firstEvent.timestamp
    }
    return 0
  }

  getCurrentTime = () => {
    return this.timeOffset + this.startTimeOffset
  }

  setConfig = (config: Partial<ReplayerConfig<T>>) => {
    Object.assign(this.config, config)
  }

  destroy = () => {
    this.offAll()
    this.clear()
    this.events = []
    this.baselineTime = 0
    this.timeOffset = 0
    this.startTimeOffset = 0
    this.config = defaultConfig
  }

  private clear = () => {
    this.actions = []
    this.raf && window.cancelAnimationFrame(this.raf)
  }

  private start = () => {
    this.startTimeOffset = 0

    let lastTime = performance.now()
    const { config, actions } = this
    const { skipInactive, idleDuration, shouldSkip } = config

    function check(this: Replayer<T>, time: number) {
      while (actions.length) {
        const { delay, event } = actions[0]

        if (
          skipInactive &&
          ((shouldSkip && shouldSkip(event)) || delay - this.startTimeOffset >= idleDuration)
        ) {
          this.startTimeOffset = event.timestamp - this.baselineTime
          actions.shift()
          this.applyEvent(event)
          break
        }

        this.startTimeOffset += (time - lastTime) * config.speed
        lastTime = time

        if (this.startTimeOffset > delay) {
          actions.shift()
          this.applyEvent(event)
        } else {
          break
        }
      }

      if (actions.length > 0) {
        this.raf = requestAnimationFrame(check.bind(this))
      }
    }

    this.raf = requestAnimationFrame(check.bind(this))
  }

  private applyEvent = (event: RecordEvent<T> | RecordEvent<T>[]) => {
    this.config.applyEvent(event)

    if (event === this.events[this.events.length - 1]) {
      this.emit('finish')
    }
  }
}
