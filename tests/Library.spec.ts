import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import * as A from "fp-ts/lib/Array"

import { UNKNOWN_ARTIST } from "../packages/shared/Consts"

import { launchElectron } from "./Helper"
import { createBasePage } from "./POM/BasePage"
import { createLibrarySettingsPage } from "./POM/LibrarySettingsPage"

import type { ElectronApplication } from "playwright"

let electron: ElectronApplication

beforeAll(async () => {
  electron = await launchElectron()

  const basePage = await createBasePage(electron)

  basePage.resetTo.settingsLibrary()
})

afterAll(async () => {
  await electron.close()
})

beforeEach(async () => {
  const basePage = await createBasePage(electron)
  await basePage.resetTo.settingsLibrary()
})

it("can add a folder", async () => {
  const nameToAdd = "testdata/folder"

  const settingsPage = await createLibrarySettingsPage(electron)
  await settingsPage.removeAllFolders()

  await settingsPage.addFolder(nameToAdd)

  const folderNames = await settingsPage.getFolderNames()

  expect(folderNames).to.contain(nameToAdd)
})

describe("When adding all folders", async () => {
  beforeEach(async () => {
    const settingsPage = await createLibrarySettingsPage(electron)
    await settingsPage.emptyLibrary()

    await settingsPage.setDefaultFolders()
    await settingsPage.closeAllNotifications()
    await settingsPage.saveAndSyncFolders()
  })

  it("should correctly add tracks with an unknown artist and album", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)
    const tracksPage = await settingsPage.goTo.tracks()

    // Nessecary as they still got displayed until a refresh for some reason
    await tracksPage.reload()
    await tracksPage.waitToBeVisible()

    const expectedTitles = ["00", "01", "02", "03"]

    const allTitles = await tracksPage.trackList
      .getTracks()
      .then((tracks) => tracks.map((track) => track.title))

    for (const title of expectedTitles) {
      expect(allTitles).to.be.an("array").that.includes(title)
    }
  })

  it("should add `Unknown artist` to artists", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)
    const artistsPage = await settingsPage.goTo.artists()

    const artists = await Promise.all(
      await artistsPage.cards
        .getAll()
        .then(
          A.map((artistCard) => artistCard.getData().then((data) => data.title))
        )
    )

    expect(artists).to.be.an("array").that.includes(UNKNOWN_ARTIST)
  })
})

describe("when removing all folders after having folders added", async () => {
  beforeEach(async () => {
    const settingsPage = await createLibrarySettingsPage(electron)

    await settingsPage.setDefaultFolders()
    await settingsPage.closeAllNotifications()
    await settingsPage.saveAndSyncFolders()

    await settingsPage.emptyLibrary()
  })

  it("has no current track", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)

    const currentTrack = await settingsPage.playbar.getCurrentTrack()

    expect(currentTrack).toBe(undefined)
  })

  it("does not have a queue", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)

    const queueLength = await settingsPage.queuebar.getQueueLength()

    expect(queueLength).toBe(0)
  })

  it("has no tracks in the tracks page", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)

    const tracksPage = await settingsPage.goTo.tracks()

    const hasTracks = await tracksPage.trackList.hasTracks()

    expect(hasTracks).toBe(false)
  })

  it("has no albums in the albums page", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)

    const albumsPage = await settingsPage.goTo.albums()

    const hasAlbums = await albumsPage.cards.hasCards()

    expect(hasAlbums).toBe(false)
  })

  it("has no artists in the artists page", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)

    const artistsPage = await settingsPage.goTo.artists()

    const hasArtists = await artistsPage.cards.hasCards()

    expect(hasArtists).toBe(false)
  })
})

describe("when removing all folders and instead adding new ones", async () => {
  beforeEach(async () => {
    const settingsPage = await createLibrarySettingsPage(electron)
    await settingsPage.emptyLibrary()

    await settingsPage.removeAllFolders()
    await settingsPage.addFolder(1)
    await settingsPage.addFolder(2)
    await settingsPage.closeAllNotifications()
    await settingsPage.saveAndSyncFolders()
  })

  it("does not have a queue", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)
    const tracksPage = await settingsPage.goTo.tracks()
    await tracksPage.trackList.playTrack("10")
    await tracksPage.goTo.settingsLibrary()

    await settingsPage.removeAllFolders()
    await settingsPage.addFolder(0)
    await settingsPage.closeAllNotifications()
    await settingsPage.saveAndSyncFolders()

    const queueLength = await settingsPage.queuebar.getQueueLength()

    expect(queueLength).toBe(0)
  })
})

describe("when removing one folder", async () => {
  beforeEach(async () => {
    const settingsPage = await createLibrarySettingsPage(electron)
    await settingsPage.setDefaultFolders()
    await settingsPage.closeAllNotifications()
    await settingsPage.saveAndSyncFolders()
  })

  it("does delete the tracks from the folder in the queue", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)

    const trackPage = await settingsPage.goTo.tracks()
    await trackPage.trackList.playTrack("01")

    await trackPage.goTo.settingsLibrary()

    await settingsPage.removeFolder(0)
    await settingsPage.closeAllNotifications()
    await settingsPage.saveAndSyncFolders()

    const foldersAddedToQueue = await settingsPage.queuebar.getAddedFolders()

    expect(foldersAddedToQueue.indexOf(0)).toBe(-1)
  })

  it("does delete the tracks from the folder in the tracks page", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)

    await settingsPage.removeFolder(0)
    await settingsPage.closeAllNotifications()
    await settingsPage.saveAndSyncFolders()

    const tracksPage = await settingsPage.goTo.tracks()

    const addedFolders = await tracksPage.trackList.getAddedFolders()

    expect(addedFolders).toEqual([1, 2])
  })

  it("changes the current track if it came from the removed folder", async () => {
    const settingsPage = await createLibrarySettingsPage(electron)
    const tracksPage = await settingsPage.goTo.tracks()

    const trackToPlay = "10"
    await tracksPage.trackList.playTrack(trackToPlay)
    const waitForTrack =
      settingsPage.playbar.waitForCurrentTrackToBecome(trackToPlay)

    await expect(
      waitForTrack,
      "Is not playing clicked track"
    ).resolves.not.toThrow()

    await tracksPage.goTo.settingsLibrary()

    await settingsPage.removeFolder(0)

    await settingsPage.closeAllNotifications()
    await settingsPage.saveAndSyncFolders()

    const waitForChange2 = settingsPage.playbar.waitForCurrentTrackToChange()

    await expect(waitForChange2).resolves.not.toThrow()
  })
})

describe("when adding one folder from a clear state", async () => {
  beforeEach(async () => {
    const settingsPage = await createLibrarySettingsPage(electron)
    await settingsPage.emptyLibrary()
    await settingsPage.addFolder(0)
    await settingsPage.closeAllNotifications()
    await settingsPage.saveAndSyncFolders()
  })

  it("adds just tracks from the newly added folder to the track page", async () => {
    const expectedTitles = Array.from({ length: 10 }, (_, index) => `0${index}`)

    const settingsPage = await createLibrarySettingsPage(electron)

    const tracksPage = await settingsPage.goTo.tracks()

    const titles = await tracksPage.trackList.getTrackTitles()

    expect(titles).toStrictEqual(expectedTitles)
  })
})
