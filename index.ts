/* eslint-disable */

import * as fs from "fs";
import pkg from "text-encoding";
import { MidiEvent, parseMidiFile } from "jasmid.ts";
import XMLWriter from "xml-writer";
import { getInstrumentName } from "./midi-instruments";
import { NoteNumberToName } from "./midi-note-converter";

enum Sign {
  G = "G",
  F = "F",
  C = "C",
  percussion = "percussion",
  TAB = "TAB",
  jianpu = "jianpu",
}

enum NoteType {
  maxima = "maxima",
  longa = "longa",
  breve = "breve",
  _1 = "whole",
  _2 = "half",
  _4 = "quarter",
  _8 = "eighth",
  _16 = "16th",
  _32 = "32nd",
  _64 = "64th",
  _128 = "128th",
  _256 = "256th",
  _512 = "512th",
  _1024 = "1024th",
}

type MIDI = {
  header: {
    formatType: number;
    trackCount: number;
    ticksPerBeat: number;
  };
  tracks: MidiEvent[][];
};

const { TextDecoder } = pkg;

(global as any).TextDecoder = TextDecoder;

function writeNote(note: MidiEvent, writer: XMLWriter, duration: number): void {
  const noteDescription = NoteNumberToName((note as any).note);

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
}

function writeTrack(
  track: MidiEvent[],
  writer: XMLWriter,
  divisions: number,
  timeSignature,
  metronome,
  sign = Sign.G,
): void {
  let measureNumber = 0;
  let measureDivisions = 0;
  let hasInitSharedElements = false;
  let currentNote: MidiEvent | null;
  let measureOpen = false;
  //每小节的ticks
  const beatDivisions = divisions * timeSignature.numerator;

  track.forEach((event, index) => {
    if (["noteOn", "noteOff", "controller"].indexOf(event.subType ?? "") < 0) {
      return;
    }

    if (!measureOpen && measureDivisions == 0) {
      measureNumber += 1;
      measureOpen = true;
      writer.startElement("measure").writeAttribute("number", measureNumber);
    }

    if (!hasInitSharedElements) {
      writer.startElement("attributes");
      writer.writeElement("divisions", divisions);
      writer.startElement("time");
      writer.writeElement("beats", timeSignature.numerator);
      writer.writeElement("beat-type", timeSignature.denominator);
      writer.endElement(); // </time>
      // writer.startElement("key");
      // writer.writeElement("fifths", -3);
      // writer.writeElement("mode", "minor");
      // writer.endElement(); // </key>
      writer.startElement("clef");
      writer.writeElement("sign", sign);
      writer.writeElement("line", sign === Sign.G ? 2 : 4);
      writer.endElement(); // </clef>
      writer.endElement(); // </attributes>

      writer.startElement("direction");
      writer.startElement("direction-type");
      writer.startElement("metronome").writeAttribute("placement", "above");
      writer.writeElement("beat-unit", metronome.beatUnit);
      writer.writeElement("per-minute", metronome.perMinute);
      writer.endElement(); // </metronome>
      writer.endElement(); // </direction-type>
      writer.endElement(); // </direction>

      hasInitSharedElements = true;
    }

    if (event.subType === "noteOn") {
      currentNote = event;
      currentNote.deltaTime = 0;
    }

    if (event.subType === "noteOff") {
      if (event.deltaTime <= 0) {
        return;
      }

      if (currentNote == null) {
        throw new Error("Invalid Note");
      }

      currentNote.deltaTime += event.deltaTime;

      const diff = measureDivisions + currentNote.deltaTime - beatDivisions;

      if (diff < 0) {
        writeNote(currentNote, writer, currentNote.deltaTime);
        measureDivisions += currentNote.deltaTime;
      } else if (diff == 0) {
        // 如果当前小节的持续时间刚好等于一个小节，则直接写入当前note
        writeNote(currentNote, writer, currentNote.deltaTime);
        measureDivisions = 0;
        measureOpen = false;
        writer.endElement(); // </measure>
      } else {
        // 如果当前小节的持续时间超过了一个小节，则需要结束当前小节并开始新的小节并分割当前note到后面的小节
        writeNote(
          currentNote,
          writer,
          beatDivisions - measureDivisions, //补差到刚好整个小节
        );
        measureDivisions = 0;
        measureOpen = false;
        writer.endElement(); // </measure>

        for (let i = 0; i < Math.floor(diff / beatDivisions); i++) {
          writer
            .startElement("measure")
            .writeAttribute("number", measureNumber);
          writeNote(currentNote, writer, beatDivisions);
          writer.endElement(); // </measure>
          measureOpen = false;
          measureNumber += 1;
        }

        measureDivisions = diff % beatDivisions;

        if (measureDivisions > 0) {
          writer
            .startElement("measure")
            .writeAttribute("number", measureNumber);
          writeNote(currentNote, writer, measureDivisions);
          measureOpen = true;
          measureNumber += 1;
        }
      }

      currentNote = null;
    }

    if (event.subType === "controller") {
      if (currentNote != null) {
        currentNote.deltaTime += event.deltaTime;
      }
    }
  });
}

function toMusicXML(midi: MIDI, title = "Generated"): string {
  const { header, tracks } = midi;
  const ticksPerBeat = header.ticksPerBeat;

  const instrumentIdsByChannel: { [channelNumber: number]: number } = {};

  for (let channel = 0; channel < 16; channel++) {
    instrumentIdsByChannel[channel] = 1; // default to instrument 1
  }

  const timeSignature = {
    numerator: 4,
    denominator: 4,
  };

  const metronome = {
    beatUnit: "quarter",
    perMinute: 0,
  };

  tracks.forEach((track) => {
    track.forEach((event) => {
      const channel: number = (event as any).channel;

      if (event.subType === "programChange") {
        instrumentIdsByChannel[channel] = event.program;
      }

      if (event.type === "meta") {
        if (event.subType === "timeSignature") {
          timeSignature.numerator = event.numerator;
          timeSignature.denominator = event.denominator;
          metronome.beatUnit = NoteType[`_${event.denominator}`].toString();
        } else if (event.subType === "setTempo") {
          metronome.perMinute = Math.round(
            60000000 / event.microsecondsPerBeat,
          );
        }
      }
    });
  });

  const now = new Date();
  const year = now.getFullYear();

  let month: string = (now.getMonth() + 1).toString();
  if (month.length === 1) {
    month = "0" + month;
  }

  let date: string = now.getDate().toString();
  if (date.length === 1) {
    date = "0" + date;
  }

  const writer: XMLWriter = new XMLWriter("  ");
  writer.startDocument("1.0", "UTF-8", false);
  writer.writeDocType(
    "score-partwise",
    "-//Recordare//DTD MusicXML 4.0 Partwise//EN",
    "https://github.com/w3c/musicxml/blob/v4.0/schema/partwise.dtd",
  );
  writer.startElement("score-partwise").writeAttribute("version", "4.0");
  writer.startElement("work");
  writer.writeElement("work-title", title);
  writer.endElement(); // </work>
  writer.startElement("identification");
  writer.startElement("encoding");
  writer.writeElement("encoding-date", [year, month, date].join("-"));
  writer.endElement(); // </encoding>
  writer.endElement(); // </identification>
  writer.startElement("part-list");

  tracks.forEach((track, trackNumber) => {
    const partId = `P${trackNumber}`;
    const instrumentId = 0;
    const instrumentName = getInstrumentName({ instrumentId });
    const instrumentIdString = `${partId}-I1`;

    writer.startElement("score-part").writeAttribute("id", partId);
    writer.startElement("part-name").text(instrumentName).endElement();
    writer
      .startElement("score-instrument")
      .writeAttribute("id", instrumentIdString);
    writer.writeElement("instrument-name", instrumentName);
    writer.endElement(); // </score-instrument>
    writer
      .startElement("midi-instrument")
      .writeAttribute("id", instrumentIdString);
    writer.endElement(); // </midi-instrument>
    writer.endElement(); // </score-part>
  });

  writer.endElement(); // </part-list>

  tracks.forEach((track, trackNumber) => {
    writer.startElement("part").writeAttribute("id", `P${trackNumber}`);
    writeTrack(
      track,
      writer,
      ticksPerBeat,
      timeSignature,
      metronome,
      trackNumber > 0 ? Sign.F : Sign.G,
    );
    writer.endElement();
    writer.endElement(); // </part>
  });

  writer.endElement(); // </score-partwise>
  writer.endDocument();

  return writer.toString();
}

function writeXML(xml: string, xmlPathWithFileName: string) {
  return new Promise((resolve, reject) =>
    fs.writeFile(xmlPathWithFileName, xml, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve("Parse midi to xml successfully");
    }),
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
  jsonsPath?: string,
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
  jsonsPath?: string,
): Promise<string>;

/**
 * parseMIDIToXML 函数实现，兼容两种重载
 */
export async function parseMIDIToXML(
  midi: string | File,
  xmlPath?: string,
  title?: string,
  jsonsPath?: string,
): Promise<string> {
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
}
