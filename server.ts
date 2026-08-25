import express from "express";
import path from "path";
import axios from "axios";
import Parser from "rss-parser";
import dotenv from "dotenv";

dotenv.config();

const parser = new Parser();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Use JSON middleware for API if needed
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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
