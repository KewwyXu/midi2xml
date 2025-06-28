import {parseMIDIToXML} from "../index";
import 'core-js/stable';

describe('parseMIDIToXML', () => {
    test('success', async () => {
        await expect(parseMIDIToXML('C:\\code\\@kiwi\\midi2xml\\sample-midi\\sample.mid')).resolves.toBe('Parse midi to xml successfully');
    });
    
    test('fail to read midi', async () => {
        const path = 'C:\\code\\@kiwi\\midi2xml\\sample-midi\\sample';
        
        try {
            await parseMIDIToXML(path);
        } catch (error) {
            expect(error.message).toBe(`MIDI not found at ${path}`);
        }
    });

    test('fail to parse midi', async () => {
        await expect(parseMIDIToXML('C:\\code\\@kiwi\\midi2xml\\sample-midi\\sample.mid', '')).rejects.toThrow();
    });
})