import { MidiEvent } from "jasmid.ts";
import { IPitch } from "@thayes/midi-tools/utils/IPitch.js";

export enum Sign {
   G = "G",
   F = "F",
   C = "C",
   percussion = "percussion",
   TAB = "TAB",
   jianpu = "jianpu",
}

export enum NoteType {
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

export enum Mode {
   major = "major",
   minor = "minor",
   dorian = "dorian",
   phrygian = "phrygian",
   lydian = "lydian",
   mixolydian = "mixolydian",
   aeolian = "aeolian",
   locrian = "locrian",
}

export type TimeSignature = {
   numerator: number; // e.g., 4 for 4/4 time
   denominator: number; // e.g., 4 for 4/4 time (quarter note)
};

export type KeySignature = {
   mode: Mode;
   fifths: number; // -7 to 7
};

export type MIDI = {
   header: {
      formatType: number;
      trackCount: number;
      ticksPerBeat: number;
   };
   tracks: MidiEvent[][];
};

export type Note = {
   note: number; //note 60 is middle C (C4)
   duration?: number; // in ticks
   startTick: number; // the tick at which the note starts
   endTick: number; // the tick at which the note ends
   velocity: number; // MIDI velocity (0-127)
   conflictCount: number; // number of notes that conflict with this note
};

export type XMLNote = {
   pitches: IPitch[];
   duration: number; // in ticks
   type?: NoteType; // whole, half, quarter, etc.
   stem?: "up" | "down"; // direction of the stem
   staff?: number; // staff number (1-based)
};

export type TimePeriod = {
   startTick: number; // the tick at which the time period starts
   endTick: number; // the tick at which the time period ends
};

export type TimePeriodXMLNote = {
   xmlNote: XMLNote;
   timePeriod: TimePeriod;
};
