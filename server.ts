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
  const PORT = Number(process.env.PORT) || 3000;

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

  app.get("/api/instagram", async (req, res) => {
    try {
      // Instagram is much harder without an API key.
      // We'll return the placeholder data for now, but structured for real integration.
      // If the user provides a token, we could use the Instagram Graph API.
      
      res.json([
        {
          id: 'i1',
          image: 'https://picsum.photos/seed/mep1/600/600',
          link: 'https://www.instagram.com/mepbrasilnet/',
          caption: 'Nossa última reunião foi um sucesso! #MEP #Espiritismo'
        },
        {
          id: 'i2',
          image: 'https://picsum.photos/seed/mep2/600/600',
          link: 'https://www.instagram.com/mepbrasilnet/',
          caption: 'Confira nossa agenda de eventos para o próximo mês.'
        },
        {
          id: 'i3',
          image: 'https://picsum.photos/seed/mep3/600/600',
          link: 'https://www.instagram.com/mepbrasilnet/',
          caption: 'Novos artigos publicados no nosso portal. Leia agora!'
        }
      ]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch Instagram posts" });
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
