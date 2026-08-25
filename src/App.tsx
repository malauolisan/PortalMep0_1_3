import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Menu, X, Facebook, Instagram, Youtube, Mail, Phone, MapPin, ChevronRight, ChevronDown, Calendar, Clock, Twitter, Globe, ArrowRight, ArrowLeft, Share2, Check, Edit, Save, Plus, Trash2, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { mockNews, mockEvents, mockInstitutions, mockArticles } from './data';
import Markdown from 'react-markdown';
import { ContentProvider, useContent } from './ContentContext';
import { LoginPage, AdminLayout, Dashboard, ManageNews, ManageEvents, ManageInstitutions, ManageArticles, ManageUsers, ManageSlides, ManageFeaturedModules } from './Admin';
import { auth, createNewUser, db } from './firebase';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// --- Components ---

const BootstrapAdmin = () => {
  useEffect(() => {
    const bootstrap = async () => {
      const adminEmail = "admin@mep.org.br";
      const adminPass = "Mep@2026#";
      
      try {
        // Check if we've already bootstrapped this session to avoid loops
        if (localStorage.getItem('mep_bootstrapped') === 'true') return;

        // We can't easily check if user exists without trying to create or sign in
        // But we can check if the doc exists in Firestore
        // However, we don't have a UID yet.
        
        // Let's just try to create it. If it fails (user exists), it's fine.
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
          const user = userCredential.user;
          
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            displayName: 'Admin MEP',
            email: adminEmail,
            role: 'admin',
            photoURL: null
          });
          console.log("Admin user bootstrapped successfully");
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
            console.log("Admin user already exists");
          } else {
            console.error("Bootstrap error:", err);
          }
        }
        
        localStorage.setItem('mep_bootstrapped', 'true');
      } catch (error) {
        console.error("Bootstrap failed:", error);
      }
    };
    
    bootstrap();
  }, []);

  return null;
};

// --- Markdown Link and Image Renderer ---
const markdownComponents = {
  a: ({ node, href, children, ...props }: any) => {
    const safeHref = href || '#';
    const isExternal = safeHref.startsWith('http://') || safeHref.startsWith('https://') || safeHref.startsWith('//') || safeHref.startsWith('mailto:');
    return (
      <a
        href={safeHref}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-emerald-600 underline hover:text-emerald-800 transition-colors cursor-pointer break-words font-medium"
        onClick={(e) => {
          if (!safeHref || safeHref === '#') {
            e.preventDefault();
          }
        }}
        {...props}
      >
        {children}
      </a>
    );
  },
  img: ({ node, src, alt, ...props }: any) => {
    if (!src) return null;
    return (
      <img
        src={src}
        alt={alt || 'Imagem'}
        className="rounded-2xl max-w-full h-auto my-6 shadow-md border border-emerald-100 object-cover mx-auto"
        referrerPolicy="no-referrer"
        loading="lazy"
        {...props}
      />
    );
  }
};

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Início', href: '/' },
    { name: 'Instituições', href: '/instituicoes' },
    { name: 'Notícias', href: '/noticias' },
    { name: 'Artigos', href: '/artigos' },
    { name: 'Eventos', href: '/eventos' },
    { 
      name: 'Sobre Nós', 
      href: '/sobre',
      subLinks: [
        { name: 'Como Surgiu o MEP', href: '/sobre/como-surgiu' },
        { name: 'Ato de Fundação', href: '/sobre/ato-fundacao' },
      ]
    },
    { name: 'Contato', href: '/contato' },
  ];

  const isHome = location.pathname === '/';

  const { user, loading } = useContent();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
        isScrolled || !isHome ? "bg-white/90 backdrop-blur-md shadow-sm py-3" : "bg-white/70 backdrop-blur-sm"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="https://mep.org.br/downloads/logoMep130x130.png" 
            alt="MEP Logo" 
            className="w-[100px] h-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <div 
              key={link.name} 
              className="relative group"
              onMouseEnter={() => link.subLinks && setActiveDropdown(link.name)}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <Link 
                to={link.href}
                className={cn(
                  "flex items-center gap-1 text-sm font-medium transition-colors hover:text-emerald-600",
                  "text-emerald-950"
                )}
              >
                {link.name}
                {link.subLinks && <ChevronDown size={14} className="opacity-50" />}
              </Link>
              
              {link.subLinks && (
                <AnimatePresence>
                  {activeDropdown === link.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 mt-2 w-56 bg-white shadow-xl rounded-xl border border-emerald-50 overflow-hidden"
                    >
                      {link.subLinks.map((sub) => (
                        <Link
                          key={sub.name}
                          to={sub.href}
                          className="block px-4 py-3 text-sm text-emerald-950 hover:bg-emerald-50 transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          ))}
          
          {user ? (
            <div className="flex items-center gap-4 pl-4 border-l border-emerald-100">
              <Link to="/admin" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Painel</Link>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut size={18} /></button>
            </div>
          ) : (
            <Link to="/login" className="px-5 py-2 bg-emerald-600 text-white rounded-full text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100">Entrar</Link>
          )}
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-emerald-950"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-white shadow-xl p-6 flex flex-col gap-4 md:hidden overflow-y-auto max-h-[80vh]"
          >
            {navLinks.map((link) => (
              <div key={link.name} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Link 
                    to={link.href}
                    className="text-lg font-medium text-gray-800 hover:text-emerald-600"
                    onClick={() => !link.subLinks && setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                  {link.subLinks && (
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === link.name ? null : link.name)}
                      className="p-2 text-emerald-950"
                    >
                      <ChevronDown className={cn("transition-transform", activeDropdown === link.name && "rotate-180")} />
                    </button>
                  )}
                </div>
                
                {link.subLinks && activeDropdown === link.name && (
                  <div className="pl-4 flex flex-col gap-3 border-l-2 border-emerald-100">
                    {link.subLinks.map((sub) => (
                      <Link
                        key={sub.name}
                        to={sub.href}
                        className="text-base text-gray-600 hover:text-emerald-600"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

// --- Content Detail Modals ---

const NewsModal = ({ item, onClose }: { item: any, onClose: () => void }) => {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-md"
        >
          <X size={20} />
        </button>
        {Boolean(item.image && item.image.trim()) && (
          <div className="w-full aspect-video sm:h-72 overflow-hidden bg-emerald-50 relative">
            <img
              src={item.image}
              alt={item.title || 'Notícia'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <div className="p-6 sm:p-10 space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <span className="px-3 py-1 bg-emerald-50 rounded-full">{item.date}</span>
            {item.author && <span>Por {item.author}</span>}
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif text-emerald-950 leading-tight">
            {item.title}
          </h2>
          {item.subtitle && (
            <p className="text-lg text-emerald-800/80 font-medium italic">
              {item.subtitle}
            </p>
          )}
          {item.summary && (
            <p className="text-base text-gray-700 font-medium bg-emerald-50/50 p-4 rounded-xl border-l-4 border-emerald-500">
              {item.summary}
            </p>
          )}
          <div className="text-gray-700 leading-relaxed prose prose-emerald max-w-none">
            <Markdown components={markdownComponents}>{item.content || ''}</Markdown>
          </div>
          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArticleDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { articles } = useContent();
  const [copied, setCopied] = useState(false);
  const displayArticles = articles.length > 0 ? articles : mockArticles;
  
  const article = displayArticles.find(a => String(a.id) === String(id));
  const otherArticles = displayArticles.filter(a => String(a.id) !== String(id)).slice(0, 4);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!article) {
    return (
      <div className="pt-40 pb-24 px-6 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Calendar size={32} />
          </div>
          <h1 className="text-3xl font-serif text-emerald-950 font-bold">Artigo não encontrado</h1>
          <p className="text-gray-600">O artigo que você procura não foi encontrado ou foi removido.</p>
          <Link
            to="/artigos"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-colors"
          >
            <ArrowLeft size={18} /> Voltar para todos os artigos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 px-6 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb & Share */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            to="/artigos"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Voltar para Artigos
          </Link>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold transition-colors"
            title="Compartilhar link"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-600" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Share2 size={14} />
                <span>Compartilhar</span>
              </>
            )}
          </button>
        </div>

        {/* Article Header */}
        <header className="space-y-4 mb-10">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-emerald-600 uppercase tracking-widest">
            <span className="px-3 py-1 bg-emerald-50 rounded-full">{article.date}</span>
            {article.author && (
              <>
                <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full" />
                <span className="text-gray-600 font-semibold">Por {article.author}</span>
              </>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-emerald-950 leading-tight">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="text-xl text-emerald-800/80 font-serif italic leading-relaxed">
              {article.subtitle}
            </p>
          )}
        </header>

        {/* Featured Image */}
        {Boolean(article.image && article.image.trim()) && (
          <div className="w-full aspect-video md:h-96 rounded-3xl overflow-hidden mb-12 bg-emerald-50 border border-emerald-100/60 shadow-md">
            <img
              src={article.image}
              alt={article.title || 'Artigo'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Content Body */}
        <div className="markdown-body prose prose-emerald prose-lg max-w-none text-gray-700 leading-relaxed border-b border-gray-100 pb-16">
          <Markdown components={markdownComponents}>{article.content || ''}</Markdown>
        </div>

        {/* Other Articles Recommendation */}
        {otherArticles.length > 0 && (
          <div className="mt-16 pt-8">
            <h3 className="text-2xl font-serif text-emerald-950 mb-8">Outros Artigos e Reflexões</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {otherArticles.map((other) => (
                <Link
                  key={other.id}
                  to={`/artigos/${other.id}`}
                  className="p-6 bg-emerald-50/60 hover:bg-emerald-50 rounded-2xl border border-emerald-100/60 transition-all hover:shadow-sm group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-2">{other.date}</span>
                    <h4 className="text-lg font-serif font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-2">
                      {other.title}
                    </h4>
                    {other.subtitle && (
                      <p className="text-xs text-gray-500 line-clamp-1 italic mb-4">{other.subtitle}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                    Ler artigo <ArrowRight size={14} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const EventModal = ({ event, onClose }: { event: any, onClose: () => void }) => {
  if (!event) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-md"
        >
          <X size={20} />
        </button>
        {Boolean(event.image && event.image.trim()) && (
          <div className="w-full aspect-video sm:h-72 overflow-hidden bg-emerald-50 relative">
            <img
              src={event.image}
              alt={event.title || 'Evento'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <div className="p-6 sm:p-10 space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">{event.date}</span>
            <span className="flex items-center gap-1 text-gray-600"><Clock size={14} /> {event.time}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif text-emerald-950 leading-tight">
            {event.title}
          </h2>
          {event.subtitle && (
            <p className="text-lg text-emerald-800/80 font-medium italic">
              {event.subtitle}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-emerald-50/60 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-700 font-medium">
              <MapPin size={16} /> {event.location}
            </div>
            {event.author && (
              <div className="flex items-center gap-2">
                <User size={16} /> {event.author}
              </div>
            )}
          </div>
          <div className="text-gray-700 leading-relaxed prose prose-emerald max-w-none">
            <Markdown components={markdownComponents}>{event.description || ''}</Markdown>
          </div>
          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroSlider = () => {
  const { slides } = useContent();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <section className="relative h-screen w-full overflow-hidden bg-gray-900">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          {Boolean(slides[current]?.image && slides[current].image.trim()) ? (
            <img 
              src={slides[current].image} 
              alt={slides[current].title || 'Slide MEP'} 
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950" />
          )}
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <motion.h1 
          key={`title-${current}`}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-4xl md:text-7xl font-serif text-white mb-4 drop-shadow-lg"
        >
          {slides[current].title}
        </motion.h1>
        <motion.p 
          key={`sub-${current}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-xl md:text-3xl text-emerald-50 font-light italic drop-shadow-md mb-8"
        >
          {slides[current].subtitle}
        </motion.p>
        {slides[current].link && (
          <motion.div
            key={`btn-${current}`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
          >
            {slides[current].link.startsWith('http://') || slides[current].link.startsWith('https://') ? (
              <a 
                href={slides[current].link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 group inline-flex"
              >
                Saiba Mais <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
            ) : (
              <Link 
                to={slides[current].link}
                className="px-8 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 group inline-flex"
              >
                Saiba Mais <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </motion.div>
        )}
      </div>

      {/* Dots */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-3">
        {slides.map((_, i) => (
          <button 
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "w-3 h-3 rounded-full transition-all",
              current === i ? "bg-emerald-500 w-8" : "bg-white/50 hover:bg-white"
            )}
          />
        ))}
      </div>
    </section>
  );
};

const NewsSection = () => {
  const { news } = useContent();
  const displayNews = news.length > 0 ? news.slice(0, 5) : mockNews;
  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
        <h2 className="text-3xl font-serif text-emerald-900">Notícias</h2>
        <Link to="/noticias" className="text-emerald-600 hover:underline text-sm font-medium flex items-center gap-1">
          Ver todas <ChevronRight size={16} />
        </Link>
      </div>
      <div className="space-y-6">
        {displayNews.map((item) => (
          <motion.article 
            key={item.id}
            whileHover={{ x: 5 }}
            onClick={() => setSelectedNews(item)}
            className="flex gap-4 group cursor-pointer"
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 overflow-hidden rounded-xl bg-emerald-50 border border-emerald-100/60 shadow-xs">
              {Boolean(item.image && item.image.trim()) ? (
                <img 
                  src={item.image} 
                  alt={item.title || 'Notícia'} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-600 font-serif font-bold text-sm bg-emerald-100">
                  MEP
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">{item.date}</span>
              <h3 className="text-lg font-bold leading-tight group-hover:text-emerald-700 transition-colors mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-1">
                {item.summary}
              </p>
            </div>
          </motion.article>
        ))}
      </div>

      {selectedNews && (
        <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </div>
  );
};

const EventsSection = () => {
  const { events } = useContent();
  const displayEvents = events.length > 0 ? events.slice(0, 4) : mockEvents;
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  return (
    <div className="bg-emerald-50 p-8 rounded-2xl">
      <div className="flex items-center justify-between border-b border-emerald-200 pb-4 mb-6">
        <h2 className="text-3xl font-serif text-emerald-900">Agenda</h2>
        <Calendar className="text-emerald-600" />
      </div>
      <div className="space-y-6">
        {displayEvents.map((event) => (
          <div 
            key={event.id} 
            onClick={() => setSelectedEvent(event)}
            className="flex gap-4 items-start border-b border-emerald-100 last:border-0 pb-4 last:pb-0 cursor-pointer group hover:opacity-90"
          >
            <div className="bg-white p-3 rounded-lg text-center min-w-[70px] shadow-sm">
              <span className="block text-xs font-bold text-emerald-600 uppercase">{event.date.split(' ')[1] || 'MAI'}</span>
              <span className="block text-xl font-bold text-emerald-900 leading-none">{event.date.split(' ')[0] || '20'}</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-2 leading-tight group-hover:text-emerald-700 transition-colors">{event.title}</h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span className="flex items-center gap-1"><Clock size={14} /> {event.time}</span>
                <span className="flex items-center gap-1"><MapPin size={14} /> {event.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Link to="/eventos" className="block w-full mt-8 py-3 bg-emerald-600 text-white text-center rounded-xl font-bold hover:bg-emerald-700 transition-colors">
        Ver Agenda Completa
      </Link>

      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
};

const FeaturedModules = () => {
  const { featuredModules } = useContent();

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {featuredModules.map((m) => {
          const isExternal = m.link?.startsWith('http://') || m.link?.startsWith('https://');
          const content = (
            <>
              {m.img ? (
                <img 
                  src={m.img} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt={m.title}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 bg-emerald-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 text-white">
                <h3 className="text-2xl font-bold mb-2">{m.title}</h3>
                <p className="text-sm text-gray-200 mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {m.desc}
                </p>
                <div className={cn("w-10 h-1 rounded-full", m.color)} />
              </div>
            </>
          );

          return (
            <motion.div 
              key={m.id}
              whileHover={{ y: -10 }}
              className="group relative h-80 overflow-hidden rounded-3xl cursor-pointer shadow-lg bg-emerald-900"
            >
              {isExternal ? (
                <a href={m.link} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                  {content}
                </a>
              ) : (
                <Link to={m.link || '#'} className="block w-full h-full">
                  {content}
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-emerald-950 text-emerald-50 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        {/* Brand */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <img 
              src="https://mep.org.br/downloads/logoMep130x130.png" 
              alt="MEP Logo" 
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="font-serif font-bold text-2xl tracking-tight">MEP</span>
          </div>
          <p className="text-emerald-200/70 leading-relaxed">
            Movimento Espírita Progressista: Agregando instituições para um mundo mais fraterno e consciente.
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center hover:bg-emerald-500 transition-colors"><Facebook size={20} /></a>
            <a href="#" className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center hover:bg-emerald-500 transition-colors"><Instagram size={20} /></a>
            <a href="#" className="w-10 h-10 rounded-full bg-emerald-900 flex items-center justify-center hover:bg-emerald-500 transition-colors"><Youtube size={20} /></a>
          </div>
        </div>

        {/* Menu */}
        <div>
          <h4 className="text-lg font-bold mb-6 border-b border-emerald-800 pb-2 inline-block">Menu</h4>
          <ul className="space-y-3">
            <li><Link to="/sobre" className="hover:text-emerald-400 transition-colors">Quem Somos</Link></li>
            <li><Link to="/instituicoes" className="hover:text-emerald-400 transition-colors">Instituições Parceiras</Link></li>
            <li><Link to="/noticias" className="hover:text-emerald-400 transition-colors">Notícias</Link></li>
            <li><Link to="/artigos" className="hover:text-emerald-400 transition-colors">Artigos</Link></li>
            <li><Link to="/contato" className="hover:text-emerald-400 transition-colors">Contato</Link></li>
            <li><Link to="/admin" className="text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1 text-xs mt-4"><Edit size={12} /> Gestão de Conteúdo</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-lg font-bold mb-6 border-b border-emerald-800 pb-2 inline-block">Contato</h4>
          <ul className="space-y-4">
            <li className="flex gap-3 items-start">
              <MapPin size={20} className="text-emerald-500 shrink-0" />
              <span>Rua da Fraternidade, 123 - Centro, Cidade - UF</span>
            </li>
            <li className="flex gap-3 items-center">
              <Phone size={20} className="text-emerald-500 shrink-0" />
              <span>(00) 1234-5678</span>
            </li>
            <li className="flex gap-3 items-center">
              <Mail size={20} className="text-emerald-500 shrink-0" />
              <span>contato@mep.org.br</span>
            </li>
          </ul>
        </div>

        {/* Partner Logos */}
        <div>
          <h4 className="text-lg font-bold mb-6 border-b border-emerald-800 pb-2 inline-block">Parceiros</h4>
          <div className="grid grid-cols-3 gap-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-emerald-900 aspect-square rounded-lg flex items-center justify-center text-xs font-bold">
                LOGO {i}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-emerald-900 text-center text-sm text-emerald-200/40">
        <p>© 2026 Movimento Espírita Progressista. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
};

// --- Pages ---

const SocialMediaSection = () => {
  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ytRes, igRes] = await Promise.all([
          fetch('/api/youtube'),
          fetch('/api/instagram')
        ]);
        
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          setYoutubeVideos(ytData);
        }
        
        if (igRes.ok) {
          const igData = await igRes.json();
          setInstagramPosts(igData);
        }
      } catch (error) {
        console.error("Failed to fetch social media data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <section className="py-20 px-6 bg-emerald-50/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* YouTube Column */}
          <div className="space-y-8">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
              <Youtube className="text-red-600" size={32} />
              <h2 className="text-3xl font-serif text-emerald-900">Últimos Vídeos</h2>
            </div>
            <div className="grid gap-6">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-4 bg-white p-4 rounded-2xl animate-pulse">
                    <div className="w-32 h-20 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-full" />
                    </div>
                  </div>
                ))
              ) : (
                youtubeVideos.map((video) => (
                  <motion.a
                    key={video.id}
                    href={video.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ x: 10 }}
                    className="flex gap-4 group bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="w-32 h-20 shrink-0 overflow-hidden rounded-lg bg-emerald-50">
                      {video.thumbnail ? (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-700 font-bold text-xs">
                          Vídeo
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {video.description}
                      </p>
                    </div>
                  </motion.a>
                ))
              )}
            </div>
            <a 
              href="https://www.youtube.com/@mepbrasilnet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline"
            >
              Ver canal no Youtube <ArrowRight size={16} />
            </a>
          </div>

          {/* Instagram Column */}
          <div className="space-y-8">
            <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
              <Instagram className="text-pink-600" size={32} />
              <h2 className="text-3xl font-serif text-emerald-900">Instagram</h2>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
                ))
              ) : (
                instagramPosts.map((post) => (
                  <motion.a
                    key={post.id}
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    className="aspect-square overflow-hidden rounded-2xl shadow-sm group relative bg-emerald-50"
                  >
                    {post.image ? (
                      <img 
                        src={post.image} 
                        alt="Instagram Post" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                        Post
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                      <p className="text-white text-[10px] text-center line-clamp-3">
                        {post.caption}
                      </p>
                    </div>
                  </motion.a>
                ))
              )}
            </div>
            <a 
              href="https://www.instagram.com/mepbrasilnet/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline"
            >
              Seguir no Instagram <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};


const HomePage = () => (
  <>
    <HeroSlider />
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2">
          <NewsSection />
        </div>
        <div className="lg:col-span-1">
          <EventsSection />
        </div>
      </div>
    </section>
    <SocialMediaSection />
    <FeaturedModules />
  </>
);

const InstitutionsPage = () => {
  const { institutions } = useContent();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const displayInstitutions = institutions.length > 0 ? institutions : mockInstitutions;

  return (
    <div className="pt-32 pb-20 px-6 bg-emerald-50/30 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-serif text-emerald-900 mb-4">Instituições Agregadas</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto italic">
            Conheça as casas e grupos que compõem o Movimento Espírita Progressista.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayInstitutions.map((inst) => (
            <motion.div
              key={inst.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-white rounded-3xl shadow-md overflow-hidden border border-emerald-100 transition-all",
                expandedId === inst.id ? "md:col-span-2 lg:col-span-2 ring-2 ring-emerald-500" : "hover:shadow-xl"
              )}
            >
              <div className={cn("flex flex-col", expandedId === inst.id ? "md:flex-row" : "")}>
                <div className={cn("relative bg-emerald-50", expandedId === inst.id ? "md:w-1/2 h-64 md:h-auto" : "h-48")}>
                  {inst.image ? (
                    <img 
                      src={inst.image} 
                      alt={inst.name} 
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-100 text-emerald-800 font-serif font-bold text-lg p-4 text-center">
                      {inst.name}
                    </div>
                  )}
                </div>
                <div className="p-8 flex-grow">
                  <h3 className="text-2xl font-bold text-emerald-900 mb-3">{inst.name}</h3>
                  <p className={cn("text-gray-600 mb-6", expandedId === inst.id ? "" : "line-clamp-3")}>
                    {inst.description}
                  </p>
                  
                  {expandedId === inst.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4 border-t border-emerald-50 pt-6"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {inst.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Mail size={16} className="text-emerald-600" /> 
                            <a href={`mailto:${inst.email}`} className="hover:text-emerald-600 transition-colors break-all">{inst.email}</a>
                          </div>
                        )}
                        {inst.socials?.instagram && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Instagram size={16} className="text-emerald-600" /> 
                            <a href={inst.socials.instagram.startsWith('http') ? inst.socials.instagram : `https://instagram.com/${inst.socials.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors break-all">
                              {inst.socials.instagram}
                            </a>
                          </div>
                        )}
                        {inst.socials?.facebook && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Facebook size={16} className="text-emerald-600" /> 
                            <a href={inst.socials.facebook.startsWith('http') ? inst.socials.facebook : `https://facebook.com/${inst.socials.facebook}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors break-all">
                              {inst.socials.facebook}
                            </a>
                          </div>
                        )}
                        {inst.socials?.twitter && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Twitter size={16} className="text-emerald-600" /> 
                            <a href={inst.socials.twitter.startsWith('http') ? inst.socials.twitter : `https://twitter.com/${inst.socials.twitter}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors break-all">
                              {inst.socials.twitter}
                            </a>
                          </div>
                        )}
                        {inst.socials?.youtube && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Youtube size={16} className="text-emerald-600" /> 
                            <a href={inst.socials.youtube.startsWith('http') ? inst.socials.youtube : `https://youtube.com/${inst.socials.youtube}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-600 transition-colors break-all">
                              {inst.socials.youtube}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4 pt-4">
                        {inst.website && (
                          <a 
                            href={inst.website.startsWith('http://') || inst.website.startsWith('https://') ? inst.website : `https://${inst.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="px-6 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700"
                          >
                            Visitar Site
                          </a>
                        )}
                        <button 
                          onClick={() => setExpandedId(null)}
                          className="px-6 py-2 border border-emerald-200 text-emerald-700 rounded-full text-sm font-bold hover:bg-emerald-50"
                        >
                          Fechar
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {expandedId !== inst.id && (
                    <button 
                      onClick={() => setExpandedId(inst.id)}
                      className="text-emerald-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      Ver detalhes <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ArticlesPage = () => {
  const { articles } = useContent();
  const displayArticles = articles.length > 0 ? articles : mockArticles;
  const recentArticles = displayArticles.slice(0, 10);
  const allArticles = displayArticles;

  return (
    <div className="pt-32 pb-20 px-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-serif text-emerald-900 mb-4">Artigos e Reflexões</h1>
          <div className="w-20 h-1 bg-emerald-500 rounded-full" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-16">
          {/* Main Content: 10 Recent Articles */}
          <div className="lg:col-span-3 space-y-12">
            {recentArticles.map((article) => (
              <motion.article 
                key={article.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="group"
              >
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {Boolean(article.image && article.image.trim()) && (
                    <Link 
                      to={`/artigos/${article.id}`} 
                      className="w-full md:w-56 h-44 rounded-2xl overflow-hidden shrink-0 bg-emerald-50 shadow-xs border border-emerald-100/60 block"
                    >
                      <img 
                        src={article.image} 
                        alt={article.title || 'Artigo'} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        referrerPolicy="no-referrer" 
                      />
                    </Link>
                  )}
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3">
                      <span>{article.date}</span>
                      <span className="w-1 h-1 bg-emerald-300 rounded-full" />
                      <span>{article.author}</span>
                    </div>
                    <Link to={`/artigos/${article.id}`} className="block">
                      <h2 className="text-2xl md:text-3xl font-serif text-gray-900 group-hover:text-emerald-700 transition-colors mb-3">
                        {article.title}
                      </h2>
                    </Link>
                    {article.subtitle && (
                      <h3 className="text-lg text-emerald-800/70 italic mb-4">
                        {article.subtitle}
                      </h3>
                    )}
                    <div className="text-gray-600 leading-relaxed line-clamp-3 prose prose-sm prose-emerald">
                      <Markdown components={markdownComponents}>{article.content || ''}</Markdown>
                    </div>
                    <Link 
                      to={`/artigos/${article.id}`}
                      className="mt-6 inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors"
                    >
                      Continuar lendo <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
                <div className="mt-12 h-px bg-emerald-50" />
              </motion.article>
            ))}
          </div>

          {/* Sidebar: All Articles List */}
          <aside className="lg:col-span-1">
            <div className="sticky top-32 space-y-8">
              <div className="bg-emerald-50 p-8 rounded-3xl">
                <h4 className="text-xl font-serif text-emerald-900 mb-6 border-b border-emerald-200 pb-2">Arquivo</h4>
                <ul className="space-y-4">
                  {allArticles.map((article) => (
                    <li key={article.id} className="group">
                      <Link 
                        to={`/artigos/${article.id}`} 
                        className="flex flex-col text-left w-full hover:opacity-80 transition-opacity"
                      >
                        <span className="text-xs text-emerald-600 font-bold">{article.date}</span>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700 transition-colors line-clamp-2">
                          {article.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-emerald-900 p-8 rounded-3xl text-white">
                <h4 className="text-xl font-serif mb-4">Contribua</h4>
                <p className="text-sm text-emerald-100/70 mb-6">
                  Tem um artigo ou reflexão que gostaria de compartilhar com o movimento?
                </p>
                <Link 
                  to="/contato"
                  className="block text-center w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-400 transition-colors"
                >
                  Enviar Artigo
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const NewsPage = () => {
  const { news } = useContent();
  const displayNews = news.length > 0 ? news : mockNews;
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(displayNews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = displayNews.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="pt-32 pb-20 px-6 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-serif text-emerald-900 mb-12">Todas as Notícias</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {currentItems.map(item => (
            <article 
              key={item.id} 
              onClick={() => setSelectedNews(item)}
              className="group cursor-pointer"
            >
              <div className="aspect-video rounded-2xl overflow-hidden mb-6 bg-emerald-50 border border-emerald-100/60 shadow-xs">
                {Boolean(item.image && item.image.trim()) ? (
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={item.title || 'Notícia'} referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-serif font-bold text-lg">
                    MEP Notícias
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-emerald-600 uppercase">{item.date}</span>
              <h2 className="text-xl font-bold mt-2 mb-3 group-hover:text-emerald-700">{item.title}</h2>
              <p className="text-gray-600 text-sm line-clamp-2">{item.summary}</p>
            </article>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-16 flex justify-center items-center gap-2">
            <button 
              onClick={() => {
                setCurrentPage(prev => Math.max(prev - 1, 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-emerald-100 disabled:opacity-50 hover:bg-emerald-50 transition-colors text-emerald-700"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrentPage(i + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  "w-10 h-10 rounded-lg border font-bold transition-all",
                  currentPage === i + 1 
                    ? "bg-emerald-600 border-emerald-600 text-white" 
                    : "border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                )}
              >
                {i + 1}
              </button>
            ))}

            <button 
              onClick={() => {
                setCurrentPage(prev => Math.min(prev + 1, totalPages));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-emerald-100 disabled:opacity-50 hover:bg-emerald-50 transition-colors text-emerald-700"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {selectedNews && (
        <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}
    </div>
  );
};

const EventsPage = () => {
  const { events } = useContent();
  const displayEvents = events.length > 0 ? events : mockEvents;
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  return (
    <div className="pt-32 pb-20 px-6 bg-emerald-50/20 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-serif text-emerald-900 mb-12">Calendário de Eventos</h1>
        <div className="space-y-8">
          {displayEvents.map(event => (
            <div 
              key={event.id} 
              onClick={() => setSelectedEvent(event)}
              className="bg-white p-8 rounded-3xl shadow-sm border border-emerald-50 flex flex-col md:flex-row gap-8 items-center cursor-pointer group hover:border-emerald-200 transition-all"
            >
              <div className="w-full md:w-64 h-48 rounded-2xl overflow-hidden shrink-0 bg-emerald-50 border border-emerald-100/60 shadow-xs">
                {Boolean(event.image && event.image.trim()) ? (
                  <img src={event.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={event.title || 'Evento'} referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-serif font-bold text-lg">
                    MEP Evento
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-4 mb-3">
                  <span className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase">{event.date}</span>
                  <span className="flex items-center gap-1 text-sm text-gray-500"><Clock size={14} /> {event.time}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">{event.title}</h2>
                {event.subtitle && <p className="text-emerald-600 font-medium mb-2">{event.subtitle}</p>}
                <div className="text-gray-600 mb-4 prose prose-sm prose-emerald max-w-none line-clamp-3">
                  <Markdown components={markdownComponents}>{event.description || ''}</Markdown>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2 text-emerald-600 font-medium">
                    <MapPin size={16} /> {event.location}
                  </div>
                  {event.author && (
                    <div className="flex items-center gap-2">
                      <User size={16} /> {event.author}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEvent(event);
                }}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors whitespace-nowrap shadow-sm"
              >
                Participar
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
};

const AboutMEPPage = () => {
  const content = `
Pode-se considerar o surgimento do MEP como um raro fenômeno de aglutinamento de diferenças, uma característica que o distingue do movimento espírita institucionalizado ou federativo. Ele surgiu de uma conjugação de circunstâncias, iniciativas e aspirações ocorridas nos últimos anos, em vários pontos do Brasil.

O MEP não é uma instituição, é um espaço de convivência, acolhimento e de articulação entre grupos, sociedades, institutos, coletivos, blogs, canais e sítios virtuais com potencial de dar concretude a anteriores tentativas contra hegemônicas havidas no espiritismo brasileiro.

É sabido que o movimento espírita brasileiro se autoproclama religioso sem que isso configure uma unanimidade. Desde seus primeiros passos, no Brasil, vozes reclamam pelo resgate do pensamento kardeciano no MEB.

Em dezembro de 2020, os professores Luiz Signates e João Damásio apresentaram um interessante estudo sob o título **CONFIGURAÇÕES DIGITAIS DA CONTRAHEGEMONIA ESPÍRITA: UMA CARTOGRAFIA DOS COLETIVOS PROGRESSISTAS E DE ESQUERDA NO ESPIRITISMO BRASILEIRO** (publicado na Revista TROPOS, da Universidade Federal do Acre, v. 10, n. 1, 2021; o link é: https://periodicos.ufac.br/index.php/tropos/article/view/4535) em que identificaram 24 coletivos progressistas, alguns já tradicionais e outros surgidos no clima de polarização que se estabeleceu no País, a partir do golpe que depôs a Presidenta Dilma Roussef e que se acentuou durante o governo Bolsonaro.

Coincidentemente, em setembro desse ano de 2020, a CEPA-Associação Espírita Internacional, então presidida pela Dra. Jacira Jacinto da Silva, criava sua Coordenadoria de Parcerias e Intercâmbio e o seu quadro de Amigos da CEPA, sob a gerência da Dra. Alcione Moreno, logo integrado por várias instituições e coletivos progressistas.

A utilização intensiva das ferramentas digitais propiciou uma rápida expansão dos eventos organizados pelos coletivos progressistas permitindo que lideranças se revelassem nos mais diversos pontos do território nacional, formando uma rede que logo se articulou pela sintonia de pensamentos.

Na live que a CEPABrasil promoveu no dia 17.08.2024, com o filósofo e pensador espírita carioca Márcio Sales Saraiva, em determinado momento, respondendo a uma pergunta de Saulo Albach, o entrevistado respondeu com outra pergunta: – “Por que os espíritas progressistas, em vez de criticarem a institucionalidade conservadora, não desenvolvem outra institucionalidade que seja plural, democrática, horizontal… Já existem vários grupos, coletivos espíritas, presenciais ou virtuais que poderão convocar o primeiro congresso brasileiro do campo espírita progressista para pensar uma outra institucionalidade…”

Salomão Benchaya, do Centro Cultural Espírita de Porto Alegre (CCEPA) e da CEPA-Associação Espírita Internacional e que, já há algum tempo, buscava essa aproximação entre lideranças progressistas, em 27.08.2024, resolveu auscultar o amigo Luiz Signates sobre o que achava da ideia e dele recebe apoio animador. Não só isso. Signates conversa com o Alexandre Jr. (Ágora), Elias Moraes e Ângela Moraes (Aephus), Fábio André Santos (Abrepaz) e Rafael Von Ludolf (Move) e todos topam aderir. Analisando o assunto, a diretoria da CEPABrasil foi unânime em apoiar a iniciativa. Informado dessas tratativas, o presidente da CEPA, José Arroyo, envia mensagem de apoio ao projeto.

Em 21.09.2024, realiza-se a primeira de uma série de reuniões virtuais com a presença de representantes das instituições Amigas da CEPA convidadas, além de outros coletivos, totalizando 18 representações, em que foram iniciadas as tratativas que culminaram com a criação do MEP, cujo lançamento ao público ocorre em 03.10.2025, já com o número de 24 coletivos.
`;

  return (
    <div className="pt-40 pb-20 px-6 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-serif text-emerald-900 mb-4 uppercase tracking-tight">Como Surgiu</h1>
          <div className="w-20 h-1 bg-emerald-500 rounded-full mx-auto mt-6" />
        </header>
        <div className="markdown-body prose prose-emerald max-w-none prose-lg text-gray-700">
          <Markdown components={markdownComponents}>{content}</Markdown>
        </div>
      </div>
    </div>
  );
};

const FoundationActPage = () => {
  const content = `
# ATO PÚBLICO DE FUNDAÇÃO DO MOVIMENTO ESPÍRITA PROGRESSISTA – MEP

Nós, instituições, grupos, coletivos e sites espíritas, abaixo relacionado(a)s, por admitirmos a existência de diferentes leituras do espiritismo, defendemos essa diversidade como patrimônio histórico, cultural e espiritual, sem exclusões ou preconceitos.

Temos consciência de que, como uma coletividade, somos diferentes, tanto na compreensão da natureza do espiritismo – científica, filosófica, laica ou religiosa e pedagógica – quanto no campo ideológico – social-democrata, liberal, anarquista, socialista, marxista etc. Essas diferenças foram capazes de forjar, com maturidade, uma unidade bem maior, sem sobrepor-se à nossa singularidade, posto que prevalecem, entre nós, laços de respeito e fraternidade.

Como um movimento espontâneo de lideranças espíritas, surgimos, a partir de 30.11.2024, num momento histórico, como força de resistência ao avanço do autoritarismo no Brasil e no mundo e às propostas representadas pelas correntes neoliberais de nosso tempo que promovem a opressão à classe trabalhadora e a grupos minoritários, impedem o acesso a bens e serviços públicos e ampliam a desigualdade social.

No atual contexto sociopolítico, sentimos a necessidade de formar uma rede de intercâmbio e ação, conectar corações e mentes e articular coletivos e lideranças espalhados pelo Brasil e pelo mundo construindo uma articulação espírita progressista que defenda o bem-estar e a justiça social sob a ótica do espiritismo.

Em nosso entendimento, o espiritismo nos aponta, neste século 21, para um compromisso irrevogável com:

1. o pluralismo de interpretações, contrapondo-se ao fundamentalismo da letra, com centralidade não dogmática na obra kardequiana;
2. a convivência pacífica na diversidade de espiritismos, com ênfase no diálogo entre as diversas tradições religiosas e filosóficas;
3. a autonomia das comunidades espíritas, sem qualquer subordinação institucional;
4. o resgate do exercício amplo e democrático da mediunidade, de forma crítica e contextualizada;

E, no âmbito da sociedade, com:

5. a democracia política e social;
6. a justiça social, a liberdade de pensamento, a igualdade, a equidade e o respeito à diversidade;
7. os direitos de todas as espécies;
8. a defesa da ciência e o combate a todas as formas de negacionismo;
9. a laicidade do Estado, sem qualquer tipo de favorecimento de grupos e discursividades religiosas sobre a população;
10. a proteção e a preservação do meio ambiente e o apoio à elaboração de políticas públicas socioambientais transversais que possam fazer frente à crise climática criada pela expansão das sociedades industriais e pela lógica capitalista; e
11. a educação libertadora, a pluralidade cultural, o apoio e a efetiva participação na elaboração de políticas públicas que acolham as muitas identidades, que são premissas básicas para a promoção da diversidade com ênfase nas práticas – entre outras - feminista, antirracista, antiespecista, antilgbtfóbica e anticapacitista.

Guiados por esses princípios e objetivos, que unem dialeticamente a transformação pessoal e a estrutural da sociedade, e ancorados numa concepção macrossocial de caridade – expressão da justiça social como superação do assistencialismo paternalista – anunciamos o surgimento do Movimento Espírita Progressista reunindo lideranças, pesquisadoras(es), grupos, associações e coletivos espíritas – presenciais e/ou virtuais – que comunguem desses ideais para, em conjunto, estabelecermos uma rede capaz de organizar ações, promover agendas, eventos, campanhas, parcerias e publicações que estimulem e/ou promovam um maior engajamento dos espíritas na solução dos graves problemas que afligem a nossa sociedade.

Para tanto, contamos com a simpatia e apoio de todos.

Publicado em ...... de ........... de 2025

Assinam este documento:

1.	Associação Brasileira de Delegados e Amigos da CEPA (CEPABrasil) – Santos/SP
2.	Associação Brasileira de Pedagogia Espírita (ABPE) – Bragança Paulista/SP
3.	Associação Brasileira Espírita de Direitos Humanos e Cultura de Paz (ABREPAZ) – Goiânia/GO
4.	Associação de Estudos e Pesquisas Espírita de João Pessoa (ASSEPE)
5.	Associação Espírita de Pesquisas em Ciências Humanas e Sociais (AEPHUS) – Goiânia/GO
6.	Canal Cavanhaque de Kardec – Rio de Janeiro/RJ
7.	Canal YouTube Armas de Minerva – Rio de Janeiro/RJ
8.	Canal YouTube Suzana Leão – Novo Hamburgo/RS
9.	Centro Cultural Espírita de Porto Alegre (CCEPA)
10.	Centro de Pesquisa e Documentação Espírita (CPDOC) – Santos/SP
11.	Centro Espírita Allan Kardec – Santos/SP
12.	Centro Espírita Herculano Pires (CEHP) – Rio de Janeiro/RJ
13.	Coletivo Ágora Espírita – Recife/PE
14.	Coletivo de Estudos Espiritismo e Justiça Social (CEJUS)
15.	Coletivo Espírita Maria Felipa – Salvador/BA
16.	Coletivo Girassóis - Espíritas pelo Bem Comum – Fortaleza/CE
17.	Cultura Espírita Livre-Pensar (CELP) – Curitiba/PR
18.	Espíritas à Esquerda (EàE) – Salvador/BA
19.	Espiritismo com Kardec (ECK) – São José-SC
20. Fraternidade Espírita – Goiânia/GO
21.	Fronteiras do Pensamento Espírita – Goiânia/GO
22.	Grupo Espírita Livre Pensar (GELP) – São Paulo/SP
23.	Movimento Mundial de Mulheres Espíritas (MOVMMESP)
24.	Movimento pela Ética Animal Espírita (MOVE) – Rio de Janeiro/RJ
25. Sociedade Kardecista de Estudos Espíritas - SKEE
`;

  return (
    <div className="pt-40 pb-20 px-6 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="markdown-body prose prose-emerald max-w-none">
          <Markdown components={markdownComponents}>{content}</Markdown>
        </div>
      </div>
    </div>
  );
};

const ContactPage = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    mensagem: ''
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    // Simulate sending
    setTimeout(() => {
      setStatus('success');
      setFormData({ nome: '', email: '', mensagem: '' });
    }, 1500);
  };

  return (
    <div className="pt-40 pb-20 px-6 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-serif text-emerald-900 mb-4">Entre em Contato</h1>
          <p className="text-gray-600">Estamos à disposição para ouvir você.</p>
          <div className="w-20 h-1 bg-emerald-500 rounded-full mx-auto mt-6" />
        </header>

        <div className="bg-emerald-50/50 p-8 md:p-12 rounded-[2.5rem] border border-emerald-100 shadow-sm">
          {status === 'success' ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail size={40} />
              </div>
              <h2 className="text-2xl font-bold text-emerald-900 mb-2">Mensagem Enviada!</h2>
              <p className="text-emerald-700">Agradecemos o seu contato. Retornaremos em breve.</p>
              <button 
                onClick={() => setStatus('idle')}
                className="mt-8 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
              >
                Enviar outra mensagem
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 uppercase tracking-widest mb-2 ml-1">Nome</label>
                  <input 
                    required
                    type="text" 
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    className="w-full p-4 bg-white border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="Seu nome completo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-900 uppercase tracking-widest mb-2 ml-1">E-mail</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-4 bg-white border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-widest mb-2 ml-1">Mensagem</label>
                <textarea 
                  required
                  value={formData.mensagem}
                  onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
                  className="w-full p-4 bg-white border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-40 resize-none"
                  placeholder="Como podemos ajudar?"
                />
              </div>
              <button 
                disabled={status === 'sending'}
                type="submit"
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
              >
                {status === 'sending' ? 'Enviando...' : (
                  <>
                    Enviar Mensagem <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <ContentProvider>
      <BrowserRouter>
        <BootstrapAdmin />
        <div className="min-h-screen flex flex-col">
          <Header />
          
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/instituicoes" element={<InstitutionsPage />} />
              <Route path="/noticias" element={<NewsPage />} />
              <Route path="/artigos" element={<ArticlesPage />} />
              <Route path="/artigos/:id" element={<ArticleDetailPage />} />
              <Route path="/eventos" element={<EventsPage />} />
              <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
        <Route path="/admin/noticias" element={<AdminLayout><ManageNews /></AdminLayout>} />
        <Route path="/admin/eventos" element={<AdminLayout><ManageEvents /></AdminLayout>} />
        <Route path="/admin/instituicoes" element={<AdminLayout><ManageInstitutions /></AdminLayout>} />
        <Route path="/admin/artigos" element={<AdminLayout><ManageArticles /></AdminLayout>} />
        <Route path="/admin/usuarios" element={<AdminLayout><ManageUsers /></AdminLayout>} />
        <Route path="/admin/slides" element={<AdminLayout><ManageSlides /></AdminLayout>} />
        <Route path="/admin/modulos" element={<AdminLayout><ManageFeaturedModules /></AdminLayout>} />
              <Route path="/sobre" element={<AboutMEPPage />} />
              <Route path="/sobre/como-surgiu" element={<AboutMEPPage />} />
              <Route path="/sobre/ato-fundacao" element={<FoundationActPage />} />
              <Route path="/contato" element={<ContactPage />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </BrowserRouter>
    </ContentProvider>
  );
}
