import { createStream } from "../stream/manage.js";

const apiVar = {
    allowed: {
        vCodec: ["h264", "av1", "vp9"],
        vQuality: ["max", "4320", "2160", "1440", "1080", "720", "480", "360", "240", "144"],
        aFormat: ["best", "mp3", "ogg", "wav", "opus"],
        filenamePattern: ["classic", "pretty", "basic", "nerdy"]
    },
    booleanOnly: ["isAudioOnly", "isNoTTWatermark", "isTTFullAudio", "isAudioMuted", "dubLang", "vimeoDash", "disableMetadata"]
}
const forbiddenChars = ['}', '{', '(', ')', '\\', '%', '>', '<', '^', '*', '!', '~', ';', ':', ',', '`', '[', ']', '#', '$', '"', "'", "@", '=='];
const forbiddenCharsString = ['}', '{', '%', '>', '<', '^', ';', '`', '$', '"', "@", '='];

export function apiJSON(type, obj) {
    try {
        switch (type) {
            case 0:
                return { status: 400, body: { status: "error", text: obj.t } };
            case 1:
                return { status: 200, body: { status: "redirect", url: obj.u } };
            case 2:
                return { status: 200, body: { status: "stream", url: createStream(obj) } };
            case 3:
                return { status: 200, body: { status: "success", text: obj.t } };
            case 4:
                return { status: 429, body: { status: "rate-limit", text: obj.t } };
            case 5:
                let pickerType = "various", audio = false
                switch (obj.service) {
                    case "douyin":
                    case "tiktok":
                        audio = obj.u
                        pickerType = "images"
                        break;
                }
                return { status: 200, body: { status: "picker", pickerType: pickerType, picker: obj.picker, audio: audio } };
            default:
                return { status: 400, body: { status: "error", text: "Bad Request" } };
        }
    } catch (e) {
        return { status: 500, body: { status: "error", text: "Internal Server Error" } };
    }
}
export function metadataManager(obj) {
    let keys = Object.keys(obj);
    let tags = ["album", "composer", "genre", "copyright", "encoded_by", "title", "language", "artist", "album_artist", "performer", "disc", "publisher", "track", "encoder", "compilation", "date", "creation_time", "comment"]
    let commands = []

    for (let i in keys) { if (tags.includes(keys[i])) commands.push('-metadata', `${keys[i]}=${obj[keys[i]]}`) }
    return commands;
}
export function cleanURL(url, host) {
    switch (host) {
        case "vk":
            url = url.includes('clip') ? url.split('&')[0] : url.split('?')[0];
            break;
        case "youtube":
            url = url.split('&')[0];
            break;
        case "tiktok":
            url = url.replace(/@([a-zA-Z]+(\.[a-zA-Z]+)+)/, "@a")
        case "pinterest":
            url = url.replace(/:\/\/(?:www.)pinterest(?:\.[a-z.]+)/, "://pinterest.com")
        default:
            url = url.split('?')[0];
            if (url.substring(url.length - 1) === "/") url = url.substring(0, url.length - 1);
            break;
    }
    for (let i in forbiddenChars) {
        url = url.replaceAll(forbiddenChars[i], '')
    }
    url = url.replace('https//', 'https://')
    return url.slice(0, 128)
}
export function cleanString(string) {
    for (let i in forbiddenCharsString) {
        string = string.replaceAll("/", "_").replaceAll(forbiddenCharsString[i], '')
    }
    return string;
}
export function verifyLanguageCode(code) {
    return RegExp(/[a-z]{2}/).test(String(code.slice(0, 2).toLowerCase())) ? String(code.slice(0, 2).toLowerCase()) : "en"
}
export function languageCode(req) {
    return req.header('Accept-Language') ? verifyLanguageCode(req.header('Accept-Language')) : "en"
}
export function unicodeDecode(str) {
    return str.replace(/\\u[\dA-F]{4}/gi, (unicode) => {
        return String.fromCharCode(parseInt(unicode.replace(/\\u/g, ""), 16));
    });
}
export function checkJSONPost(obj) {
    let def = {
        vCodec: "h264",
        vQuality: "720",
        aFormat: "mp3",
        filenamePattern: "classic",
        isAudioOnly: false,
        isNoTTWatermark: false,
        isTTFullAudio: false,
        isAudioMuted: false,
        disableMetadata: false,
        dubLang: false,
        vimeoDash: false
    }
    try {
        let objKeys = Object.keys(obj);
        let defKeys = Object.keys(def);
        if (objKeys.length > defKeys.length + 1 || !obj.url) return false;

        for (let i in objKeys) {
            if (String(objKeys[i]) !== "url" && defKeys.includes(objKeys[i])) {
                if (apiVar.booleanOnly.includes(objKeys[i])) {
                    def[objKeys[i]] = obj[objKeys[i]] ? true : false;
                } else {
                    if (apiVar.allowed[objKeys[i]] && apiVar.allowed[objKeys[i]].includes(obj[objKeys[i]])) def[objKeys[i]] = String(obj[objKeys[i]])
                }
            }
        }

        if (def.dubLang) def.dubLang = verifyLanguageCode(obj.dubLang);

        obj["url"] = decodeURIComponent(String(obj["url"]));
        let hostname = obj["url"].replace("https://", "").replace(' ', '').split('&')[0].split("/")[0].split("."),
            host = hostname[hostname.length - 2];
        def["url"] = encodeURIComponent(cleanURL(obj["url"], host));

        return def
    } catch (e) {
        return false
    }
}
export function getIP(req) {
    return req.header('cf-connecting-ip') ? req.header('cf-connecting-ip') : req.ip;
}
export function getThreads() {
    try {
        if (process.env.ffmpegThreads && process.env.ffmpegThreads.length <= 3
            && (Number(process.env.ffmpegThreads) >= 0 && Number(process.env.ffmpegThreads) <= 256)) {
            return process.env.ffmpegThreads
        } else {
            return '0'
        }
    } catch (e) {
        return '0'
    }
}
export function cleanHTML(html) {
    let clean = html.replace(/ {4}/g, '');
    clean = clean.replace(/\n/g, '');
    return clean
}
