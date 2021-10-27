"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKeyframeByRoomId = void 0;
const main_1 = require("./main");
const bilibili_api_1 = require("bilibili-api");
const promises_1 = require("stream/promises");
const beamcoder_1 = require("beamcoder");
const got_1 = __importDefault(require("got"));
const stream_1 = require("stream");
async function getSegments(url) {
    const segments = [];
    const { origin } = new URL(url);
    const manifest = await (0, main_1.fetchM3U8)(url, origin);
    if (manifest.playlists?.length > 0) {
        segments.push(...(await (0, main_1.fetchPlayLists)(manifest.playlists, origin)).flat());
    }
    if (manifest.segments?.length > 0) {
        segments.push({
            segments: manifest.segments,
            base: origin
        });
    }
    return segments;
}
async function tryGetKeyframeFromSegment(segement, base) {
    try {
        const url = new URL(segement.uri, base).toString();
        console.log('try to get segement from: ' + url);
        const stream = (0, beamcoder_1.demuxerStream)({ highwaterMark: 65536 });
        const resp = await (0, got_1.default)(url, { headers: { referer: base }, responseType: 'buffer' });
        //const gotStream = got.stream(url, { headers: { referer: base } })
        resp.on('downloadProgress', (progress) => { console.log(progress); });
        await (0, promises_1.pipeline)(stream_1.Readable.from(resp.body), stream);
        console.log('read complete: ' + url);
        const demuxer = await stream.demuxer({});
        await demuxer.seek({ time: 0 });
        let packet = await demuxer.read(); // Find the next video packet (assumes stream 0)
        for (; packet.stream_index !== 0; packet = await demuxer.read())
            ;
        const decoder = (0, beamcoder_1.decoder)({ demuxer, stream_index: 0 });
        let decResult = await decoder.decode(packet); // Decode the frame
        if (decResult.frames.length === 0) // Frame may be buffered, so flush it out
            decResult = await decoder.flush();
        const encoder = (0, beamcoder_1.encoder)({
            name: 'mjpeg',
            width: decoder.width,
            height: decoder.height,
            pix_fmt: decoder.pix_fmt.indexOf('422') >= 0 ? 'yuvj422p' : 'yuvj420p',
            time_base: [1, 1]
        });
        const jpegResult = await encoder.encode(decResult.frames[0]); // Encode the frame
        await encoder.flush(); // Tidy the encoder
        const jpeg = jpegResult.packets[0].data;
        return jpeg;
    }
    catch (e) {
        console.error(e);
    }
}
async function getKeyframeByRoomId(opt) {
    const { url, options } = (0, bilibili_api_1.getPlayUrl)(opt);
    const { data: respData } = JSON.parse((await (0, got_1.default)(url, { headers: { ...options.headers } })).body);
    const streamUrls = respData.durl.map(item => item.url);
    for (const streamUrl of streamUrls) {
        const segmentsWithReferer = await getSegments(streamUrl);
        if (segmentsWithReferer.length == 0)
            continue;
        for (const { segments, base } of segmentsWithReferer) {
            for (const segment of segments) {
                const result = await tryGetKeyframeFromSegment(segment, base);
                if (result) {
                    return result;
                }
            }
        }
    }
    console.warn('所有源都获取失败');
}
exports.getKeyframeByRoomId = getKeyframeByRoomId;
