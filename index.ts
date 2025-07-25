import * as fs from "fs";
import { parseMidiFile } from "jasmid.ts";
import { toMusicXML } from "./parser/parse";

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
   xmlPath?: string,
   title?: string,
   jsonsPath?: string
): Promise<string>;

/**
 * 解析浏览器 File 对象的 MIDI 文件并生成 MusicXML 文件
 * @param midiFile 浏览器 File 对象
 * @param xmlPathWithFileName 输出的 XML 文件路径（含文件名）
 * @param title
 * @param jsonsPath
 * @returns Promise的结果是xml字符串
 */
export async function parseMIDIToXML(
   midiFile: File,
   xmlPathWithFileName: string,
   title?: string,
   jsonsPath?: string
): Promise<string>;

/**
 * parseMIDIToXML 函数实现，兼容两种重载
 */
export async function parseMIDIToXML(
   midi: string | File,
   xmlPath?: string,
   title?: string,
   jsonsPath?: string
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
         let xmlPathWithFileName = xmlPath;
         if (xmlPathWithFileName == null) {
            xmlPathWithFileName = midi.replace(/\.mid$/, ".xml");
         }
         writeXML(xml, xmlPathWithFileName);
         return xml;
      } else {
         // 处理 File 对象
         if (!midi) {
            throw new Error(`MIDI file is null or undefined`);
         }
         if (!xmlPath || !fs.existsSync(xmlPath)) {
            throw new Error(`xmlPath not found at ${xmlPath}`);
         }

         const midiData = parseMidiFile(await midi.arrayBuffer());

         if (jsonsPath) {
            fs.writeFile(jsonsPath, JSON.stringify(midiData), (err) => {
               if (err) {
                  console.log(err);
                  return;
               }

               console.log("Parse midi to xml successfully");
            });
         }

         const xml = toMusicXML(midiData, title ?? midi.name.split(".").shift());
         writeXML(xml, xmlPath);
         return xml;
      }
   } catch (error) {
      return Promise.reject("Failed to parse MIDI file: " + error);
   }
}
