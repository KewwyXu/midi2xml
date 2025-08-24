import * as fs from "fs";
import { parseMidiFile } from "jasmid.ts";
import { toMusicXML } from "./parser/parse";
function writeXML(xml, xmlPathWithFileName) {
    return new Promise((resolve, reject) => fs.writeFile(xmlPathWithFileName, xml, (err) => {
        if (err) {
            reject(err);
            return;
        }
        resolve("Parse midi to xml successfully");
    }));
}
/**
 * parseMIDIToXML 函数实现，兼容两种重载
 */
export async function parseMIDIToXML(midi, xmlPath, title, jsonsPath) {
    try {
        if (typeof midi === "string") {
            // 处理文件路径
            if (!fs.existsSync(midi)) {
                throw new Error(`MIDI not found at ${midi}`);
            }
            const midiData = parseMidiFile(fs.readFileSync(midi).buffer);
            if (jsonsPath) {
                fs.writeFile(jsonsPath, JSON.stringify(midiData), (err) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log("Parse midi to xml successfully");
                });
            }
            const xml = toMusicXML(midiData, title);
            if (xmlPath) {
                let xmlPathWithFileName = xmlPath;
                if (xmlPathWithFileName == null) {
                    xmlPathWithFileName = midi.replace(/\.mid$/, ".xml");
                }
                writeXML(xml, xmlPathWithFileName);
            }
            return xml;
        }
        else {
            // 处理 ArrayBufferLike
            if (!midi) {
                throw new Error(`MIDI file is null or undefined`);
            }
            const midiData = parseMidiFile(midi);
            if (jsonsPath) {
                fs.writeFile(jsonsPath, JSON.stringify(midiData), (err) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    console.log("Parse midi to xml successfully");
                });
            }
            const xml = toMusicXML(midiData, title);
            if (xmlPath) {
                writeXML(xml, xmlPath);
            }
            return xml;
        }
    }
    catch (error) {
        return Promise.reject("Failed to parse MIDI file: " + error);
    }
}
//# sourceMappingURL=index.js.map