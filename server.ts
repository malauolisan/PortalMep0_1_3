import express from "express";
import path from "path";
import fs from "fs";
import axios from "axios";
import Parser from "rss-parser";
import dotenv from "dotenv";

dotenv.config();

const parser = new Parser();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with generous payload limit for base64 optimized images
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ extended: true, limit: "30mb" }));

  // Ensure public/uploads directory exists and serve it statically
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Image Upload Endpoint for rich text editor and media
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { dataUrl, fileName = "imagem", folder = "content" } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: "Campo dataUrl é obrigatório e deve ser uma string válida." });
      }

      const matches = dataUrl.match(/^data:([A-Za-z0-9-+\/.]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Formato de imagem inválido. Deve ser um Data URL base64." });
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      let ext = 'jpg';
      if (mimeType.includes('webp')) ext = 'webp';
      else if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('gif')) ext = 'gif';
      else if (mimeType.includes('svg')) ext = 'svg';

      const cleanName = (fileName || 'imagem')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 35);
      const safeFolder = (folder || 'content').replace(/[^a-zA-Z0-9_-]/g, '');
      const uniqueFileName = `${safeFolder}_${Date.now()}_${cleanName || 'imagem'}.${ext}`;

      const filePath = path.join(uploadsDir, uniqueFileName);
      fs.writeFileSync(filePath, buffer);

      // In production mode, also ensure it is available in dist/uploads if dist exists
      const distUploads = path.join(process.cwd(), 'dist', 'uploads');
      if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
        if (!fs.existsSync(distUploads)) {
          fs.mkdirSync(distUploads, { recursive: true });
        }
        fs.writeFileSync(path.join(distUploads, uniqueFileName), buffer);
      }

      const publicUrl = `/uploads/${uniqueFileName}`;
      res.json({
        success: true,
        url: publicUrl,
        fileName: uniqueFileName,
        size: buffer.length
      });
    } catch (err: any) {
      console.error("[Upload API] Erro ao salvar imagem:", err);
      res.status(500).json({ error: err.message || "Falha ao gravar arquivo de imagem." });
    }
  });

  // General File Upload Endpoint for downloads stored on the portal host
  app.post("/api/upload-file", async (req, res) => {
    try {
      const { dataUrl, fileName = "arquivo" } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: "Campo dataUrl é obrigatório e deve ser uma string válida." });
      }

      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Formato inválido. Deve ser um Data URL base64." });
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      const origExt = path.extname(fileName) || '.bin';
      const baseName = path.basename(fileName, origExt)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50);

      const uniqueFileName = `dl_${Date.now()}_${baseName || 'arquivo'}${origExt}`;
      const downloadsDir = path.join(uploadsDir, 'downloads');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }

      const filePath = path.join(downloadsDir, uniqueFileName);
      fs.writeFileSync(filePath, buffer);

      // In production mode, also ensure it is available in dist/uploads/downloads if dist exists
      const distDownloads = path.join(process.cwd(), 'dist', 'uploads', 'downloads');
      if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
        if (!fs.existsSync(distDownloads)) {
          fs.mkdirSync(distDownloads, { recursive: true });
        }
        fs.writeFileSync(path.join(distDownloads, uniqueFileName), buffer);
      }

      const publicUrl = `/uploads/downloads/${uniqueFileName}`;
      res.json({
        success: true,
        url: publicUrl,
        fileName: fileName,
        storedName: uniqueFileName,
        fileSize: buffer.length,
        fileType: mimeType
      });
    } catch (err: any) {
      console.error("[Upload File API] Erro ao salvar arquivo:", err);
      res.status(500).json({ error: err.message || "Falha ao gravar arquivo." });
    }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const { nome, email, mensagem } = req.body;
      if (!nome || !email || !mensagem) {
        return res.status(400).json({ error: "Todos os campos (nome, email e mensagem) são obrigatórios." });
      }

      const clientOrigin = (req.headers.origin as string) || (req.headers.referer as string) || "https://ais-pre-c33oio7pix2qjgi3xakoum-30620865069.us-east1.run.app";
      const forwardRes = await axios.post("https://formsubmit.co/ajax/mepbrasilnet@gmail.com", {
        name: nome,
        email: email,
        message: mensagem,
        _subject: `Mensagem enviada via Portal MEP - ${nome}`,
        _replyto: email
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Referer': `${clientOrigin}/contato`,
          'Origin': clientOrigin
        },
        timeout: 10000
      });

      return res.json({ 
        success: true, 
        message: forwardRes.data?.message || "Mensagem encaminhada para mepbrasilnet@gmail.com com sucesso." 
      });
    } catch (err: any) {
      console.warn("[Contact API] Erro ao enviar mensagem para mepbrasilnet@gmail.com:", err?.message || err);
      return res.status(500).json({ error: "Falha ao encaminhar a mensagem. Tente novamente ou use o e-mail direto." });
    }
  });

  app.get("/api/youtube", async (req, res) => {
    try {
      // For @mepbrasilnet, we need the channel ID.
      // A common way to find it is to look at the source of the channel page.
      // For now, I'll use a placeholder or try to fetch it if possible.
      // Let's assume the channel ID is UC-mepbrasilnet (this is a guess, I'll try to find the real one)
      // Actually, I'll use the RSS feed if I can find the ID.
      // If not, I'll return the placeholder data but with a note.
      
      const channelId = process.env.YOUTUBE_CHANNEL_ID || "UChchw2cv66MeQZhzG7XKWaA"; // Correct channel ID of @mepbrasilnet
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      
      try {
        const feed = await parser.parseURL(feedUrl);
        const videos = feed.items.slice(0, 3).map(item => ({
          id: item.id,
          videoId: item.id.split(":")[2],
          title: item.title,
          description: item.contentSnippet || item.content || "",
          thumbnail: `https://img.youtube.com/vi/${item.id.split(":")[2]}/maxresdefault.jpg`,
          link: item.link
        }));
        res.json(videos);
      } catch (error) {
        // If RSS fails, return placeholder but with real links pointing to the channel
        res.json([
          {
            id: 'v1',
            videoId: 'v1',
            title: 'MEP - Movimento Espírita Progressista',
            description: 'Conheça o MEP e nossas propostas para um espiritismo plural e democrático.',
            thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=640&q=80',
            link: 'https://www.youtube.com/@mepbrasilnet'
          },
          {
            id: 'v2',
            videoId: 'v2',
            title: 'Espiritismo e Justiça Social',
            description: 'Debate sobre a importância do compromisso social no movimento espírita.',
            thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=640&q=80',
            link: 'https://www.youtube.com/@mepbrasilnet'
          },
          {
            id: 'v3',
            videoId: 'v3',
            title: 'Diálogos Progressistas',
            description: 'Uma série de conversas sobre o futuro do espiritismo no Brasil.',
            thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=640&q=80',
            link: 'https://www.youtube.com/@mepbrasilnet'
          }
        ]);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch YouTube videos" });
    }
  });

interface InstagramPost {
  id: string;
  shortcode: string;
  link: string;
  image: string;
  caption: string;
  timestamp?: number;
  isVideo?: boolean;
}

const DEFAULT_INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: "DdylcOeG7xP",
    shortcode: "DdylcOeG7xP",
    link: "https://www.instagram.com/p/DdylcOeG7xP/",
    image: "/uploads/instagram/DdylcOeG7xP.webp",
    caption: "Agora sim: a programação do II Congresso Ágora Espírita Zenilda Cavalcanti está completa! Nos dias 17 e 18 de outubro de 2026, teremos dois dias de encontros, debates, diversidade de perspectivas e diálogos com a contemporaneidade.",
    timestamp: 1790511259,
    isVideo: false
  },
  {
    id: "DdwF-JpHD8F",
    shortcode: "DdwF-JpHD8F",
    link: "https://www.instagram.com/p/DdwF-JpHD8F/",
    image: "/uploads/instagram/DdwF-JpHD8F.jpg",
    caption: "II Congresso Ágora Espírita Zenilda Cavalcanti — Encontros, debates e pluralidade de perspectivas | @mepbrasilnet",
    timestamp: 1790427612,
    isVideo: false
  },
  {
    id: "DdsLTpxBoQF",
    shortcode: "DdsLTpxBoQF",
    link: "https://www.instagram.com/p/DdsLTpxBoQF/",
    image: "/uploads/instagram/DdsLTpxBoQF.jpg",
    caption: "Chegou a programação de domingo! 🌸 O II Congresso Ágora Espírita Zenilda Cavalcanti segue no domingo, 18 de outubro de 2026, com uma programação construída para ampliar diálogos e provocar reflexões.",
    timestamp: 1790296313,
    isVideo: true
  }
];

let cachedInstagramPosts: InstagramPost[] = [...DEFAULT_INSTAGRAM_POSTS];
let lastInstagramFetch = 0;
const IG_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

async function downloadInstagramImage(rawUrl: string, shortcode: string): Promise<string> {
  try {
    const igDir = path.join(process.cwd(), 'public', 'uploads', 'instagram');
    if (!fs.existsSync(igDir)) {
      fs.mkdirSync(igDir, { recursive: true });
    }

    const ext = rawUrl.includes('.webp') ? 'webp' : 'jpg';
    const fileName = `${shortcode}.${ext}`;
    const filePath = path.join(igDir, fileName);

    // If file already exists and has valid size, reuse it
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
      return `/uploads/instagram/${fileName}`;
    }

    const cleanUrl = rawUrl
      .replace(/\\\\\\\//g, '/')
      .replace(/\\\\\//g, '/')
      .replace(/\\\//g, '/')
      .replace(/\\u0025/g, '%')
      .replace(/\\u0026/g, '&');

    const response = await axios.get(cleanUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.status === 200 && response.data?.length > 1000) {
      fs.writeFileSync(filePath, Buffer.from(response.data));
      const distIgDir = path.join(process.cwd(), 'dist', 'uploads', 'instagram');
      if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
        if (!fs.existsSync(distIgDir)) {
          fs.mkdirSync(distIgDir, { recursive: true });
        }
        fs.writeFileSync(path.join(distIgDir, fileName), Buffer.from(response.data));
      }
      return `/uploads/instagram/${fileName}`;
    }
  } catch (err: any) {
    console.warn(`[Instagram] Falha ao baixar imagem do post ${shortcode}:`, err?.message || err);
  }
  return `/uploads/instagram/${shortcode}.${rawUrl.includes('.webp') ? 'webp' : 'jpg'}`;
}

async function fetchMepInstagramPosts(): Promise<InstagramPost[]> {
  const now = Date.now();
  if (cachedInstagramPosts.length >= 3 && now - lastInstagramFetch < IG_CACHE_DURATION) {
    return cachedInstagramPosts;
  }

  try {
    const res = await axios.get("https://www.instagram.com/mepbrasilnet/embed", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
      },
      timeout: 10000
    });

    const body = res.data;
    if (typeof body === 'string' && body.includes('shortcode_media')) {
      const matches = [...body.matchAll(/\{\\"shortcode_media\\":\{\\"__typename\\":\\"([^\\"]+)\\",\\"id\\":\\"(\d+)\\",\\"shortcode\\":\\"([A-Za-z0-9_-]+)\\"/g)];
      
      if (matches.length > 0) {
        const newPosts: InstagramPost[] = [];
        const topMatches = matches.slice(0, 3);

        for (const m of topMatches) {
          const typeName = m[1];
          const shortcode = m[3];
          const marker = `\\"shortcode\\":\\"${shortcode}\\"`;
          const pos = body.indexOf(marker);
          const chunk = pos !== -1 ? body.substring(pos, pos + 25000) : '';

          const startDisplay = chunk.indexOf('display_url');
          let displayUrl = '';
          if (startDisplay !== -1) {
            const urlStart = chunk.indexOf('http', startDisplay);
            if (urlStart !== -1) {
              let end = urlStart;
              while (end < chunk.length && chunk.substring(end, end + 2) !== '\\"') {
                end++;
              }
              displayUrl = chunk.substring(urlStart, end);
            }
          }

          const mText = chunk.match(/\\"edge_media_to_caption\\":\{\\"edges\\":\[\{\\"node\\":\{\\"text\\":\\"([^"]+?)\\"\}\}\]/);
          let caption = '';
          if (mText) {
            try {
              caption = JSON.parse(`"${mText[1]}"`);
            } catch (e) {
              caption = mText[1].replace(/\\n/g, '\n');
            }
          }
          if (!caption.trim()) {
            caption = 'Publicação no perfil oficial do Instagram @mepbrasilnet';
          }

          const mTs = chunk.match(/\\"taken_at_timestamp\\":(\d+)/);
          const timestamp = mTs ? Number(mTs[1]) : 0;

          let localImagePath = `/uploads/instagram/${shortcode}.webp`;
          if (displayUrl) {
            localImagePath = await downloadInstagramImage(displayUrl, shortcode);
          }

          newPosts.push({
            id: shortcode,
            shortcode,
            link: `https://www.instagram.com/p/${shortcode}/`,
            image: localImagePath,
            caption: caption.trim(),
            timestamp,
            isVideo: typeName === 'GraphVideo'
          });
        }

        if (newPosts.length === 3) {
          cachedInstagramPosts = newPosts;
          lastInstagramFetch = now;
          return cachedInstagramPosts;
        }
      }
    }
  } catch (error: any) {
    console.warn("[Instagram] Erro ao sincronizar posts ao vivo de @mepbrasilnet:", error?.message || error);
  }

  lastInstagramFetch = now;
  return cachedInstagramPosts;
}

  app.get("/api/instagram", async (req, res) => {
    try {
      const posts = await fetchMepInstagramPosts();
      res.json(posts.slice(0, 3));
    } catch (error) {
      console.error("Failed to fetch Instagram posts", error);
      res.json(DEFAULT_INSTAGRAM_POSTS.slice(0, 3));
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.isAbsolute(__dirname) && __dirname.endsWith('dist')
      ? __dirname 
      : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
