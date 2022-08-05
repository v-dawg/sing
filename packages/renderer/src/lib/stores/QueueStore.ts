import { get, writable } from "svelte/store"

import type { IQueueItem } from "@/types/Types"
import type { ITrack } from "@sing-types/Types"

function createQueueStore() {
  const { subscribe, set, update } = writable<IQueueItem[]>([])

  return {
    removeIndex,
    removeItemsFromNewTracks,
    reset,
    set,
    setCurrent,
    setUpcomingFromSource,
    subscribe,
    update,
  }

  function removeItemsFromNewTracks(
    newTrackItems: readonly ITrack[],
    currentIndex: number
  ): number {
    const { newQueue, newIndex } = _removeItemsFromNewTracks(
      get({ subscribe }),
      newTrackItems,
      currentIndex
    )

    set(newQueue)

    return newIndex
  }

  function removeIndex(index: number | readonly number[]) {
    update(($queue) => _removeIndex($queue, index))
  }

  function reset(index: number): void {
    update(($queue) => $queue.slice(0, index + 1))
  }

  function setUpcomingFromSource(
    tracks: readonly ITrack[],
    queueIndex: number
  ): void {
    update(($queue) => {
      const played = $queue.slice(0, queueIndex)
      const manuallyAdded = $queue
        .slice(queueIndex)
        .filter((item) => item.isManuallyAdded)

      const newQueueItems: readonly IQueueItem[] = _convertTracksToQueueItem(
        tracks,
        queueIndex
      )

      return [...played, ...manuallyAdded, ...newQueueItems]
    })
  }

  function setCurrent(track: ITrack, index: number) {
    update(($queue) => {
      const newQueueItem: IQueueItem = {
        index,
        isManuallyAdded: false,
        track,
        queueID: Symbol(`${track?.title} queueID`),
      }
      $queue.splice(index, 0, newQueueItem)
      return $queue
    })
  }
}

export function _convertTracksToQueueItem(
  tracks: readonly ITrack[],
  continueFromIndex: number
): IQueueItem[] {
  return tracks.map((track, index) => ({
    index: continueFromIndex + index,
    queueID: Symbol(`${track?.title} queueID`),
    track,
    isManuallyAdded: false,
  }))
}

export function _remapIndexes(
  queueItems: readonly IQueueItem[],
  indexToStart = 0
): IQueueItem[] {
  return [...queueItems].map((item, index) => {
    const newIndex = indexToStart + index

    return {
      ...item,
      index: newIndex,
      queueID: Symbol(`${newIndex} ${item.track?.title || "Unknown"}`),
    }
  })
}

export function _removeIndex(
  queueItems: readonly IQueueItem[],
  indexes: readonly number[] | number
): IQueueItem[] {
  const cleaned = remove(queueItems, indexes)

  return _remapIndexes(cleaned)
}

function remove(
  queueItems: readonly IQueueItem[],
  indexes: number | readonly number[]
) {
  if (typeof indexes === "number") {
    const result = [...queueItems]
    result.splice(indexes, 1)
    return result
  }

  return queueItems.filter((_, index) => !indexes.includes(index))
}

export function _removeItemsFromNewTracks(
  queueItems: readonly IQueueItem[],
  newTrackItems: readonly ITrack[],
  currentIndex: number
) {
  const trackIDs = new Set(newTrackItems.map((track) => track.id))

  const deletedIndexes: number[] = []
  const newQueue = _remapIndexes(
    queueItems.filter((item, index) => {
      if (trackIDs.has(item.track.id)) return true

      deletedIndexes.push(index)
      return false
    })
  )

  const toReduceCurrentIndex =
    deletedIndexes.filter((index) => index <= currentIndex).length +
    (deletedIndexes.includes(currentIndex) ? 1 : 0)

  const newIndex =
    currentIndex - toReduceCurrentIndex < -1
      ? -1
      : currentIndex - toReduceCurrentIndex

  return { newIndex, newQueue }
}

const queue = createQueueStore()

export default queue
