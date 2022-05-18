import type * as IipcRenderer from "@sing-preload/ipcRenderer"
import type { ITrack } from "@sing-types/Track"
import type {
  IUserSettings,
  IUserSettingsKey,
} from "@sing-main/lib/UserSettings"
import * as consts from "@sing-preload/Channels"
import { vi } from "vitest"
import trackFactory from "./factories/trackFactory"

trackFactory.rewindSequence()
const tracks = trackFactory.buildList(20)

export const mockedApiTracks: readonly ITrack[] = tracks

function createMockedElectronAPI(): typeof IipcRenderer {
  return {
    getTracks: vi.fn(() => Promise.resolve(mockedApiTracks)),
    sync,
    setUserSettings,
    openDirectory,
    openMusicFolder,
    getPath,
    getUserSetting,
    listen,
    removeListener,
    send,
  }
}

export default createMockedElectronAPI()

async function sync() {
  return
}

async function setUserSettings<Key extends IUserSettingsKey>(
  _setting: Key,
  _value: IUserSettings[Key]
) {
  return
}

async function openDirectory(_options: Electron.OpenDialogOptions = {}) {
  return "F:/test/test"
}
async function openMusicFolder() {
  return "F:/test/music"
}

async function getPath(_name: string) {
  throw new Error("not implemented")
}

async function getUserSetting(setting: IUserSettingsKey) {
  switch (setting) {
    case "musicFolders":
      return ["F:/invoked/getUserSetting/with/musicFolders", "D:/test/Test"]
    case "lightTheme":
      return false

    default:
      throw new Error(
        "could not find requested userSetting in mocked getUserSetting"
      )
  }
}

function listen(
  channel: typeof consts.listener[number],
  _callback: (args: any) => any
) {
  if (!consts.listener.includes(channel))
    throw new Error(`Invalid channel to listen to: ${channel}`)

  return
}

function removeListener(
  channel: typeof consts.listener[number],
  _callback: (args: any) => any
) {
  if (!consts.listener.includes(channel))
    throw new Error(`Invalid channel to listen to: ${channel}`)

  return
}

function send(_channel: typeof consts.listener[number], _message: string) {
  return
}
