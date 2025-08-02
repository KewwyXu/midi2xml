/* eslint-disable */

import pkg from "text-encoding";
import XMLWriter from "xml-writer";
import {getInstrumentName} from "./midi-instruments";
import {extractDetailsFromMIDI, groupNotesByTimePeriod} from "./utils";
import {KeySignature, MIDI, Note, Sign, TimePeriod, TimeSignature, XMLNote} from "./types";
import _ from "lodash";

const { TextDecoder } = pkg;

(global as any).TextDecoder = TextDecoder;

export function writeNote(note: XMLNote, writer: XMLWriter): void {
   writer.startElement("note");

   if (_.isEmpty(note.pitches)) {
      writer.writeElement("rest", "");
   } else {
      note.pitches.forEach((pitch) => {
         writer.startElement("pitch");
         writer.writeElement("step", pitch.step);
         writer.writeElement("octave", pitch.octave);
         if (pitch.alter) {
            writer.writeElement("alter", pitch.alter);
         }
         writer.endElement(); // </pitch>
      });
   }

   writer.writeElement("duration", note.duration);
   writer.endElement(); // </note>
}

function InitSharedElements(
   writer: XMLWriter,
   divisions: number,
   timeSignature: TimeSignature,
   keySignature: KeySignature | undefined,
   metronome,
   sign = Sign.G
) {
   writer.startElement("attributes");
   writer.writeElement("divisions", divisions);
   writer.startElement("time");
   writer.writeElement("beats", timeSignature.numerator);
   writer.writeElement("beat-type", timeSignature.denominator);
   writer.endElement(); // </time>

   if (keySignature) {
      writer.startElement("key");
      writer.writeElement("fifths", keySignature.fifths);
      writer.writeElement("mode", keySignature.mode);
      writer.endElement(); // </key>
   }

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
}

function writeTrack(
   trackNotes: Note[],
   writer: XMLWriter,
   divisions: number,
   timeSignature: TimeSignature,
   keySignature: KeySignature | undefined,
   metronome,
   sign = Sign.G
): void {
   //每小节的ticks
   const measureTicks = divisions * timeSignature.numerator;

   let xmlNotes = groupNotesByTimePeriod(trackNotes);
   let hasInitSharedElements = false;
   let currentTick = 0; //第一小节从0 tick开始， 而不是第一个音符的起始时间
   let measureNumber = 0;
   let measureOpen = false;
   let index = 0;

   while (index < xmlNotes.size) {
      if (!measureOpen) {
         measureNumber++;
         writer.startElement("measure").writeAttribute("number", measureNumber);
         measureOpen = true;
      }

      if (!hasInitSharedElements) {
         InitSharedElements(writer, divisions, timeSignature, keySignature, metronome, sign);
         hasInitSharedElements = true;
      }

      const { timePeriod, xmlNote } = xmlNotes.get(index)!;
      const measureEndTick = measureTicks * measureNumber;

      if (currentTick == timePeriod.startTick) {
         const diff = timePeriod.endTick - measureEndTick;

         if (diff <= 0) {
            writeNote(xmlNote, writer);
            index++;
         } else {
            const splitNote1 = {
               ...xmlNote,
               duration: measureEndTick - timePeriod.startTick,
            } as XMLNote;
            const splitNote2 = {
               ...xmlNote,
               duration: diff,
            } as XMLNote;

            writeNote(splitNote1, writer);

            const nextTimePeriod: TimePeriod = {
               startTick: measureEndTick,
               endTick: timePeriod.endTick,
            };

            xmlNotes = xmlNotes.set(index, {
               xmlNote: splitNote2,
               timePeriod: nextTimePeriod,
            });
         }

         currentTick = Math.min(measureEndTick, timePeriod.endTick);
      } else {
         throw new Error("Invalid Note");
      }

      if (currentTick == measureEndTick) {
         writer.endElement(); // </measure>
         measureOpen = false;
      }
   }

   if (measureOpen) {
      writer.endElement(); // </measure>
      measureOpen = false;
   }
}

export function toMusicXML(midi: MIDI, title = "Generated"): string {
   const { instrumentIdsByChannel, timeSignature, metronome, keySignature, trackNotes, ticksPerBeat } =
      extractDetailsFromMIDI(midi);

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
      "https://github.com/w3c/musicxml/blob/v4.0/schema/partwise.dtd"
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

   trackNotes.forEach((trackNote, trackNumber) => {
      const partId = `P${trackNumber}`;
      const instrumentId = instrumentIdsByChannel[trackNumber];
      const instrumentName = getInstrumentName({ instrumentId });
      const instrumentIdString = `${partId}-I1`;

      writer.startElement("score-part").writeAttribute("id", partId);
      writer.startElement("part-name").text(instrumentName).endElement();
      writer.startElement("score-instrument").writeAttribute("id", instrumentIdString);
      writer.writeElement("instrument-name", instrumentName);
      writer.endElement(); // </score-instrument>
      writer.startElement("midi-instrument").writeAttribute("id", instrumentIdString);
      writer.endElement(); // </midi-instrument>
      writer.endElement(); // </score-part>
   });

   writer.endElement(); // </part-list>

   trackNotes.forEach((trackNote, trackNumber) => {
      writer.startElement("part").writeAttribute("id", `P${trackNumber}`);
      writeTrack(
         trackNotes[trackNumber],
         writer,
         ticksPerBeat,
         timeSignature,
         keySignature,
         metronome,
         trackNumber > 0 ? Sign.F : Sign.G
      );
      writer.endElement(); // </part>
   });

   writer.endElement(); // </score-partwise>
   writer.endDocument();

   return writer.toString();
}
