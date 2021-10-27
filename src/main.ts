import { Parser } from 'm3u8-parser'

import { M3U8, PlayList, Segment } from './d';
import fetch from 'node-fetch'

export function parseM3u8(body: string): M3U8 {
    const parser = new Parser();

    parser.push(body);
    parser.end();

    return parser.manifest
}
export async function fetchM3U8(url: string, referer?: string) {
    const resp = await fetch(url, { headers: { referrer: referer || url } })
    const txt = await resp.text()
    return parseM3u8(txt)
}
export function fetchPlayLists(playlists: Array<PlayList>, referer?: string) {
    return Promise.all(playlists.map(async playlist => {
        return {
            segments: (await fetchM3U8(playlist.uri, referer)).segments,
            base: new URL(playlist.uri).origin
        }
    }
    ))
}
export function parseSegements(segements: Array<Segment>, basePath: string) {
    return segements.map(({ uri, ...others }) => {
        return {
            uri: uri.startsWith('http') ? uri : new URL(uri, basePath).toString(),
            ...others
        }
    })
}