import {
  act,
  fireEvent,
  render,
  screen,
  type RenderResult,
} from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import { TEST_IDS as id, testAttr } from "@/TestConsts"
import MockedApi from "./MockElectronApi"
import type { SvelteComponentDev } from "svelte/internal"
import { tick } from "svelte"

vi.stubGlobal("api", MockedApi)

let FolderInput: typeof SvelteComponentDev

beforeEach(async () => {
  FolderInput = (await import(
    "@/lib/molecules/FolderInput.svelte"
  )) as unknown as typeof SvelteComponentDev
})

afterEach(async () => {
  vi.resetModules()
})

it("renders the provided path", async () => {
  const path = "A:/AAAAAAA"
  const dom = render(FolderInput, { path })

  expect(await dom.findByText(path, { exact: false })).toBeTruthy()
})

it("emits the added event correctly", async () => {
  // const filePaths = ["A:/AAA"]
  // vi.mocked(window.api.openMusicFolder).mockImplementationOnce(async () => {
  //   return {
  //     canceled: false,
  //     filePaths,
  //   }
  // })
  const dom = render(FolderInput)
  const { component } = dom

  const mock = vi.fn()
  component.$on("folderAdded", mock)

  await fireEvent.click(dom.getByText("Add folder", { exact: false }))
  await tick() // seems to be nessecary when the logic awaits other things before dispatching
  await tick()

  expect(mock).toHaveBeenCalled()
})

it("emits the edit event correctly", async () => {
  const dom = render(FolderInput, { path: "A:/AAA" })
  const { component } = dom

  const mock = vi.fn()
  component.$on("folderEdited", mock)

  await fireEvent.click(dom.getByRole("button"))
  await tick() // seems to be nessecary when the logic awaits other things before dispatching
  await tick()

  screen.debug()

  expect(mock).toHaveBeenCalled()
})

it("emits the removed event correctly", async () => {
  const dom = render(FolderInput, { path: "A:/AAA" })
  const { component } = dom

  const mock = vi.fn()
  component.$on("folderRemoved", mock)

  const deleteIcon = dom.container.querySelector(
    testAttr.asQuery.folderInputDeleteIcon
  )
  if (deleteIcon === null) throw new Error("No delete icon found")

  await fireEvent.click(deleteIcon)
  await tick() // seems to be nessecary when the logic awaits other things before dispatching
  await tick()

  expect(mock).toHaveBeenCalled()
})

it("sets the undefined prop correctly", async () => {
  const dom = render(FolderInput)
  const { component } = dom

  const $$ = component.$$
  const path = $$.ctx[$$.props["path"]]

  expect(path).toBeUndefined()
})

it("sets the defined prop correctly", async () => {
  const path = "A:/ABC"
  const dom = render(FolderInput, { path })
  const { component } = dom

  const $$ = component.$$
  const prop = $$.ctx[$$.props["path"]]

  expect(prop).toBe(path)
})