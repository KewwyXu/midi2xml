/**
 * 解析 MIDI 文件并生成 MusicXML 文件
 * @param midiPath MIDI 文件路径
 * @param xmlPath 可选，输出的 XML 文件路径，未指定时自动替换扩展名
 * @param title
 * @param jsonsPath
 * @returns Promise的结果是xml字符串
 */
export declare function parseMIDIToXML(midiPath: string, xmlPath?: string | undefined, title?: string | undefined, jsonsPath?: string | undefined): Promise<string>;
/**
 * 解析ArrayBufferLike并生成 MusicXML 文件
 * @param midiFile 浏览器 File 对象
 * @param xmlPath 输出的 XML 文件路径（含文件名）
 * @param title
 * @param jsonsPath
 * @returns Promise的结果是xml字符串
 */
export declare function parseMIDIToXML(midiFile: ArrayBufferLike, xmlPath?: string | undefined, title?: string | undefined, jsonsPath?: string | undefined): Promise<string>;
