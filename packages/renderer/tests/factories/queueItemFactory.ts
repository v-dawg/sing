import { Factory } from "fishery"

import trackFactory from "./trackFactory"

import type { IQueueItem } from "@/types/Types"

class QeueItemFactory extends Factory<IQueueItem> {
  resetTracksSequence() {
    trackFactory.rewindSequence()
    return this
  }
}

const queueItemFactory = QeueItemFactory.define(({ sequence }) => {
  // eslint-disable-next-line no-param-reassign
  sequence -= 1
  const index = sequence

  return {
    index,
    queueID: Symbol(`${sequence} queueID Test`),
    track: trackFactory.build(),
    isManuallyAdded: false,
  }
})

export default queueItemFactory
