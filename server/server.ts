import express, { Request, Response } from 'express';
import multer from 'multer';
import cors from 'cors';
import { parseMIDIToXML } from '../index';

const app = express();
const upload = multer({ dest: 'uploads/midis' });

// 启用 CORS
app.use(cors());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, This is MIDI TO XML!');
});

// MIDI 转换接口
app.post('/parseMIDIToXML', upload.single('midiFile'),
    (async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: '未上传文件' });
            }

            const xmlPath = `generated/xmls/${req.file.filename}.xml`;
            const xml = await parseMIDIToXML(req.file.path, xmlPath);

            // 返回转换后的 XML 文件s
            res.status(200).json({
                message: '转换成功',
                xmlPath: xmlPath,
                xml: xml
            });
        } catch (error) {
            res.status(500).json({ error: '转换失败：' + error.message });
        }
    }) as express.RequestHandler
);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});