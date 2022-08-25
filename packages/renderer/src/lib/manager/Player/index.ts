/* eslint-disable @typescript-eslint/no-unused-vars */
import { doSideEffectWithEither, sortAlphabetically } from "@/Helper"
import audioPlayer from "@/lib/manager/player/AudioPlayer"
import { derived, get, writable } from "svelte/store"

import indexStore from "./stores/PlayIndex"
import queueStore from "./stores/QueueStore"

import type {
  IPlayLoop,
  IPlayMode,
  IPlayState,
  IQueueItem,
  ISourceType,
} from "@/types/Types"
import type { ITrack, ISyncResult, IAlbum, IArtist } from "@sing-types/Types"
import type { Unsubscriber } from "svelte/store"
import type { IpcRendererEvent } from "electron"

// Create stores / state
const playLoopStore = writable<IPlayLoop>("NONE")
const playModeStore = writable<IPlayMode>("DEFAULT")
const sourceTypeStore = writable<ISourceType>("NONE")
const sourceIDStore = writable<string>("")
const playStateStore = writable<IPlayState>("STOPPED")
const volumeStore = writable(1)
const currentTimeStore = writable(0)
const durationStore = writable(0)
const tracksStore = writable<readonly ITrack[]>([])
const albumsStore = writable<readonly IAlbum[]>([])
const artistsStore = writable<readonly IArtist[]>([])

// TODO add genre to the db, too

// Init stores with the music
await initialiseStores()

// Now it makes sense to create and use the derived stores
export const currentTrack = derived(
  [queueStore, indexStore],
  ([$queue, $index]) => $queue[$index]
)
export const playedTracks = derived(
  [queueStore, indexStore],
  ([$queue, $index]) => $queue.slice(0, $index)
)
export const nextTracks = derived(
  [queueStore, indexStore],
  ([$queue, $index]) => $queue.slice($index + 1)
)

function createPlayerManager() {
  let $playLoop: IPlayLoop = "LOOP_QUEUE"
  let $playMode: IPlayMode = "DEFAULT"
  let $sourceType: ISourceType = "NONE"
  let $sourceID = ""
  let $playState: IPlayState = "STOPPED"
  let $queue: IQueueItem[] = []
  let $currentIndex = -1
  let $currentTrack: IQueueItem
  let $currentTime: number
  let seekAnimationID: number

  // Subscribe to all stores and get the unsubscribers
  // Some vars here just exists for future code
  const unsubscribers: Unsubscriber[] = [
    queueStore.subscribe(($newQueue) => {
      $queue = $newQueue
    }),
    indexStore.subscribe(($newIndex) => {
      $currentIndex = $newIndex
    }),
    playLoopStore.subscribe(($loop) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      $playLoop = $loop
    }),
    playModeStore.subscribe(($mode) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      $playMode = $mode
    }),
    sourceTypeStore.subscribe(($source) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      $sourceType = $source
    }),
    sourceIDStore.subscribe(($id) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      $sourceID = $id
    }),
    playStateStore.subscribe(handlePlayStateUpdate),
    currentTrack.subscribe(($newCurrentTrack) => {
      $currentTrack = $newCurrentTrack
    }),
    currentTimeStore.subscribe(($newCurrentTime) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      $currentTime = $newCurrentTime
    }),
    window.api.listen("syncedMusic", handleSyncUpdate),
  ]

  // Events
  audioPlayer.audio.addEventListener("ended", handleTrackEnded)
  audioPlayer.audio.addEventListener("volumechange", onVolumeChange)

  return {
    destroy,
    isMuted,
    next,
    pause,
    playQueueIndex,
    playSource,
    previous,
    removeIndexFromQueue,
    resume,
    seekTo,
    setMuted,
    setVolume,
  }

  function handleTrackEnded() {
    next()
  }

  function handlePlayStateUpdate(newState: IPlayState) {
    $playState = newState

    if (newState === "PLAYING") {
      durationStore.set($currentTrack.track?.duration || 0)
      intervalUpdateTime()
    } else {
      cancelIntervalUpdateTime()
    }
  }

  function onVolumeChange() {
    volumeStore.set(audioPlayer.getVolume())
  }

  function setVolume(newVolume: number) {
    audioPlayer.setVolume(newVolume)
  }

  function seekTo(percentage: number) {
    const newCurrentTime = ($currentTrack.track.duration || 0) * percentage
    audioPlayer.audio.currentTime = newCurrentTime

    currentTimeStore.set(newCurrentTime)
  }

  function intervalUpdateTime() {
    const newTime = audioPlayer.getCurrentTime()

    currentTimeStore.set(newTime)

    seekAnimationID = requestAnimationFrame(intervalUpdateTime)
  }

  function cancelIntervalUpdateTime() {
    cancelAnimationFrame(seekAnimationID)
  }

  function resetCurrentTime() {
    currentTimeStore.set(0)
  }

  /**
   * Starts playback and initializes the queue
   */
  function playSource(
    track: ITrack,
    fromSource: ISourceType,
    sourceTracks: readonly ITrack[],
    fromIndex: number
  ) {
    indexStore.increment()
    queueStore.setCurrent(track, $currentIndex)

    const sourcePreviousTracks = sourceTracks.slice(0, fromIndex)
    const sourceUpcomingTracks = sourceTracks.slice(fromIndex + 1) // +1 to remove the new current track of it

    queueStore.setUpcomingFromSource(
      [...sourceUpcomingTracks, ...sourcePreviousTracks],
      $currentIndex + 1
    )

    playTrack($currentTrack.track)
  }

  function playTrack(track: ITrack) {
    playStateStore.set("PLAYING")
    audioPlayer.play(track.filepath)
  }

  function resume() {
    playStateStore.set("PLAYING")

    audioPlayer.resume()
  }

  function next() {
    // Update index
    indexStore.update((index) => {
      if (index >= $queue.length - 1) return 0
      return index + 1
    })
    resetCurrentTime()

    // Play next song
    if ($playState === "STOPPED" || $playState === "PAUSED")
      audioPlayer.setSource($currentTrack.track.filepath)
    else audioPlayer.play($currentTrack.track.filepath)
  }

  function previous() {
    indexStore.update((index) => {
      if (index <= 0) return $queue.length - 1
      return index - 1
    })
    resetCurrentTime()

    if ($playState === "STOPPED" || $playState === "PAUSED")
      audioPlayer.setSource($currentTrack.track.filepath)
    else {
      audioPlayer.play($currentTrack.track.filepath)
    }
  }

  function pause() {
    playStateStore.set("PAUSED")
    audioPlayer.pause()
  }

  function setMuted(muted: boolean) {
    audioPlayer.setMuted(muted)
  }

  function isMuted() {
    return audioPlayer.isMuted()
  }

  function destroy() {
    for (const unsubscriber of unsubscribers) {
      unsubscriber()
    }

    audioPlayer.destroy()
  }

  function playQueueIndex(index: number): void {
    indexStore.set(index)

    playTrack($currentTrack.track)
  }

  function removeIndexFromQueue(index: number): void {
    queueStore.removeIndex(index)

    if (index < $currentIndex) {
      indexStore.decrement() // So that the current track stays the same
    }

    if ($currentIndex === index && $playState === "PLAYING") {
      playTrack($currentTrack.track)
    }
  }
}

async function initialiseStores() {
  doSideEffectWithEither(
    await window.api.getTracks(),
    "Failed to get tracks",
    (tracks) => {
      const sortedTracks = [...tracks].sort(sortAlphabetically)

      tracksStore.set(sortedTracks)
      queueStore.setUpcomingFromSource(sortedTracks, 0)
      audioPlayer.setSource(sortedTracks[0].filepath)
    }
  )

  doSideEffectWithEither(
    await window.api.getAlbums(),
    "Failed to get albums",
    (albums) => {
      albumsStore.set(albums)
    }
  )

  doSideEffectWithEither(
    await window.api.getArtists(),
    "Failed to get artists",
    (artists) => {
      artistsStore.set(artists)
    }
  )

  indexStore.set(0)
}

function handleSyncUpdate(_event: IpcRendererEvent, data: ISyncResult) {
  doSideEffectWithEither(
    data,
    "Failed to update the library. Please restart the app",
    ({ tracks, albums, artists }) => {
      const sortedTracks = [...tracks].sort(sortAlphabetically)

      if (tracks.length === 0) {
        console.warn("Received tracks at tracksStore -> data is not valid:", {
          tracks,
          albums,
          artists,
        })
      }

      // Update the stores
      tracksStore.set(sortedTracks)
      albumsStore.set(albums)
      artistsStore.set(artists)

      const newIndex = queueStore.removeItemsFromNewTracks(
        sortedTracks,
        get(indexStore)
      )

      indexStore.set(newIndex)
    }
  )
}

// Export default
const manager = createPlayerManager()
export default manager

// Export stores as read-only to prevent bugs
export const playIndex = { subscribe: indexStore.subscribe }
export const playLoop = { subscribe: playLoopStore.subscribe }
export const playMode = { subscribe: playModeStore.subscribe }
export const sourceType = { subscribe: sourceTypeStore.subscribe }
export const sourceID = { subscribe: sourceIDStore.subscribe }
export const playState = { subscribe: playStateStore.subscribe }
export const volume = { subscribe: volumeStore.subscribe }
export const currentTime = { subscribe: currentTimeStore.subscribe }
export const tracks = { subscribe: tracksStore.subscribe }
export const albums = { subscribe: albumsStore.subscribe }
export const artists = { subscribe: artistsStore.subscribe }