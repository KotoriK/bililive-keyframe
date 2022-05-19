"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSegements = exports.fetchPlayLists = exports.fetchM3U8 = exports.parseM3u8 = void 0;
const got_1 = __importDefault(require("got"));
const m3u8_parser_1 = require("m3u8-parser");
function parseM3u8(body) {
    const parser = new m3u8_parser_1.Parser();
    parser.push(body);
    parser.end();
    return parser.manifest;
}
exports.parseM3u8 = parseM3u8;
async function fetchM3U8(url, referer) {
    const resp = await (0, got_1.default)(url, { headers: { referer: referer || url } });
    const txt = resp.body;
    return parseM3u8(txt);
}
exports.fetchM3U8 = fetchM3U8;
function fetchPlayLists(playlists, referer) {
    return Promise.all(playlists.map(async (playlist) => ({
        segments: (await fetchM3U8(playlist.uri, referer)).segments,
        base: new URL(playlist.uri).origin
    })));
}
exports.fetchPlayLists = fetchPlayLists;
function parseSegements(segements, basePath) {
    return segements.map(({ uri, ...others }) => ({
        uri: uri.startsWith('http') ? uri : new URL(uri, basePath).toString(),
        ...others
    }));
}
exports.parseSegements = parseSegements;
