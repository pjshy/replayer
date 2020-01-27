import * as React from 'react'

import { ReplayerConfig, Replayer, RecordEvent } from './replayer'

export function useController<T>(events: RecordEvent<T>[], config: Partial<ReplayerConfig<T>>) {
  const replayer = React.useMemo(() => new Replayer(events, config), [events])

  const replayerRef = React.useRef(replayer)

  replayerRef.current = replayer

  const [isPlaying, setIsPlaying] = React.useState(false)

  const [isFinish, setIsFinish] = React.useState(false)

  const [currentTime, setCurrentTime] = React.useState(0)

  const timerRef = React.useRef<number | null>(null)

  const clearRaf = React.useCallback(() => {
    if (timerRef.current !== null) {
      cancelAnimationFrame(timerRef.current)
      timerRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const replayer = replayerRef.current

    if (replayer) {
      replayer.setConfig(config)
    }
  }, [config])

  React.useEffect(() => {
    const replayer = replayerRef.current

    setIsPlaying(false)
    setIsFinish(false)
    setCurrentTime(0)

    replayer.on('play', () => {
      setIsPlaying(true)
      setIsFinish(false)
    })
    replayer.on('pause', () => setIsPlaying(false))
    replayer.on('finish', () => {
      setIsFinish(true)
      setIsPlaying(false)
    })

    return () => {
      replayer.destroy()
    }
  }, [replayerRef.current])

  React.useEffect(() => {
    clearRaf()

    if (isPlaying) {
      const checkTime = () => {
        const time = replayerRef.current.getCurrentTime()

        setCurrentTime(time)

        if (time < replayerRef.current.getTotalTime() && timerRef.current !== null) {
          timerRef.current = requestAnimationFrame(checkTime)
        }
      }
      timerRef.current = requestAnimationFrame(checkTime)
    }
  }, [isPlaying])

  return { replayer: replayerRef.current, currentTime, isPlaying, isFinish, setCurrentTime }
}
