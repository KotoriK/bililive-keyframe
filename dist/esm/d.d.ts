export interface M3U8 {
    allowCache: boolean;
    discontinuityStarts: Array<unknown>;
    segments?: Array<Segment>;
    playlists?: Array<PlayList>;
    mediaGroups: {
        AUDIO: {};
        VIDEO: {};
        "CLOSED-CAPTIONS": {};
        SUBTITLES: {};
    };
    start: Start;
    mediaSequence: number;
    targetDuration: number;
    discontinuitySequence: number;
}
export interface Segment {
    duration: number;
    uri: string;
    timeline: number;
    map: Array<null>;
}
export interface SegmentsWithReferer {
    segments: Array<Segment>;
    base: string;
}
export interface PlayList {
    attributes: Array<null>;
    uri: string;
    timeline: number;
}
export interface Start {
    timeOffset: number;
    precise: boolean;
}
