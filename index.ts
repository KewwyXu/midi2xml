/* eslint-disable */

type NoteItem = { note: number, channel: number, duration: number, instrumentId: number };

import * as fs from "fs";
import pkg from "text-encoding";
const { TextDecoder } = pkg;
import { parseMidiFile } from "jasmid.ts";
import XMLWriter from "xml-writer";
import { NoteNumberToName } from "@thayes/midi-tools";
import { getInstrumentName } from "./midi-instruments";

(global as any).TextDecoder = TextDecoder;

function writeNotes({ notes, writer, divisions, timeSignature }): void {
  let measureNumber = 0;
  notes.forEach(
    ({ note, duration }) => {
      measureNumber += 1;
      const noteDescription = NoteNumberToName(note);

      // <key>
      //   <fifths>-3</fifths>
      //   <mode>minor</mode>
      // </key>

      writer.startElement("measure").writeAttribute("number", measureNumber);
      if (measureNumber === 1) {
        writer.startElement("attributes");
        writer.writeElement("divisions", divisions);
        writer.startElement("time");
        writer.writeElement("beats", timeSignature.numerator);
        writer.writeElement("beat-type", timeSignature.denominator);
        writer.endElement(); // </time>
        writer.startElement("key");
        writer.writeElement("fifths", -3);
        writer.writeElement("mode", "minor");
        writer.endElement(); // </key>
        writer.startElement("clef");
        writer.writeElement("sign", "G");
        writer.writeElement("line", 2);
        writer.endElement(); // </clef>
        writer.endElement(); // </attributes>
      }
      writer.startElement("note");
      writer.startElement("pitch");
      writer.writeElement("step", noteDescription.step);
      writer.writeElement("octave", noteDescription.octave);
      if (noteDescription.alter) {
        writer.writeElement("alter", noteDescription.alter);
      }
      writer.endElement(); // </pitch>
      writer.writeElement("duration", duration);
      writer.endElement(); // </note>
      writer.endElement(); // </measure>
    }
  );
}

function toMusicXML({ header, tracks }) : string {
  const ticksPerBeat = header.ticksPerBeat;

  const notesByTrack: {
    [trackNumber: number]: NoteItem[]
   } = [];

  const currentNotesByTrack: {
    [trackNumber: number]: NoteItem[]
  } = {};

  const instrumentIdsByChannel: { [channelNumber: number]: number } = {};

  for (let channel = 0; channel < 16; channel++) {
    instrumentIdsByChannel[channel] = 1; // default to instrument 1
  }

  let timeSignature = {
    numerator: null,
    denominator: null,
  };

  tracks.forEach(
    (track, trackNumber) => {
      currentNotesByTrack[trackNumber] = [];

      track.forEach(
        (event) => {
          if (event.deltaTime > 0) {
            currentNotesByTrack[trackNumber].forEach(
              (note) => note.duration += event.deltaTime
            );
          }

          const channel = (event as any).channel;

          if (event.subType === "programChange") {
            const program = (event as any).program;
            if (program === 0) {
              console.log("setting program to 0", event);
              
            }
            instrumentIdsByChannel[channel] = program;
          }
    
          if (event.type === "meta") {
            if (event.subType === "timeSignature") {
              timeSignature.numerator = (event as any).numerator;
              timeSignature.denominator = (event as any).denominator;
            }
          }
    
          if (event.subType === "noteOn") {
            currentNotesByTrack[trackNumber].push({
              note: (event as any).note,
              channel,
              duration: 0,
              instrumentId: instrumentIdsByChannel[channel],
            });
          }
          else if (event.subType === "noteOff") {
            const noteIndex = currentNotesByTrack[trackNumber].findIndex(
              ({ note }) => note === (event as any).note
            );
    
            if (noteIndex < 0) {
              // should never happen--means we have a noteOff for a note that has not had a noteOn
              return;
            }

            if (!(trackNumber in notesByTrack)) {
              notesByTrack[trackNumber] = [];
            }
    
            notesByTrack[trackNumber].push({
              note: currentNotesByTrack[trackNumber][noteIndex].note,
              channel: currentNotesByTrack[trackNumber][noteIndex].channel,
              duration: currentNotesByTrack[trackNumber][noteIndex].duration,
              instrumentId: currentNotesByTrack[trackNumber][noteIndex].instrumentId,
            });
    
            currentNotesByTrack[trackNumber].splice(noteIndex, 1);
          }
        }
      );
    }
  );
  
  const now = new Date();
  const year = now.getFullYear();

  let month:string = (now.getMonth() + 1).toString();
  if (month.length === 1) {
    month = "0" + month;
  }

  let date:string = now.getDate().toString();
  if (date.length === 1) {
    date = "0" + date;
  }

  const writer = new XMLWriter("  ");
  writer.startDocument("1.0", "UTF-8", false);
  writer.writeDocType(
    "score-partwise",
    "-//Recordare//DTD MusicXML 3.1 Partwise//EN",
    "http://www.musicxml.org/dtds/partwise.dtd"
  );
  writer.startElement("score-partwise").writeAttribute("version", "3.1");
  writer.startElement("work");
  writer.writeElement("work-title", "Generated Score");
  writer.endElement(); // </work>
  writer.startElement("identification");
  writer.startElement("encoding");
  writer.writeElement("encoding-date", [year, month, date].join("-"));
  writer.endElement(); // </encoding>
  writer.endElement(); // </identification>
  writer.startElement("part-list");

  Object.keys(notesByTrack).forEach(
    (trackNumber) => {
      const partId = `P${trackNumber}`;
      const instrumentId = notesByTrack[trackNumber][0].instrumentId;
      const instrumentName = getInstrumentName({ instrumentId });
      console.log({
        instrumentId,
        instrumentName,
      });
      
      const instrumentIdString = `${partId}-I1`;

      writer.startElement("score-part")
        .writeAttribute("id", partId)
      writer.startElement("part-name").text(instrumentName).endElement();
      writer.startElement("score-instrument").writeAttribute("id", instrumentIdString);
      writer.writeElement("instrument-name", instrumentName);
      writer.endElement(); // </score-instrument>
      writer.startElement("midi-instrument").writeAttribute("id", instrumentIdString);
      writer.endElement(); // </midi-instrument>
      writer.endElement(); // </score-part>
    }
  );

  writer.endElement(); // </part-list>

  Object.keys(notesByTrack).forEach(
    (trackNumber) => {
      const notes = notesByTrack[trackNumber];

      writer.startElement("part").writeAttribute("id", `P${trackNumber}`);
      writeNotes({ notes, writer, divisions: ticksPerBeat, timeSignature });
      writer.endElement(); // </part>
    }
  );

  writer.endElement(); // </score-partwise>
  writer.endDocument();

  return writer.toString();
}

function writeXML(xml: string, xmlPathWithFileName: string) {
    return new Promise(
        (resolve, reject) => fs.writeFile(
            xmlPathWithFileName,
            xml,
            (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve('Parse midi to xml successfully');
            }
        )
    );
}

/**
 * 解析 MIDI 文件并生成 MusicXML 文件
 * @param midiPath MIDI 文件路径
 * @param xmlPath 可选，输出的 XML 文件路径，未指定时自动替换扩展名
 * @returns Promise的结果是xml字符串
 */
export async function parseMIDIToXML(midiPath: string, xmlPath?: string): Promise<string>;

/**
 * 解析浏览器 File 对象的 MIDI 文件并生成 MusicXML 文件
 * @param midiFile 浏览器 File 对象
 * @param xmlPathWithFileName 输出的 XML 文件路径（含文件名）
 * @returns Promise的结果是xml字符串
 */
export async function parseMIDIToXML(midiFile: File, xmlPathWithFileName: string): Promise<string>;

/**
 * parseMIDIToXML 函数实现，兼容两种重载
 */
export async function parseMIDIToXML(
    midi: string | File,
    xmlPath?: string
): Promise<string> {
    if (typeof midi === "string") {
        // 处理文件路径
        if (!fs.existsSync(midi)) {
            throw new Error(`MIDI not found at ${midi}`);
        }
        const midiData = parseMidiFile(fs.readFileSync(midi).buffer);
        const xml = toMusicXML(midiData);
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
        const xml = toMusicXML(midiData);
        writeXML(xml, xmlPath!);
        return xml;
    }
}