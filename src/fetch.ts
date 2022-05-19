import got from 'got';
import { Parser } from 'm3u8-parser'

import { M3U8, PlayList, Segment } from './d';

export function parseM3u8(body: string): M3U8 {
    const parser = new Parser();

    parser.push(body);
    parser.end();

    return parser.manifest
}
export async function fetchM3U8(url: string, referer?: string) {
    const resp = await got(url, { headers: { referer: referer || url } })
    const txt = resp.body
    return parseM3u8(txt)
}
export function fetchPlayLists(playlists: Array<PlayList>, referer?: string) {
    return Promise.all(playlists.map(async playlist => (
        {
            segments: (await fetchM3U8(playlist.uri, referer)).segments,
            base: new URL(playlist.uri).origin
        }
    )
    ))
}
export function parseSegements(segements: Array<Segment>, basePath: string) {
    return segements.map(({ uri, ...others }) => (
        {
            uri: uri.startsWith('http') ? uri : new URL(uri, basePath).toString(),
            ...others
        }
    ))
}