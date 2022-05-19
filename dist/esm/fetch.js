import got from 'got';
import { Parser } from 'm3u8-parser';
export function parseM3u8(body) {
    const parser = new Parser();
    parser.push(body);
    parser.end();
    return parser.manifest;
}
export async function fetchM3U8(url, referer) {
    const resp = await got(url, { headers: { referer: referer || url } });
    const txt = resp.body;
    return parseM3u8(txt);
}
export function fetchPlayLists(playlists, referer) {
    return Promise.all(playlists.map(async (playlist) => ({
        segments: (await fetchM3U8(playlist.uri, referer)).segments,
        base: new URL(playlist.uri).origin
    })));
}
export function parseSegements(segements, basePath) {
    return segements.map(({ uri, ...others }) => ({
        uri: uri.startsWith('http') ? uri : new URL(uri, basePath).toString(),
        ...others
    }));
}
