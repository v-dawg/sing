import type { DirectoryJSON } from "memfs"

export const mockBasePath = "/memfs/"
export const musicFolder = mockBasePath + "music/"
export const coverFolder = mockBasePath + "userData/covers/"
export const filesDefault = {
  [musicFolder]: {
    "./dir1/": {
      "./0.mp3": "0",
      "./1.mp3": "1",
    },
    "./2.mp3": " 2",
    "./3.mp3": "3",
  },
} as const

export const filesDefaultFlat = {
  [musicFolder]: {
    "./0.mp3": "0",
    "./1.mp3": "1",
    "./2.mp3": " 2",
    "./3.mp3": "3",
  },
} as const

//? Filenames with the "unique_cover." prepend will get an unique cover
export const filesUniqueCoversFlat = {
  [musicFolder]: {
    "./0.unique_cover.mp3": "0",
    "./1.unique_cover.mp3": "1",
    "./2.unique_cover.mp3": " 2",
    "./3.unique_cover.mp3": "3",
  },
} as const

export const filesUniqueCoversFlatLength = Object.keys(
  filesUniqueCoversFlat[musicFolder]
).length

export const unusedCoverFilepaths = [
  "coverTest1.png",
  "coverTest2.png",
  "coverTest3.png",
].map((fileName) => coverFolder + fileName)

export const unusedCoversJSON = unusedCoverFilepaths.reduce(
  (acc, path, index) => {
    acc[path] = index.toString()
    return acc
  },
  {} as DirectoryJSON
)
