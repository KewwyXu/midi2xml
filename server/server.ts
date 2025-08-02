import express, { Request, Response } from "express";
import multer from "multer";
import cors from "cors";
import { parseMIDIToXML } from "../index";
import path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "url";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const app = express();

// 启用 CORS
app.use(cors());

app.get("/", (req: Request, res: Response) => {
   res.send("Hello, This is MIDI TO XML!");
});

const midisDir = path.join(__dirname, "..", "uploads", "midis");
const xmlsDir = path.join(__dirname, "..", "generated", "xmls");
const jsonsDir = path.join(__dirname, "..", "generated", "jsons");

const saveFile = false;

if (saveFile) {
   if (!fs.existsSync(midisDir)) {
      fs.mkdirSync(midisDir, { recursive: true });
   }

   if (!fs.existsSync(xmlsDir)) {
      fs.mkdirSync(xmlsDir, { recursive: true });
   }

   if (!fs.existsSync(jsonsDir)) {
      fs.mkdirSync(jsonsDir, { recursive: true });
   }

   // 配置 multer 磁盘存储
   const storage = multer.diskStorage({
      destination: midisDir,
      filename: (req, file, cb) => {
         // 使用原始文件名，并添加时间戳避免重名
         const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
         cb(null, `${path.parse(file.originalname).name}-${uniqueSuffix}${path.parse(file.originalname).ext}`);
      },
   });

   const upload = multer({ storage: storage });

   // MIDI 转换接口
   app.post("/parseMIDIToXML", upload.single("midiFile"), (async (req, res) => {
      try {
         if (!req.file) {
            return res.status(400).json({ error: "未上传文件" });
         }

         const xmlPath = path.join(xmlsDir, `${req.file.filename.replace(new RegExp(".midi?"), "")}.xml`);
         const jsonPath = path.join(jsonsDir, `${req.file.filename.replace(new RegExp(".midi?"), "")}.json`);
         const xml = await parseMIDIToXML(
            req.file.path,
            xmlPath,
            req.file.originalname.replace(new RegExp(".midi?"), ""),
            jsonPath
         );

         // 返回转换后的 XML 文件
         res.status(200).json({
            message: "转换成功",
            xmlPath: xmlPath,
            xml: xml,
         });
      } catch (error) {
         res.status(500).json({ error: "转换失败：" + error.message });
      }
   }) as express.RequestHandler);
} else {
   // 配置 multer 内存存储
   const storage = multer.memoryStorage();
   const upload = multer({ storage: storage });

   // MIDI 转换接口
   app.post("/parseMIDIToXML", upload.single("midiFile"), (async (req, res) => {
      try {
         if (!req.file) {
            return res.status(400).json({ error: "未上传文件" });
         }

         const xml = await parseMIDIToXML(
            req.file.buffer.buffer,
            undefined,
            req.file.originalname.replace(new RegExp(".midi?"), "")
         );
         res.status(200).json({
            message: "转换成功",
            xml: xml,
         });
      } catch (error) {
         res.status(500).json({ error: "转换失败：" + error.message });
      }
   }) as express.RequestHandler);
}

const PORT = 3000;
app.listen(PORT, () => {
   console.log(`服务器运行在 http://localhost:${PORT}`);
});
