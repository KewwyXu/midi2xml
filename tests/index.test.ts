import {parseMIDIToXML} from "../index";
import 'core-js/stable';

describe('parseMIDIToXML from midi path', () => {
    test('success', async () => {
        await expect(parseMIDIToXML('C:\\code\\@kiwi\\midi2xml\\sample-midi\\sample.mid')).resolves.toHaveReturned();
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

describe('parseMIDIToXML from midi file', () => {
    test('success', async () => {
        // 构造一个模拟的 File 对象
        const fs = require('fs');
        const path = require('path');
        const filePath = path.resolve(__dirname, '../sample-midi/sample.mid');
        const buffer = fs.readFileSync(filePath);
        // 使用 TypeScript 的 File 构造器
        const file = new File([buffer], 'sample.mid', { type: 'audio/midi' });
        await expect(parseMIDIToXML(file, path.resolve(__dirname, '../sample-midi/sample.xml'))).resolves.toHaveReturned();
    });

    test('fail to read midi', async () => {
        const file = null;
        const xmlPath = require('path').resolve(__dirname, '../sample-midi/sample.xml');
        try {
            await parseMIDIToXML(file as unknown as File, xmlPath);
        } catch (error) {
            expect(error.message).toBe(`MIDI file is null or undefined`);
        }
    });

    test('fail to parse midi', async () => {
        // 构造一个无效的 File
        const file = new File([new Uint8Array([0, 1, 2, 3])], 'wrongMIDI.mid', { type: 'audio/midi' });
        const xmlPath = require('path').resolve(__dirname, '../sample-midi/sample.xml');
        await expect(parseMIDIToXML(file, xmlPath)).rejects.toThrow();
    });

    test('fail when xmlPath not found', async () => {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.resolve(__dirname, '../sample-midi/sample.mid');
        const buffer = fs.readFileSync(filePath);
        const file = new File([buffer], 'sample.mid', { type: 'audio/midi' });
        // 传递不存在的xmlPath
        const notExistPath = path.resolve(__dirname, '../sample-midi/not-exist-folder/sample.xml');
        try {
            await parseMIDIToXML(file, notExistPath);
        }catch (error) {
            expect(error.message).toBe(`xmlPath not found at ${notExistPath}`);
        }
    });
});
