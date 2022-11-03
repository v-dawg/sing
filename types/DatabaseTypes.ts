/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ISortOptions } from "./Types"
import type { IPlaylistID, ITrackID } from "./Opaque"
import type { FilePath } from "./Filesystem"
import type {
  DeepReadonlyNullToUndefined,
  OnlyKeysOf,
  Override,
} from "./Utilities"
import type {
  Prisma,
  Track,
  Album,
  Artist,
  Cover,
  Playlist,
  PlaylistItem,
} from "@prisma/client"
import type { Opaque } from "type-fest"

export type IPlaylist = DeepReadonlyNullToUndefined<Playlist> &
  OnlyKeysOf<
    Prisma.PlaylistGetPayload<{
      include: { thumbnailCovers: true }
    }>,
    {
      thumbnailCovers?: FilePath[]
      id: IPlaylistID
    }
  >

/**
 * Also includes the playlists content in contrast to `IPlaylist`.
 * The content are `IPlaylistItem` and not `ITrack`.
 *
 * For the type with `ITrack` see `IPlaylistWithTracks`
 *
 */
export type IPlaylistWithItems = DeepReadonlyNullToUndefined<Playlist> &
  OnlyKeysOf<
    Prisma.PlaylistGetPayload<{
      include: { thumbnailCovers: true; items: true }
    }>,
    {
      thumbnailCovers?: FilePath[]
      items: readonly IPlaylistItemWithTrack[]
      id: IPlaylistID
    }
  >

/**
 * Also includes the playlists tracks in contrast to `IPlaylist`.
 */
export type IPlaylistWithTracks = IPlaylist & {
  readonly tracks: readonly IPlaylistTrack[]
}

/**
 * Like `ITrack`, but also includes the index of where the track is located (index one would be the first track of the playlist)
 */
export type IPlaylistTrack = ITrack & { readonly manualOrderIndex: number }

export type IPlaylistItem = DeepReadonlyNullToUndefined<
  Override<
    PlaylistItem,
    {
      id: Opaque<number, "IPlaylistItemID">
    }
  >
>

export type IPlaylistItemWithTrack = DeepReadonlyNullToUndefined<
  Override<
    Prisma.PlaylistItemGetPayload<{ include: { track: true } }>,
    {
      id: Opaque<number, "IPlaylistItemID">
      track: ITrack
    }
  >
>

export type ITrack = Override<
  DeepReadonlyNullToUndefined<Track>,
  {
    readonly filepath: FilePath
    readonly cover?: FilePath
    readonly id: ITrackID
  }
>

export type IAlbum = DeepReadonlyNullToUndefined<Album> &
  OnlyKeysOf<
    Prisma.AlbumGetPayload<{
      include: { tracks: true }
    }>,
    {
      cover?: FilePath

      tracks: readonly ITrack[]
    }
  >

export type IArtist = DeepReadonlyNullToUndefined<Artist> &
  OnlyKeysOf<
    Prisma.ArtistGetPayload<{
      include: { albums: true; tracks: true }
    }>,
    {
      readonly tracks: readonly ITrack[]
      readonly albums: readonly IAlbum[]
      readonly image?: FilePath
    }
  >

export type IArtistWithAlbumsAndTracks = IArtist &
  OnlyKeysOf<
    Prisma.ArtistGetPayload<{
      include: { tracks: true; albums: true }
    }>,
    {
      readonly albums: readonly IAlbum[]
      readonly tracks: readonly ITrack[]
    }
  >

export type IDBModels = IArtist | IAlbum | ITrack

export type ICover = DeepReadonlyNullToUndefined<Cover> &
  OnlyKeysOf<
    Cover,
    {
      readonly filepath: FilePath
    }
  >

/**
 * Custom prisma findUnique argument. Used instead of the default one
 */
export type IArtistGetArgument =
  MakeCustomPrismaFindUnique<Prisma.ArtistFindUniqueArgs>

/**
 * Custom prisma findUnique argument. Used instead of the default one
 */
export type IAlbumGetArgument =
  MakeCustomPrismaFindUnique<Prisma.AlbumFindUniqueArgs>

/**
 * Custom prisma findMany argument. Used instead of the default one
 */
export type IPlaylistFindManyArgument = MakeCustomPrismaFindMany<
  Prisma.PlaylistFindManyArgs,
  ISortOptions["playlists"]
>

/**
 * Custom prisma findUnique argument. Used instead of the default one
 */
export type IPlaylistGetArgument = MakeCustomPrismaFindUnique<
  Prisma.PlaylistFindUniqueArgs,
  ISortOptions["playlist"]
>

/**
 * Custom prisma findMany argument. Used instead of the default one
 */
export type IArtistFindManyArgument = MakeCustomPrismaFindMany<
  Prisma.ArtistFindManyArgs,
  ISortOptions["artists"]
>

/**
 * Custom prisma findMany argument. Used instead of the default one
 */
export type IAlbumFindManyArgument = MakeCustomPrismaFindMany<
  Prisma.AlbumFindManyArgs,
  ISortOptions["albums"]
>

/**
 * Custom prisma findMany argument. Used instead of the default one
 */
export type ITrackFindManyArgument = MakeCustomPrismaFindMany<
  Prisma.AlbumFindManyArgs,
  ISortOptions["tracks"]
>

/**
 * Create the default structure for a an music item API call.
 *
 * The second argument is the sorting type, which defaults to `ISortOptions["tracks"]`.
 */
type MakeCustomPrismaFindUnique<
  T extends { where: unknown },
  SortOptions extends ISortOptions[keyof ISortOptions] = ISortOptions["tracks"]
> =
  | Pick<T, "where"> & {
      readonly sortBy?: SortOptions
      readonly isShuffleOn?: boolean
    }

type MakeCustomPrismaFindMany<
  T extends {
    where?: unknown
    orderBy?: Record<string, unknown> | Record<string, unknown>[]
  },
  Sort extends ISortOptions[keyof ISortOptions]
> = Partial<
  Pick<T, "where"> & {
    sortBy: Sort
    isShuffleOn: boolean
  }
>

export type IPlaylistRenameArgument = {
  id: IPlaylistID
  newName: string
}

export type IMusicItems =
  | ITrack
  | IAlbum
  | IArtist
  | IPlaylist
  | readonly ITrack[]
  | readonly IAlbum[]
  | readonly IArtist[]
  | readonly IPlaylist[]
