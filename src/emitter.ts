type EventHanlder = <T>(event?: T) => void

export interface Emitter {
  on: (name: string, hanlder: EventHanlder) => void
  emit: <T>(name: string, event?: T) => void
}

export class Emitter {
  private eventMap = new Map<string, EventHanlder[]>()

  on = (name: string, hanlder: EventHanlder) => {
    const hanlderList = this.eventMap.get(name) || []
    hanlderList.push(hanlder)

    this.eventMap.set(name, hanlderList)
  }

  off = (name: string) => {
    this.eventMap.delete(name)
  }

  offAll = () => {
    this.eventMap.clear()
  }

  emit = <T>(name: string, payload?: T) => {
    const hanlderList = this.eventMap.get(name) || []

    hanlderList.map((hanlder) => hanlder(payload))
  }
}
