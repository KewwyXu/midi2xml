/**
 * 解析 MIDI 文件并生成 MusicXML 文件
 * @param midiPath MIDI 文件路径
 * @param xmlPath 可选，输出的 XML 文件路径，未指定时自动替换扩展名
 * @returns Promise，解析和写入完成后 resolve
 */
export declare function parseMIDIToXML(midiPath: string, xmlPath?: string): Promise<any>;
/**
 * 解析浏览器 File 对象的 MIDI 文件并生成 MusicXML 文件
 * @param midiFile 浏览器 File 对象
 * @param xmlPathWithFileName 输出的 XML 文件路径（含文件名）
 * @returns Promise，解析和写入完成后 resolve
 */
export declare function parseMIDIToXML(midiFile: File, xmlPathWithFileName: string): Promise<any>;
