import * as fs from "fs";
import { parseMidiFile } from "jasmid.ts";
import { toMusicXML } from "./parser/parse.js";

function writeXML(xml: string, xmlPathWithFileName: string) {
   return new Promise((resolve, reject) =>
      fs.writeFile(xmlPathWithFileName, xml, (err) => {
         if (err) {
            reject(err);
            return;
         }

         resolve("Parse midi to xml successfully");
      })
   );
}

/**
 * 解析 MIDI 文件并生成 MusicXML 文件
 * @param midiPath MIDI 文件路径
 * @param xmlPath 可选，输出的 XML 文件路径，未指定时自动替换扩展名
 * @param title
 * @param jsonsPath
 * @returns Promise的结果是xml字符串
 */
export async function parseMIDIToXML(
   midiPath: string,
   xmlPath?: string | undefined,
   title?: string | undefined,
   jsonsPath?: string | undefined
): Promise<string>;

/**
 * 解析ArrayBufferLike并生成 MusicXML 文件
 * @param midiFile 浏览器 File 对象
 * @param xmlPath 输出的 XML 文件路径（含文件名）
 * @param title
 * @param jsonsPath
 * @returns Promise的结果是xml字符串
 */
export async function parseMIDIToXML(
   midiFile: ArrayBufferLike,
   xmlPath?: string | undefined,
   title?: string | undefined,
   jsonsPath?: string | undefined
): Promise<string>;

/**
 * parseMIDIToXML 函数实现，兼容两种重载
 */
export async function parseMIDIToXML(
   midi: string | ArrayBufferLike,
   xmlPath?: string | undefined,
   title?: string | undefined,
   jsonsPath?: string | undefined
): Promise<string> {
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
      } else {
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
   } catch (error) {
      return Promise.reject("Failed to parse MIDI file: " + error);
   }
}
