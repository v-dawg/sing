import { TEST_IDS as id } from "../src/Consts"
import { fireEvent, render, waitFor, screen } from "@testing-library/svelte"
import { beforeEach, describe, expect, it, vi } from "vitest"
import mockElectronApi, { mockedApiTracks } from "./MockElectronApi"
import "./setupBasicMocks"
import mockedPlayer from "./mocks/AudioPlayer"
import type { SvelteComponentDev } from "svelte/internal"
import trackFactory from "./factories/trackFactory"

vi.mock("@/lib/manager/AudioPlayer", () => {
  return { default: mockedPlayer }
})
vi.stubGlobal("api", mockElectronApi)

let Playbar: typeof SvelteComponentDev

afterEach(() => {
  vi.resetModules()
})

describe("behaves correctly with valid queue", async () => {
  beforeEach(async () => {
    vi.mocked(window.api.getTracks).mockImplementation(
      async () => mockedApiTracks
    )
    Playbar = (await import(
      "@/lib/organisms/Playbar.svelte"
    )) as unknown as typeof SvelteComponentDev
  })

  it("renders the cover if the current track has a cover", async () => {
    const playbar = render(Playbar)

    expect(playbar.getByTestId(id.playbarCover).nodeName === "IMG").toBeTruthy()
  })

  it("does not render a cover if the current track has no cover", async () => {
    const trackWithNoCover = trackFactory.build()
    delete trackWithNoCover.coverPath

    const newMockedApiTracks = [trackWithNoCover, ...trackFactory.buildList(20)]

    vi.mocked(window.api.getTracks).mockImplementation(
      async () => newMockedApiTracks
    )
    vi.resetModules()
    const Playbar = (await import(
      "@/lib/organisms/Playbar.svelte"
    )) as unknown as typeof SvelteComponentDev
    const playbar = render(Playbar)

    vi.mocked(window.api.getTracks).mockImplementation(
      async () => mockedApiTracks
    )
    expect(playbar.getByTestId(id.playbarCover).nodeName === "DIV").toBeTruthy()
  })

  it("opens the queuebar when clicked on the icon", async () => {
    const playbar = render(Playbar)
    const queueIcon = playbar.getByTestId(id.playbarQueueIcon)
    await fireEvent.click(queueIcon)
    expect(playbar.getByTestId(id.queueBar)).toBeTruthy()
    expect(playbar.getByTestId(id.queueCurrentTrack)).toBeTruthy()
  })

  it("closes the queuebar when clicked on the icon while the queue is open", async () => {
    const playbar = render(Playbar)
    const queueIcon = playbar.getByTestId(id.playbarQueueIcon)
    await fireEvent.click(queueIcon) // Open queuebar
    expect(
      playbar.getByTestId(id.queueBar),
      "Queuebar did not open"
    ).toBeTruthy()
    expect(
      playbar.getByTestId(id.queueCurrentTrack),
      "Queuebar did not open properly"
    ).toBeTruthy()
    await fireEvent.click(queueIcon) // Close queuebar
    await waitFor(() => {
      expect(playbar.queryByTestId(id.queueBar)).toBeNull()
    })
    await waitFor(() => {
      expect(playbar.queryByTestId(id.queueCurrentTrack)).toBeNull()
    })
  })

  it("displays the next song title when pressing the forward button", async () => {
    render(Playbar)
    const button = screen.getByTestId(id.playbarNextButton)
    await fireEvent.click(button)
    const title = screen.getByTestId(id.playbarTitle).textContent
    expect(title).toMatch(mockedApiTracks[1]?.title ?? "Unknown")
  })

  it("displays the next song artist when pressing the forward button", async () => {
    render(Playbar)
    const button = screen.getByTestId(id.playbarNextButton)
    await fireEvent.click(button)
    const artist = screen.getByTestId(id.playbarArtist).textContent

    expect(artist === (mockedApiTracks[1]?.artist || "Unknown")).toBeTruthy()
  })

  it("displays the previous song artist when pressing the back button", async () => {
    render(Playbar)
    const forwardButton = screen.getByTestId(id.playbarNextButton)
    const previousButton = screen.getByTestId(id.playbarBackButton)
    await fireEvent.click(forwardButton)
    await fireEvent.click(previousButton)
    const artist = screen.getByTestId(id.playbarArtist).textContent
    expect(artist === (mockedApiTracks[0]?.artist || "Unknown")).toBeTruthy()
  })

  it("displays the previous song title when pressing the back button", async () => {
    render(Playbar)
    const forwardButton = screen.getByTestId(id.playbarNextButton)
    const previousButton = screen.getByTestId(id.playbarBackButton)
    await fireEvent.click(forwardButton)
    await fireEvent.click(previousButton)
    const title = screen.getByTestId(id.playbarTitle).textContent
    expect(title === (mockedApiTracks[0]?.title || "Unknown")).toBeTruthy()
  })

  it.todo("renders the format of the current duration properly", async () => {})
  it.todo("renders the format of the total duration properly", async () => {})
})

describe("behaves correctly with no tracks", () => {
  beforeEach(async () => {
    vi.mocked(window.api.getTracks).mockImplementation(async () => [])

    Playbar = (await import(
      "@/lib/organisms/Playbar.svelte"
    )) as unknown as typeof SvelteComponentDev
  })

  afterAll(async () => vi.unmock("@/lib/stores/TracksStore"))

  describe("displays no meta data", () => {
    it("does not display artist when store is undefined", () => {
      const playbar = render(Playbar)

      expect(playbar.queryByTestId(id.playbarArtist)).toBeNull()
    })

    it("does not display album when store is undefined", () => {
      const playbar = render(Playbar)
      expect(playbar.queryByTestId(id.playbarAlbum)).toBeNull()
    })

    it("does not display album cover when store is undefined", () => {
      const playbar = render(Playbar)
      expect(
        playbar.queryByTestId(id.playbarCover)?.nodeName !== "IMAGE"
      ).toBeTruthy()
    })
  })

  describe("does not have playback functionality", async () => {
    it("Play button is disabled when store is undefined", () => {
      const playbar = render(Playbar)
      expect(
        playbar.getByTestId(id.playbarPlayButton)?.hasAttribute("disabled")
      ).toBeTruthy()
    })

    it("Back button is disabled when store is undefined", () => {
      const playbar = render(Playbar)
      expect(
        playbar.getByTestId(id.playbarBackButton).hasAttribute("disabled")
      ).toBeTruthy()
    })

    it("Next button is disabled when store is undefined", () => {
      const playbar = render(Playbar)
      expect(
        playbar.getByTestId(id.playbarNextButton).hasAttribute("disabled")
      ).toBeTruthy()
    })

    it("Queue button is disabled when store is undefined", () => {
      const playbar = render(Playbar)
      expect(
        playbar.getByTestId(id.playbarQueueIcon).hasAttribute("disabled")
      ).toBeTruthy()
    })
  })

  describe("displays current time and duration correctly", async () => {
    it("Track current time is empty when store returns undefined", () => {
      const playbar = render(Playbar)
      expect(
        playbar.getByTestId(id.seekbarCurrentTime).innerText === undefined
      ).toBeTruthy()
    })

    it("Track duration is empty when store returns undefined", () => {
      const playbar = render(Playbar)
      expect(
        playbar.getByTestId(id.seekbarCurrentTime).innerText === undefined
      ).toBeTruthy()
    })

    it("Progressbar has no width when store returns undefined", () => {
      const playbar = render(Playbar)
      expect(playbar.getByTestId(id.seekbarProgressbar).style.width).toBe("")
    })
  })
})
