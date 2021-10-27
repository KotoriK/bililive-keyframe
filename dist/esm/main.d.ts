import { M3U8, PlayList, Segment } from './d';
export declare function parseM3u8(body: string): M3U8;
export declare function fetchM3U8(url: string, referer?: string): Promise<M3U8>;
export declare function fetchPlayLists(playlists: Array<PlayList>, referer?: string): Promise<{
    segments: Segment[];
    base: string;
}[]>;
export declare function parseSegements(segements: Array<Segment>, basePath: string): {
    duration: number;
    timeline: number;
    map: null[];
    uri: string;
}[];
