import { fetchM3U8, fetchPlayLists } from "./main";
import { getPlayUrl } from 'bilibili-api';
import { pipeline } from "stream/promises";
import { demuxerStream, decoder as Decoder, encoder as Encoder } from 'beamcoder';
import got from 'got';
import { Readable } from "stream";
async function getSegments(url) {
    const segments = [];
    const { origin } = new URL(url);
    const manifest = await fetchM3U8(url, origin);
    if (manifest.playlists?.length > 0) {
        segments.push(...(await fetchPlayLists(manifest.playlists, origin)).flat());
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
        const stream = demuxerStream({ highwaterMark: 65536 });
        const resp = await got(url, { headers: { referer: base }, responseType: 'buffer' });
        //const gotStream = got.stream(url, { headers: { referer: base } })
        resp.on('downloadProgress', (progress) => { console.log(progress); });
        await pipeline(Readable.from(resp.body), stream);
        console.log('read complete: ' + url);
        const demuxer = await stream.demuxer({});
        await demuxer.seek({ time: 0 });
        let packet = await demuxer.read(); // Find the next video packet (assumes stream 0)
        for (; packet.stream_index !== 0; packet = await demuxer.read())
            ;
        const decoder = Decoder({ demuxer, stream_index: 0 });
        let decResult = await decoder.decode(packet); // Decode the frame
        if (decResult.frames.length === 0) // Frame may be buffered, so flush it out
            decResult = await decoder.flush();
        const encoder = Encoder({
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
export async function getKeyframeByRoomId(opt) {
    const { url, options } = getPlayUrl(opt);
    const { data: respData } = JSON.parse((await got(url, { headers: { ...options.headers } })).body);
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
