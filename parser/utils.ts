import { KeySignature, MIDI, Mode, Note, NoteType, TimePeriodXMLNote, TimeSignature } from "./types";
import { IPitch } from "@thayes/midi-tools/utils/IPitch";
import { List, Map } from "immutable";
import _ from "lodash";

// 定义大调和小调的音阶
const majorScales: { [key: number]: Set<number> } = {};
const minorScales: { [key: number]: Set<number> } = {};

// 生成大调音阶
for (let i = -7; i <= 7; i++) {
   const scale = new Set<number>();
   let rootNote = 60 + ((i * 7) % 12); // 以C4 (MIDI note 60) 为基准
   for (const interval of [0, 2, 4, 5, 7, 9, 11]) {
      scale.add(rootNote + interval);
   }
   majorScales[i] = scale;
}

// 生成小调音阶
for (let i = -7; i <= 7; i++) {
   const scale = new Set<number>();
   let rootNote = 60 + ((i * 7) % 12); // 以C4 (MIDI note 60) 为基准
   for (const interval of [0, 2, 3, 5, 7, 8, 10]) {
      scale.add(rootNote + interval);
   }
   minorScales[i] = scale;
}

export function calculateKeySignature(notes: Set<number>): KeySignature | undefined {
   let bestMatch: KeySignature | undefined = undefined;
   let minDifference: number = Infinity;

   // 检查大调
   for (const [key, scale] of Object.entries(majorScales)) {
      const differenceNotes = Array.from(notes).filter((note) => !scale.has(note));
      if (differenceNotes.length < minDifference) {
         minDifference = differenceNotes.length;
         bestMatch = { mode: Mode.major, fifths: parseInt(key) };
      }
   }

   // 检查小调
   for (const [key, scale] of Object.entries(minorScales)) {
      const differenceNotes = Array.from(notes).filter((note) => !scale.has(note));
      if (differenceNotes.length < minDifference) {
         minDifference = differenceNotes.length;
         bestMatch = { mode: Mode.minor, fifths: parseInt(key) };
      }
   }

   return bestMatch;
}

export function NoteNumberToName(note: number): IPitch {
   let step;
   let alter;
   // eslint-disable-next-line no-magic-numbers
   let octave = Math.floor(note / 12) - 1;

   /* eslint-disable no-fallthrough */
   /* eslint-disable no-magic-numbers */
   switch (note % 12) {
      case 1:
         alter = 1;
      case 0:
         step = "C";
         break;
      case 3:
         alter = 1;
      case 2:
         step = "D";
         break;
      case 4:
         step = "E";
         break;
      case 6:
         alter = 1;
      case 5:
         step = "F";
         break;
      case 8:
         alter = 1;
      case 7:
         step = "G";
         break;
      case 10:
         alter = 1;
      case 9:
         step = "A";
         break;
      case 11:
         step = "B";
         break;
   }
   /* eslint-enable no-magic-numbers */
   /* eslint-enable no-fallthrough */

   const noteObj: IPitch = {
      step,
      octave,
      MIDINumber: note,
   };

   if (alter) {
      noteObj.alter = alter;
   }

   return noteObj;
}

export const groupNotesByTimePeriod = (notes: Note[]): List<TimePeriodXMLNote> => {
   let xmlNotes = List<TimePeriodXMLNote>();

   if (_.isEmpty(notes)) {
      return xmlNotes;
   }

   notes.sort((a, b) => a.startTick - b.startTick);

   const notesMap = Map<number, Note[]>().asMutable();
   for (const note of notes) {
      notesMap.update(note.startTick, (arr) => [note].concat(arr ?? []));
   }

   let startTick = 0;
   let nextStartTick = 0;
   let pitches: IPitch[] = [];

   while (!notesMap.isEmpty()) {
      const startTickNotes = notesMap.get(startTick);
      pitches = startTickNotes?.map((note) => NoteNumberToName(note.note)) ?? [];

      if (!startTickNotes) {
         //add rest note
         nextStartTick = _.min(
            notesMap
               .keySeq()
               .toArray()
               .filter((tick) => tick > startTick)
         )!;
      } else {
         notesMap.remove(startTick);
         nextStartTick = _.min(startTickNotes.map((note) => note.endTick).concat(notesMap.keySeq().toArray()))!;

         const newNotes = startTickNotes
            .filter((note) => note.endTick > nextStartTick)
            .map((x) => {
               return {
                  ...x,
                  startTick: nextStartTick,
               } as Note;
            });

         if (!_.isEmpty(newNotes)) {
            notesMap.update(nextStartTick, (arr) => newNotes.concat(arr ?? []));
         }
      }

      xmlNotes = xmlNotes.push({
         xmlNote: {
            pitches: pitches,
            duration: nextStartTick - startTick,
         },
         timePeriod: {
            startTick: startTick,
            endTick: nextStartTick,
         },
      });
      startTick = nextStartTick;
   }

   return xmlNotes;
};

export const extractDetailsFromMIDI = (midi: MIDI) => {
   const { header, tracks } = midi;
   const ticksPerBeat = header.ticksPerBeat;

   const instrumentIdsByChannel: { [channelNumber: number]: number } = {};

   for (let channel = 0; channel < tracks.length; channel++) {
      instrumentIdsByChannel[channel] = 1; // default to instrument 1
   }

   const timeSignature: TimeSignature = {
      numerator: 4,
      denominator: 4,
   };

   const metronome = {
      beatUnit: NoteType._4,
      perMinute: 0,
   };

   let keySignature: KeySignature | undefined = undefined;
   const trackNotes: Note[][] = [];

   tracks.forEach((track, index) => {
      let endedNotesCount = 0;
      let currentTick = 0;
      trackNotes.push([]);

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
               metronome.perMinute = Math.round(60000000 / event.microsecondsPerBeat);
            } else if (event.subType === "keySignature") {
               keySignature = {
                  mode: event.scale == 0 ? Mode.major : Mode.minor,
                  fifths: event.key,
               };
            }
         }

         currentTick += event.deltaTime;

         if (event.subType === "noteOn") {
            const conflictNote = trackNotes[index].find((note) => note.note === event.note && note.endTick === 0);

            if (conflictNote == null) {
               trackNotes[index].push({
                  note: event.note,
                  startTick: currentTick,
                  endTick: 0,
                  velocity: event.velocity,
                  conflictCount: 0,
               });
            } else {
               //TODO: I don't know why it happens and what it means so I just ignore it for now.
               conflictNote.conflictCount += 1;
            }
         }

         if (event.subType === "noteOff") {
            const endedNote = trackNotes[index].find((note) => note.note === event.note && note.endTick === 0);

            if (endedNote == null) {
               throw new Error("Invalid noteOff Note");
            }

            if (endedNote.conflictCount > 0) {
               endedNote.conflictCount--;
            } else {
               endedNote.endTick = currentTick;
               endedNotesCount++;
            }

            endedNote.duration = endedNote.endTick - endedNote.startTick;
         }
      });

      if (trackNotes[index].length != endedNotesCount) {
         throw new Error(
            `MIDI parsing error: ${trackNotes[index].length} notes started, but ${endedNotesCount} notes ended.`
         );
      }
   });

   keySignature ??= calculateKeySignature(new Set<number>(trackNotes.flatMap((x) => x.map((y) => y.note))));

   return {
      instrumentIdsByChannel,
      timeSignature,
      metronome,
      keySignature,
      trackNotes: trackNotes.map((notes) => notes.sort((a, b) => a.startTick - b.startTick)),
      ticksPerBeat,
   };
};
