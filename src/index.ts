import { Segment, SegmentsWithReferer } from "./d";
import { fetchM3U8, fetchPlayLists } from "./main";
import { APIResponse, getPlayUrl, GetPlayUrl_Data, GetPlayUrl_Option } from 'bilibili-api'
import { pipeline } from "stream/promises";
import { demuxerStream, decoder as Decoder, encoder as Encoder } from 'beamcoder'

async function getSegments(url: string) {
    const segments: Array<SegmentsWithReferer> = []
    const { origin } = new URL(url)
    const manifest = await fetchM3U8(url, origin)
    if (manifest.playlists?.length > 0) {
        segments.push(...(await fetchPlayLists(manifest.playlists, origin)).flat())
    }
    if (manifest.segments?.length > 0) {
        segments.push({
            segments: manifest.segments,
            base: origin
        })
    }
    return segments
}
async function tryGetKeyframeFromSegment(segement: Segment, base: string) {
    try {
        const resp = await fetch(new URL(segement.uri, base).toString(), { headers: { referer: base } })
        const stream = demuxerStream({ highwaterMark: 65536 });
        await pipeline(resp.body, stream)
        const demuxer = await stream.demuxer(null)
        let packet = await demuxer.read(); // Find the next video packet (assumes stream 0)
        for (; packet.stream_index !== 0; packet = await demuxer.read());
        const decoder = Decoder({ demuxer, params: null })
        let decResult = await decoder.decode(packet); // Decode the frame
        if (decResult.frames.length === 0) // Frame may be buffered, so flush it out
            decResult = await decoder.flush();
        const encoder = Encoder({ // Create an encoder for JPEG data
            name: 'mjpeg', // FFmpeg does not have an encoder called 'jpeg'
            width: decoder.width,
            height: decoder.height,
            pix_fmt: decoder.pix_fmt.indexOf('422') >= 0 ? 'yuvj422p' : 'yuvj420p',
            time_base: [1, 1]
        });
        const jpegResult = await encoder.encode(decResult.frames[0]); // Encode the frame
        await encoder.flush(); // Tidy the encoder
        const jpeg = jpegResult.packets[0].data
        return jpeg
    } catch (e) {
        console.error(e)
    }
}
export async function getKeyframeByRoomId(opt: GetPlayUrl_Option) {
    const { url, options } = getPlayUrl(opt)
    const { data: respData }: APIResponse<GetPlayUrl_Data> = await (await fetch(url, { headers: { ...options.headers as any } })).json()
    const streamUrls = respData.durl.map(item => item.url)
    for (const streamUrl of streamUrls) {
        const segmentsWithReferer = await getSegments(streamUrl)
        if (segmentsWithReferer.length == 0) continue
        for (const { segments, base } of segmentsWithReferer) {
            for (const segment of segments) {
                const result = tryGetKeyframeFromSegment(segment, base)
                if (result) {
                    return result
                }
            }
        }
    }
    console.warn('所有源都获取失败')
}
getKeyframeByRoomId('https://d1--cn-gotcha103.bilivideo.com/live-bvc/100605/live_50333369_2753084_4000.m3u8?cdn=cn-gotcha03&expires=1635262112&len=0&oi=456067133&pt=h5&qn=400&trid=100317861197d87245dfb62c18f5e27f1b6a&sigparams=cdn,expires,len,oi,pt,qn,trid&sign=e492072bbafbbf11490c37b7d96db73d&ptype=0&src=5&sl=1&sk=2935686d6cb9146c7a6a6a0b4e120e2594e074fa0760377f1a7a2b2fa0ee6443&order=1')