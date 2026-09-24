import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Newspaper, 
  Calendar, 
  Building2, 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Save,
  Image as ImageIcon,
  User as UserIcon,
  Users,
  Lock,
  Search,
  Grid,
  ArrowLeft,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Quote,
  Code,
  Share2,
  Facebook,
  Twitter,
  MessageCircle,
  Copy,
  Check,
  Zap,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useContent } from './ContentContext';
import { auth, createNewUser, loginWithEmail } from './firebase';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { cn } from './lib/utils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { News, Event, Institution, Article, UserProfile, Slide, FeaturedModule } from './types';
import { mockNews, mockEvents, mockInstitutions, mockArticles, mockSlides, mockFeaturedModules } from './data';
import { uploadOptimizedImage, formatBytes, ImageOptimizationStats, optimizeImage } from './utils/imageOptimizer';
import { customUrlTransform, markdownComponents, formatExternalUrl } from './utils/linkUtils';

export { customUrlTransform, markdownComponents, formatExternalUrl };

// --- Markdown Toolbar ---

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 text-center border border-emerald-100"
          >
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-serif text-emerald-900 mb-4">{title}</h3>
            <p className="text-gray-500 mb-10 leading-relaxed">{message}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => { onConfirm(); onClose(); }}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
              >
                Sim, excluir
              </button>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ShareModal = ({ 
  isOpen, 
  onClose, 
  title, 
  url 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  url: string 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { 
      name: 'Facebook', 
      icon: Facebook, 
      color: 'bg-[#1877F2]', 
      link: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` 
    },
    { 
      name: 'Twitter', 
      icon: Twitter, 
      color: 'bg-[#1DA1F2]', 
      link: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}` 
    },
    { 
      name: 'WhatsApp', 
      icon: MessageCircle, 
      color: 'bg-[#25D366]', 
      link: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}` 
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full p-10 border border-emerald-100"
          >
            <h3 className="text-2xl font-serif text-emerald-900 mb-6 text-center">Compartilhar</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              {shareOptions.map((option) => (
                <a 
                  key={option.name}
                  href={option.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110", option.color)}>
                    <option.icon size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{option.name}</span>
                </a>
              ))}
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Link da Notícia</label>
              <div className="flex gap-2 p-2 bg-gray-50 border border-gray-100 rounded-2xl items-center">
                <input 
                  type="text" 
                  readOnly 
                  value={url} 
                  className="flex-grow bg-transparent text-xs text-gray-500 outline-none px-2 truncate"
                />
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    copied ? "bg-emerald-500 text-white" : "bg-white text-emerald-600 shadow-sm hover:bg-emerald-50"
                  )}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="w-full mt-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              Fechar
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const MarkdownToolbar = ({ 
  textareaRef, 
  content = '', 
  setContent,
  folder = 'content'
}: { 
  textareaRef: React.RefObject<HTMLTextAreaElement | null>, 
  content?: string, 
  setContent: (val: string) => void,
  folder?: string
}) => {
  const [uploadingInline, setUploadingInline] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Link Dialog State
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkSelection, setLinkSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // Image by Link Dialog State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const currentContent = typeof content === 'string' ? content : '';
    const selectedText = currentContent.substring(start, end);
    const newText = currentContent.substring(0, start) + before + selectedText + after + currentContent.substring(end);
    
    setContent(newText);
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + (selectedText ? selectedText.length + after.length : 0);
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleOpenLinkModal = () => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    const currentContent = typeof content === 'string' ? content : '';
    const selected = currentContent.substring(start, end).trim();

    setLinkSelection({ start, end });

    if (/^https?:\/\//i.test(selected) || /^www\./i.test(selected)) {
      setLinkText(selected);
      setLinkUrl(selected);
    } else if (selected) {
      setLinkText(selected);
      setLinkUrl('');
    } else {
      setLinkText('');
      setLinkUrl('');
    }
    setIsLinkModalOpen(true);
  };

  const handleConfirmInsertLink = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      alert('Por favor, informe o endereço web (URL) de destino do link.');
      return;
    }

    const { url: formattedUrl } = formatExternalUrl(trimmedUrl, linkText);
    const finalUrl = formattedUrl && formattedUrl !== '#' ? formattedUrl : (trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
    const finalText = (linkText.trim()) || finalUrl;

    const textarea = textareaRef.current;
    const currentContent = typeof content === 'string' ? content : '';
    const start = linkSelection.start;
    const end = linkSelection.end;

    const markdownLink = `[${finalText}](${finalUrl})`;
    const newText = currentContent.substring(0, start) + markdownLink + currentContent.substring(end);

    setContent(newText);
    setIsLinkModalOpen(false);
    setLinkText('');
    setLinkUrl('');

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const pos = start + markdownLink.length;
        textarea.setSelectionRange(pos, pos);
      }
    }, 50);
  };

  const handleConfirmInsertImage = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmedUrl = imageUrl.trim();
    if (!trimmedUrl) {
      alert('Por favor, informe a URL da imagem.');
      return;
    }
    const alt = imageAlt.trim() || 'Imagem';
    insertText(`\n\n![${alt}](${trimmedUrl})\n\n`, '');
    setIsImageModalOpen(false);
    setImageUrl('');
    setImageAlt('');
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    setUploadingInline(true);
    try {
      const result = await uploadOptimizedImage(file, folder, { maxDimension: 1200, quality: 0.82 });
      const cleanAlt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      insertText(`\n\n![${cleanAlt}](${result.url})\n\n`, '');
    } catch (err) {
      console.error("Error uploading inline image:", err);
      alert('Erro ao otimizar e enviar a imagem para o texto.');
    } finally {
      setUploadingInline(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const tools = [
    { icon: Heading1, label: 'Título 1', action: () => insertText('# ', '') },
    { icon: Heading2, label: 'Título 2', action: () => insertText('## ', '') },
    { icon: Bold, label: 'Negrito', action: () => insertText('**', '**') },
    { icon: Italic, label: 'Itálico', action: () => insertText('_', '_') },
    { icon: List, label: 'Lista', action: () => insertText('- ', '') },
    { icon: Quote, label: 'Citação', action: () => insertText('> ', '') },
    { icon: Code, label: 'Código', action: () => insertText('`', '`') },
    { 
      icon: LinkIcon, 
      label: 'Inserir Link Externo ou Interno', 
      action: handleOpenLinkModal 
    },
    { 
      icon: ImageIcon, 
      label: 'Inserir Imagem por Link', 
      action: () => setIsImageModalOpen(true) 
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 bg-gray-100 border-b border-gray-200 rounded-t-2xl">
        <div className="flex flex-wrap items-center gap-1">
          {tools.map((tool, i) => (
            <button
              key={i}
              type="button"
              onClick={tool.action}
              title={tool.label}
              className="p-2 hover:bg-white hover:text-emerald-600 rounded-lg transition-colors text-gray-500 cursor-pointer"
            >
              <tool.icon size={16} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleInlineImageUpload} 
            className="hidden" 
          />
          <button
            type="button"
            disabled={uploadingInline}
            onClick={() => fileInputRef.current?.click()}
            title="Fazer upload de imagem otimizada para o texto"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all border border-emerald-200 disabled:opacity-50 cursor-pointer"
          >
            {uploadingInline ? (
              <>
                <Loader2 size={14} className="animate-spin text-emerald-600" />
                <span>Otimizando...</span>
              </>
            ) : (
              <>
                <UploadCloud size={14} />
                <span>Inserir Imagem (Upload)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Link Insertion Modal (Mounted via Portal outside any parent form) */}
      {typeof document !== 'undefined' && isLinkModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsLinkModalOpen(false);
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <LinkIcon size={18} />
                </div>
                <span>Inserir Link na Publicação</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsLinkModalOpen(false);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Texto Visível do Link
                </label>
                <input
                  type="text"
                  autoFocus
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleConfirmInsertLink(e);
                    }
                  }}
                  placeholder="Ex: Leia a matéria completa no site oficial"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  O texto que o leitor verá na postagem. Se deixar em branco, usará a própria URL.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Endereço Web (URL de Destino) *
                </label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleConfirmInsertLink(e);
                    }
                  }}
                  placeholder="Ex: https://www.exemplo.com.br ou www.globo.com"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
                <span className="text-[11px] text-emerald-700 mt-1 block">
                  Dica: Se digitar sem https://, o portal incluirá o protocolo automaticamente.
                </span>
              </div>

              {linkUrl.trim() && (
                <div className="p-3 bg-emerald-50 rounded-xl text-xs border border-emerald-100 text-emerald-900">
                  <span className="font-bold block mb-1">Como vai ficar no texto:</span>
                  <span className="text-emerald-700 underline font-medium">
                    {linkText.trim() || linkUrl.trim()}
                  </span>
                  <span className="text-gray-500 ml-1">
                    ↗ ({linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`})
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsLinkModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleConfirmInsertLink(e);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  <span>Inserir Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Interactive Image by URL Modal (Mounted via Portal outside any parent form) */}
      {typeof document !== 'undefined' && isImageModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsImageModalOpen(false);
          }}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ImageIcon size={18} />
                </div>
                <span>Inserir Imagem por Link</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsImageModalOpen(false);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Endereço da Imagem (URL) *
                </label>
                <input
                  type="url"
                  autoFocus
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleConfirmInsertImage(e);
                    }
                  }}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                  Legenda / Texto Alternativo
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleConfirmInsertImage(e);
                    }
                  }}
                  placeholder="Ex: Foto do encontro espírita"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsImageModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleConfirmInsertImage(e);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={16} />
                  <span>Inserir Imagem</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// --- Auth Components ---

export const LoginPage = () => {
  const { user, loading } = useContent();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await loginWithEmail(email, password);
      navigate('/admin');
    } catch (err: any) {
      console.error("Login failed", err);
      setError('E-mail ou senha incorretos. Verifique suas credenciais.');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-emerald-600 font-serif">Carregando...</div>;
  if (user) {
    navigate('/admin');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-6 py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center border border-emerald-100"
      >
        <div className="mb-8">
          <img 
            src="https://mep.org.br/downloads/logoMep130x130.png" 
            alt="MEP Logo" 
            className="w-20 h-20 mx-auto mb-4 object-contain"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-3xl font-serif text-emerald-900 mb-1">Portal MEP</h1>
          <p className="text-sm text-gray-500 italic">Administração do Movimento</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-100 flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleEmailLogin} className="space-y-6 text-left">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              placeholder="seu e-mail"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 mt-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            Acessar Painel
          </button>
        </form>
        
        <p className="mt-10 text-[10px] text-gray-400 uppercase tracking-tighter leading-tight">
          Acesso restrito. Este sistema utiliza monitoramento de logs.
          <br />© {new Date().getFullYear()} MEP - Movimento Espírita Progressista
        </p>
      </motion.div>
    </div>
  );
};

// --- Admin Layout ---

const AdminSidebar = () => {
  const { user } = useContent();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Notícias', icon: Newspaper, path: '/admin/noticias' },
    { name: 'Eventos', icon: Calendar, path: '/admin/eventos' },
    { name: 'Instituições', icon: Building2, path: '/admin/instituicoes' },
    { name: 'Artigos', icon: BookOpen, path: '/admin/artigos' },
    { name: 'Slides', icon: ImageIcon, path: '/admin/slides' },
    { name: 'Módulos Home', icon: Grid, path: '/admin/modulos' },
    { name: 'Usuários', icon: Users, path: '/admin/usuarios' },
  ];

  return (
    <aside className="w-64 bg-emerald-950 text-emerald-50 flex flex-col h-screen sticky top-0">
      <div className="p-8 border-b border-emerald-900">
        <Link to="/" className="flex items-center gap-2 group">
          <img src="https://mep.org.br/downloads/logoMep130x130.png" className="w-8 h-8 object-contain" alt="Logo" />
          <span className="font-serif font-bold text-xl group-hover:text-emerald-400 transition-colors">MEP Admin</span>
        </Link>
      </div>

      <nav className="flex-grow p-4 space-y-2">
        {menuItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.path}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-emerald-900 transition-colors text-emerald-100/70 hover:text-white"
          >
            <item.icon size={20} />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-emerald-900 space-y-4">
        <div className="flex items-center gap-3 px-4 py-2">
          {Boolean(user?.photoURL && user.photoURL.trim()) ? (
            <img src={user.photoURL} className="w-8 h-8 rounded-full border border-emerald-700 object-cover" alt="Avatar" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-800 flex items-center justify-center"><UserIcon size={16} /></div>
          )}
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate">{user?.displayName}</p>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest">{user?.role}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-900/30 text-red-400 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useContent();
  const navigate = useNavigate();

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50">Carregando painel...</div>;
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-grow p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- Dashboard ---

export const Dashboard = () => {
  const { news, events, institutions, articles, slides, featuredModules } = useContent();

  const stats = [
    { name: 'Notícias', count: news.length, icon: Newspaper, color: 'bg-blue-500' },
    { name: 'Eventos', count: events.length, icon: Calendar, color: 'bg-emerald-500' },
    { name: 'Instituições', count: institutions.length, icon: Building2, color: 'bg-amber-500' },
    { name: 'Artigos', count: articles.length, icon: BookOpen, color: 'bg-purple-500' },
    { name: 'Slides', count: slides.length, icon: ImageIcon, color: 'bg-rose-500' },
    { name: 'Módulos', count: featuredModules.length, icon: Grid, color: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 mb-2">Bem-vindo ao Painel</h1>
          <p className="text-gray-500">Visão geral do conteúdo do portal.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/noticias" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all">
            <Plus size={16} /> Notícia
          </Link>
          <Link to="/admin/eventos" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all">
            <Plus size={16} /> Evento
          </Link>
          <Link to="/admin/artigos" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all">
            <Plus size={16} /> Artigo
          </Link>
          <Link to="/admin/slides" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all">
            <Plus size={16} /> Slide
          </Link>
          <Link to="/admin/modulos" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all">
            <Plus size={16} /> Módulo
          </Link>
          <Link to="/admin/usuarios" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all">
            <Plus size={16} /> Usuário
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white", stat.color)}>
              <stat.icon size={32} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.name}</p>
              <p className="text-3xl font-serif text-emerald-950">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-10">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-emerald-900 mb-6">Atividades Recentes</h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-500 italic">Nenhuma atividade recente registrada.</p>
          </div>
        </div>
        <div className="bg-emerald-900 p-8 rounded-3xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-serif mb-4">Dica do Sistema</h3>
            <p className="text-emerald-100/70 leading-relaxed mb-6">
              Mantenha o portal sempre atualizado com notícias e eventos para engajar a comunidade. 
              Use Markdown para formatar seus artigos com títulos, listas e links.
            </p>
            <button className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-400 transition-colors">
              Ver Documentação
            </button>
          </div>
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <LayoutDashboard size={200} />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Management Components ---

// --- Reusable Components ---

// Helper function to compress and convert image file to optimized Data URL
export const compressAndReadFile = async (file: File, maxDim = 1280, quality = 0.82): Promise<string> => {
  const res = await optimizeImage(file, { maxDimension: maxDim, quality });
  return res.dataUrl;
};

const ImageUploadField = ({ 
  label, 
  value, 
  onChange, 
  folder = 'general'
}: { 
  label: string, 
  value: string, 
  onChange: (url: string) => void,
  folder?: string
}) => {
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [lastStats, setLastStats] = useState<ImageOptimizationStats | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP, etc).');
      return;
    }

    setUploading(true);
    setImageError(false);
    setLastStats(null);
    try {
      // 1. Automatically optimize and upload
      const result = await uploadOptimizedImage(file, folder);
      onChange(result.url);
      setLastStats(result.stats);
    } catch (error: any) {
      console.error(`Error processing image for ${folder}:`, error);
      alert('Erro ao processar imagem: ' + (error?.message || 'Tente novamente ou cole o link da imagem.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-500 uppercase">{label}</label>
        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
          ⚡ Auto-otimização WebP
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <label 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "flex-1 flex items-center justify-center gap-3 px-4 py-3 bg-gray-50 border-2 border-dashed rounded-2xl cursor-pointer transition-all text-center group",
              isDragOver 
                ? "border-emerald-500 bg-emerald-50 scale-[1.01]" 
                : "border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/60",
              uploading && "opacity-60 cursor-wait pointer-events-none"
            )}
          >
            {uploading ? (
              <>
                <Loader2 size={20} className="animate-spin text-emerald-600 shrink-0" />
                <span className="text-sm font-bold text-emerald-700">
                  Otimizando e Enviando...
                </span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-500 group-hover:text-emerald-600 group-hover:scale-110 transition-all shrink-0">
                  <UploadCloud size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-700 group-hover:text-emerald-800">
                    Enviar ou Arrastar Imagem
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Redução rápida sem perda de qualidade
                  </p>
                </div>
              </>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={handleUpload} 
              disabled={uploading}
              className="hidden" 
            />
          </label>

          <div className="text-xs text-gray-400 font-bold self-center text-center">OU</div>

          <div className="flex-1 relative">
            <input 
              type="text" 
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setImageError(false);
                setLastStats(null);
              }}
              className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-xs text-gray-700 transition-all"
              placeholder="Cole a URL externa da imagem..."
            />
          </div>
        </div>

        {/* Compression / Optimization Stats Feedback */}
        {lastStats && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 text-xs font-medium"
          >
            <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            <span>
              <strong>Otimizada:</strong> {formatBytes(lastStats.optimizedSize)}
            </span>
            {lastStats.reductionPercentage > 0 && (
              <span className="bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded-md font-bold text-[11px]">
                -{lastStats.reductionPercentage}% economia
              </span>
            )}
            {lastStats.width > 0 && (
              <span className="text-gray-500 text-[11px]">
                ({lastStats.width}×{lastStats.height}px)
              </span>
            )}
          </motion.div>
        )}

        {/* Image Preview Box */}
        {Boolean(value && value.trim()) && (
          <div className="aspect-video rounded-2xl overflow-hidden border border-emerald-100 relative group bg-emerald-950/5 max-h-60 shadow-sm">
            {!imageError ? (
              <img 
                src={value} 
                className="w-full h-full object-cover" 
                alt="Preview" 
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-red-50 text-red-600">
                <span className="text-xs font-bold">Não foi possível carregar a prévia da imagem.</span>
                <span className="text-[11px] text-red-400 mt-1">Verifique se o link está acessível ou faça upload direto do arquivo.</span>
              </div>
            )}

            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Trocar imagem"
                className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-1 text-xs font-bold"
              >
                <Edit size={14} /> Trocar
              </button>
              <button 
                type="button"
                onClick={() => {
                  onChange('');
                  setImageError(false);
                  setLastStats(null);
                }}
                title="Remover imagem"
                className="p-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Generic List Component
const ContentList = <T extends { id: string, title?: string, name?: string, date?: string }>({ 
  items, 
  onEdit, 
  onDelete,
  onShare,
  title,
  icon: Icon
}: { 
  items: T[], 
  onEdit: (item: T) => void, 
  onDelete: (id: string) => void,
  onShare?: (item: T) => void,
  title: string,
  icon: any
}) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredItems = items.filter(item => 
    (item.title || item.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <ConfirmDialog 
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && onDelete(confirmId)}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
      />
      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <Icon className="text-emerald-600" size={20} />
          <h3 className="font-bold text-emerald-950">{title}</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-64"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-50">
              <th className="px-6 py-4 font-bold">Título/Nome</th>
              <th className="px-6 py-4 font-bold">Data</th>
              <th className="px-6 py-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {currentItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{item.title || item.name}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.date || '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onShare && (
                      <button 
                        onClick={() => onShare(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Compartilhar"
                      >
                        <Share2 size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => onEdit(item)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => setConfirmId(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {currentItems.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-gray-400 italic">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
          <p className="text-xs text-gray-500">
            Mostrando <span className="font-bold">{startIndex + 1}</span> a <span className="font-bold">{Math.min(startIndex + itemsPerPage, filteredItems.length)}</span> de <span className="font-bold">{filteredItems.length}</span> itens
          </p>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors text-emerald-700"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-emerald-900 px-2">
              Página {currentPage} de {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-white disabled:opacity-30 transition-colors text-emerald-700"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Manage News ---

export const ManageNews = () => {
  const { news, addNews, updateNews, deleteNews, user } = useContent();
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [sharingItem, setSharingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const displayNews = news.length > 0 ? news : mockNews;

  const initialForm = { 
    title: '', 
    subtitle: '', 
    summary: '', 
    content: '', 
    image: '', 
    date: new Date().toLocaleDateString('pt-BR'), 
    author: user?.displayName || '' 
  };
  const [form, setForm] = useState(initialForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Por favor, informe o título da notícia.');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      if (editing) {
        await updateNews(editing.id, form);
      } else {
        await addNews({ ...form, authorId: user?.uid || 'anonymous' });
      }
      setEditing(null);
      setIsAdding(false);
      setForm(initialForm);
    } catch (error: any) {
      console.error("Error saving news:", error);
      const msg = error?.message || 'Erro ao salvar notícia. Verifique os dados e tente novamente.';
      setErrorMessage(msg);
      alert('Não foi possível salvar a notícia: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (isAdding || editing) {
    return (
      <div className="space-y-8">
        <button 
          onClick={() => { setEditing(null); setIsAdding(false); setErrorMessage(null); }}
          className="flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all"
        >
          <ArrowLeft size={20} /> Voltar para Lista
        </button>
        
        <header>
          <h1 className="text-3xl font-serif text-emerald-950">{editing ? 'Editar Notícia' : 'Nova Notícia'}</h1>
        </header>

        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Título</label>
                <input 
                  type="text" 
                  required
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold"
                  placeholder="Título da notícia..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subtítulo (Opcional)</label>
                <input 
                  type="text" 
                  value={form.subtitle}
                  onChange={(e) => setForm({...form, subtitle: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Um subtítulo para detalhar a notícia..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Resumo</label>
                <textarea 
                  value={form.summary}
                  onChange={(e) => setForm({...form, summary: e.target.value})}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none"
                  placeholder="Um breve resumo para a listagem..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Conteúdo (Markdown)</label>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <MarkdownToolbar 
                    textareaRef={textareaRef} 
                    content={form.content} 
                    setContent={(val) => setForm({...form, content: val})} 
                    folder="news"
                  />
                  <textarea 
                    ref={textareaRef}
                    value={form.content}
                    onChange={(e) => setForm({...form, content: e.target.value})}
                    className="w-full p-4 bg-gray-50 outline-none h-96 font-mono text-sm border-none"
                    placeholder="# Título Principal&#10;&#10;Escreva aqui o conteúdo..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Data</label>
                <input 
                  type="text" 
                  value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Autor</label>
                <input 
                  type="text" 
                  value={form.author}
                  onChange={(e) => setForm({...form, author: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <ImageUploadField 
                label="Imagem da Notícia" 
                value={form.image} 
                onChange={(url) => setForm({...form, image: url})} 
                folder="news" 
              />
              <button 
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 cursor-pointer"
              >
                <Save size={20} /> {saving ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Publicar Notícia')}
              </button>
            </div>

            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                <Edit size={16} /> Preview do Conteúdo
              </h4>
              <div className="prose prose-sm prose-emerald max-h-64 overflow-y-auto bg-white p-4 rounded-xl border border-emerald-100">
                <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents} urlTransform={customUrlTransform}>{form.content || '*Nenhum conteúdo ainda...*'}</Markdown>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 mb-2">Notícias</h1>
          <p className="text-gray-500">Gerencie as notícias e atualizações do portal.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditing(null); setForm(initialForm); setErrorMessage(null); }}
          className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95"
        >
          <Plus size={24} /> Nova Notícia
        </button>
      </header>

      <ContentList 
        items={displayNews} 
        title="Listagem de Notícias" 
        icon={Newspaper}
        onShare={(item) => setSharingItem(item)}
        onEdit={(item) => { 
          setEditing(item); 
          setErrorMessage(null);
          setForm({
            title: item.title || '',
            subtitle: item.subtitle || '',
            summary: item.summary || '',
            content: item.content || '',
            image: item.image || '',
            date: item.date || '',
            author: item.author || ''
          }); 
        }}
        onDelete={deleteNews}
      />

      <ShareModal 
        isOpen={!!sharingItem}
        onClose={() => setSharingItem(null)}
        title={sharingItem?.title || ''}
        url={sharingItem ? `${window.location.origin}/noticias/${sharingItem.id}` : ''}
      />
    </div>
  );
};

// --- Manage Events ---

export const ManageEvents = () => {
  const { events, addEvent, updateEvent, deleteEvent } = useContent();
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const displayEvents = events.length > 0 ? events : mockEvents;

  const initialForm = { title: '', subtitle: '', author: '', description: '', date: '', time: '', location: '', image: '' };
  const [form, setForm] = useState(initialForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Por favor, informe o título do evento.');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      if (editing) {
        await updateEvent(editing.id, form);
      } else {
        await addEvent(form);
      }
      setEditing(null);
      setIsAdding(false);
      setForm(initialForm);
    } catch (error: any) {
      console.error("Error saving event:", error);
      const msg = error?.message || 'Erro ao salvar evento. Verifique os dados e tente novamente.';
      setErrorMessage(msg);
      alert('Erro ao salvar evento: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (isAdding || editing) {
    return (
      <div className="space-y-8">
        <button 
          onClick={() => { setEditing(null); setIsAdding(false); setErrorMessage(null); }} 
          className="flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all"
        >
          <ArrowLeft size={20} /> Voltar para Lista
        </button>
        
        <header>
          <h1 className="text-3xl font-serif text-emerald-950">{editing ? 'Editar Evento' : 'Novo Evento'}</h1>
        </header>

        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Título</label>
                <input 
                  type="text" 
                  required
                  value={form.title} 
                  onChange={(e) => setForm({...form, title: e.target.value})} 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold" 
                  placeholder="Título do evento..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subtítulo (Opcional)</label>
                <input 
                  type="text" 
                  value={form.subtitle} 
                  onChange={(e) => setForm({...form, subtitle: e.target.value})} 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none" 
                  placeholder="Um subtítulo para detalhar o evento..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Descrição (Markdown)</label>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <MarkdownToolbar 
                    textareaRef={textareaRef} 
                    content={form.description} 
                    setContent={(val) => setForm({...form, description: val})} 
                    folder="events"
                  />
                  <textarea 
                    ref={textareaRef}
                    value={form.description} 
                    onChange={(e) => setForm({...form, description: e.target.value})} 
                    className="w-full p-4 bg-gray-50 outline-none h-64 font-mono text-sm border-none" 
                    placeholder="Detalhes do evento..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Autor</label>
                <input type="text" value={form.author} onChange={(e) => setForm({...form, author: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Data (ex: 20 Mai)</label>
                <input type="text" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Horário</label>
                <input type="text" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Local</label>
                <input type="text" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <ImageUploadField 
                label="Imagem do Evento" 
                value={form.image} 
                onChange={(url) => setForm({...form, image: url})} 
                folder="events" 
              />
              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 cursor-pointer"
              >
                <Save size={20} /> {saving ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Criar Evento')}
              </button>
            </div>

            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                <Edit size={16} /> Preview da Descrição
              </h4>
              <div className="prose prose-sm prose-emerald max-h-64 overflow-y-auto bg-white p-4 rounded-xl border border-emerald-100">
                <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents} urlTransform={customUrlTransform}>{form.description || '*Nenhuma descrição ainda...*'}</Markdown>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 mb-2">Eventos</h1>
          <p className="text-gray-500">Gerencie a agenda de eventos e atividades.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditing(null); setForm(initialForm); setErrorMessage(null); }} 
          className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95"
        >
          <Plus size={24} /> Novo Evento
        </button>
      </header>
      <ContentList items={displayEvents} title="Agenda de Eventos" icon={Calendar} onEdit={(item) => { 
        setEditing(item); 
        setErrorMessage(null);
        setForm({
          title: item.title || '',
          subtitle: item.subtitle || '',
          author: item.author || '',
          description: item.description || '',
          date: item.date || '',
          time: item.time || '',
          location: item.location || '',
          image: item.image || ''
        }); 
      }} onDelete={deleteEvent} />
    </div>
  );
};

// --- Manage Institutions ---

export const ManageInstitutions = () => {
  const { institutions, addInstitution, updateInstitution, deleteInstitution } = useContent();
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const displayInstitutions = institutions.length > 0 ? institutions : mockInstitutions;

  const initialForm: Partial<Institution> & { socials: any } = { 
    name: '', 
    description: '', 
    image: '', 
    email: '', 
    website: '', 
    socials: { 
      instagram: '', 
      facebook: '', 
      youtube: '', 
      twitter: '' 
    } 
  };
  const [form, setForm] = useState(initialForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      alert('Por favor, informe o nome da instituição.');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      if (editing) {
        await updateInstitution(editing.id, form);
      } else {
        await addInstitution(form);
      }
      setEditing(null);
      setIsAdding(false);
      setForm(initialForm);
    } catch (error: any) {
      console.error("Error saving institution:", error);
      const msg = error?.message || 'Erro ao salvar instituição. Verifique os dados e tente novamente.';
      setErrorMessage(msg);
      alert('Erro ao salvar instituição: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (isAdding || editing) {
    return (
      <div className="space-y-8">
        <button 
          onClick={() => { setEditing(null); setIsAdding(false); setErrorMessage(null); }} 
          className="flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all"
        >
          <ArrowLeft size={20} /> Voltar para Lista
        </button>
        
        <header>
          <h1 className="text-3xl font-serif text-emerald-950">{editing ? 'Editar Instituição' : 'Nova Instituição'}</h1>
        </header>

        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome</label>
                <input 
                  type="text" 
                  required
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})} 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold" 
                  placeholder="Nome da instituição..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Descrição / História (Markdown)</label>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <MarkdownToolbar 
                    textareaRef={textareaRef} 
                    content={form.description || ''} 
                    setContent={(val) => setForm({...form, description: val})} 
                    folder="institutions"
                  />
                  <textarea 
                    ref={textareaRef}
                    value={form.description || ''} 
                    onChange={(e) => setForm({...form, description: e.target.value})} 
                    className="w-full p-4 bg-gray-50 outline-none h-64 font-mono text-sm border-none" 
                    placeholder="História e missão da instituição..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">E-mail (Opcional)</label>
                <input 
                  type="email" 
                  value={form.email || ''} 
                  onChange={(e) => setForm({...form, email: e.target.value})} 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" 
                  placeholder="contato@instituicao.org"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Website</label>
                <input type="text" value={form.website || ''} onChange={(e) => setForm({...form, website: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Instagram</label>
                <input type="text" value={form.socials.instagram} onChange={(e) => setForm({...form, socials: {...form.socials, instagram: e.target.value}})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Facebook</label>
                <input type="text" value={form.socials.facebook} onChange={(e) => setForm({...form, socials: {...form.socials, facebook: e.target.value}})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Twitter / X</label>
                <input type="text" value={form.socials.twitter} onChange={(e) => setForm({...form, socials: {...form.socials, twitter: e.target.value}})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">YouTube</label>
                <input type="text" value={form.socials.youtube} onChange={(e) => setForm({...form, socials: {...form.socials, youtube: e.target.value}})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <ImageUploadField 
                label="Imagem da Instituição" 
                value={form.image || ''} 
                onChange={(url) => setForm({...form, image: url})} 
                folder="institutions" 
              />
              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 cursor-pointer"
              >
                <Save size={20} /> {saving ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Cadastrar Instituição')}
              </button>
            </div>

            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                <Edit size={16} /> Preview da Descrição
              </h4>
              <div className="prose prose-sm prose-emerald max-h-64 overflow-y-auto bg-white p-4 rounded-xl border border-emerald-100">
                <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents} urlTransform={customUrlTransform}>{form.description || '*Nenhuma descrição ainda...*'}</Markdown>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 mb-2">Instituições</h1>
          <p className="text-gray-500">Gerencie as instituições agregadas ao movimento.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditing(null); setForm(initialForm); setErrorMessage(null); }} 
          className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95"
        >
          <Plus size={24} /> Nova Instituição
        </button>
      </header>
      <ContentList 
        items={displayInstitutions} 
        title="Instituições Agregadas" 
        icon={Building2} 
        onEdit={(item) => { 
          setEditing(item); 
          setErrorMessage(null);
          setForm({
            name: item.name || '',
            description: item.description || '',
            image: item.image || '',
            email: item.email || '',
            website: item.website || '',
            socials: {
              instagram: item.socials?.instagram || '',
              facebook: item.socials?.facebook || '',
              youtube: item.socials?.youtube || '',
              twitter: item.socials?.twitter || ''
            }
          }); 
        }} 
        onDelete={deleteInstitution} 
      />
    </div>
  );
};

// --- Manage Articles ---

export const ManageArticles = () => {
  const { articles, addArticle, updateArticle, deleteArticle, user } = useContent();
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const displayArticles = articles.length > 0 ? articles : mockArticles;

  const initialForm = { 
    title: '', 
    subtitle: '', 
    content: '', 
    author: user?.displayName || '', 
    date: new Date().toLocaleDateString('pt-BR'),
    image: ''
  };
  const [form, setForm] = useState(initialForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Por favor, informe o título do artigo.');
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      if (editing) {
        await updateArticle(editing.id, form);
      } else {
        await addArticle({ ...form, authorId: user?.uid || 'anonymous' });
      }
      setEditing(null);
      setIsAdding(false);
      setForm(initialForm);
    } catch (error: any) {
      console.error("Error saving article:", error);
      const msg = error?.message || 'Erro ao salvar artigo. Verifique os dados e tente novamente.';
      setErrorMessage(msg);
      alert('Erro ao salvar artigo: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (isAdding || editing) {
    return (
      <div className="space-y-8">
        <button 
          onClick={() => { setEditing(null); setIsAdding(false); setErrorMessage(null); }} 
          className="flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all"
        >
          <ArrowLeft size={20} /> Voltar para Lista
        </button>
        
        <header>
          <h1 className="text-3xl font-serif text-emerald-950">{editing ? 'Editar Artigo' : 'Novo Artigo'}</h1>
        </header>

        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Título</label>
                <input 
                  type="text" 
                  required
                  value={form.title} 
                  onChange={(e) => setForm({...form, title: e.target.value})} 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-bold" 
                  placeholder="Título do artigo..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subtítulo</label>
                <input 
                  type="text" 
                  value={form.subtitle} 
                  onChange={(e) => setForm({...form, subtitle: e.target.value})} 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none" 
                  placeholder="Um breve subtítulo..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Conteúdo (Markdown)</label>
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  <MarkdownToolbar 
                    textareaRef={textareaRef} 
                    content={form.content} 
                    setContent={(val) => setForm({...form, content: val})} 
                    folder="articles"
                  />
                  <textarea 
                    ref={textareaRef}
                    value={form.content} 
                    onChange={(e) => setForm({...form, content: e.target.value})} 
                    className="w-full p-4 bg-gray-50 outline-none h-96 font-mono text-sm border-none" 
                    placeholder="Escreva seu artigo aqui..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Autor</label>
                <input type="text" value={form.author} onChange={(e) => setForm({...form, author: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <ImageUploadField 
                label="Imagem do Artigo" 
                value={form.image} 
                onChange={(url) => setForm({...form, image: url})} 
                folder="articles" 
              />
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Data</label>
                <input type="text" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
              </div>
              <button 
                type="submit" 
                disabled={saving}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 cursor-pointer"
              >
                <Save size={20} /> {saving ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Publicar Artigo')}
              </button>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <h4 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
                <Edit size={16} /> Preview do Artigo
              </h4>
              <div className="prose prose-sm prose-emerald max-h-64 overflow-y-auto bg-white p-4 rounded-xl border border-emerald-100">
                <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents} urlTransform={customUrlTransform}>{form.content || '*Nenhum conteúdo ainda...*'}</Markdown>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 mb-2">Artigos</h1>
          <p className="text-gray-500">Gerencie os artigos e reflexões doutrinárias.</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditing(null); setForm(initialForm); setErrorMessage(null); }} 
          className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95"
        >
          <Plus size={24} /> Novo Artigo
        </button>
      </header>
      <ContentList 
        items={displayArticles} 
        title="Artigos e Reflexões" 
        icon={BookOpen} 
        onEdit={(item) => { 
          setEditing(item); 
          setErrorMessage(null);
          setForm({
            title: item.title || '',
            subtitle: item.subtitle || '',
            content: item.content || '',
            image: item.image || '',
            date: item.date || '',
            author: item.author || ''
          }); 
        }} 
        onDelete={deleteArticle} 
      />
    </div>
  );
};

// --- Manage Users ---

export const ManageUsers = () => {
  const { user: currentUser } = useContent();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.email === 'epaz@e-paz.com.br' || currentUser?.email === 'admin@mep.org.br';
  const [users, setUsers] = React.useState<any[]>([]);
  const [isAdding, setIsAdding] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);

  const initialForm = {
    displayName: '',
    email: '',
    password: ''
  };
  const [form, setForm] = React.useState(initialForm);

  React.useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => unsubscribe();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await createNewUser(form.email, form.password, form.displayName);
      setSuccess('Usuário criado com sucesso!');
      setForm(initialForm);
      setTimeout(() => {
        setIsAdding(false);
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error("Error creating user:", err);
      setError(err.message || 'Erro ao criar usuário. Verifique se o e-mail já está em uso.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.uid) {
      alert("Você não pode excluir seu próprio usuário.");
      return;
    }
    if (window.confirm("Tem certeza que deseja excluir este usuário? O acesso dele será revogado (nota: a conta de autenticação precisa ser excluída manualmente no console do Firebase por segurança).")) {
      try {
        await deleteDoc(doc(db, 'users', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
          <Lock size={40} />
        </div>
        <h1 className="text-2xl font-serif text-gray-900">Acesso Restrito</h1>
        <p className="text-gray-500 max-w-md">Esta área é exclusiva para administradores do sistema.</p>
      </div>
    );
  }

  if (isAdding) {
    return (
      <div className="space-y-8">
        <button 
          onClick={() => { setIsAdding(false); setError(null); }}
          className="flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all"
        >
          <ArrowLeft size={20} /> Voltar para Lista
        </button>
        
        <header>
          <h1 className="text-3xl font-serif text-emerald-950">Novo Usuário</h1>
          <p className="text-gray-500">Crie um novo colaborador para gerenciar conteúdos do site.</p>
        </header>

        <div className="max-w-2xl">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium border border-emerald-100">
                {success}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome Completo</label>
              <input 
                required
                type="text" 
                value={form.displayName} 
                onChange={(e) => setForm({...form, displayName: e.target.value})} 
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">E-mail</label>
              <input 
                required
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({...form, email: e.target.value})} 
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                placeholder="exemplo@mep.org.br"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Senha Temporária</label>
              <input 
                required
                type="password" 
                value={form.password} 
                onChange={(e) => setForm({...form, password: e.target.value})} 
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" 
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
              <p className="mt-2 text-[10px] text-gray-400 uppercase tracking-wider">O usuário poderá alterar a senha posteriormente.</p>
            </div>

            <button 
              disabled={loading}
              type="submit" 
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              <Save size={20} /> {loading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog 
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && handleDeleteUser(confirmId)}
        title="Excluir Usuário"
        message="Tem certeza que deseja remover este usuário? Ele perderá acesso ao painel administrativo."
      />
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 mb-2">Usuários</h1>
          <p className="text-gray-500">Gerencie os colaboradores e administradores do sistema.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)} 
          className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 hover:scale-105 active:scale-95"
        >
          <Plus size={24} /> Novo Usuário
        </button>
      </header>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 border-b border-gray-50">
              <th className="px-6 py-4 font-bold">Usuário</th>
              <th className="px-6 py-4 font-bold">E-mail</th>
              <th className="px-6 py-4 font-bold">Função</th>
              <th className="px-6 py-4 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {Boolean(u.photoURL && u.photoURL.trim()) ? (
                      <img src={u.photoURL} className="w-8 h-8 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <UserIcon size={16} />
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{u.displayName || 'Sem Nome'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {u.email}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    u.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {u.id !== currentUser?.uid && (
                    <button 
                      onClick={() => setConfirmId(u.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Manage Slides ---

export const ManageSlides = () => {
  const { slides, addSlide, updateSlide, deleteSlide } = useContent();
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displaySlides = slides.length > 0 ? slides : mockSlides;

  const [form, setForm] = useState<Omit<Slide, 'id' | 'createdAt'>>({ title: '', subtitle: '', image: '', link: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Por favor, informe o título do slide.');
      return;
    }
    const { title, subtitle, image, link } = form;
    const slideData = { title, subtitle, image, link };
    setSaving(true);
    setErrorMessage(null);
    try {
      if (editing) {
        await updateSlide(editing.id, slideData);
      } else {
        await addSlide(slideData);
      }
      setEditing(null);
      setIsAdding(false);
      setForm({ title: '', subtitle: '', image: '', link: '' });
    } catch (error: any) {
      console.error("Error saving slide:", error);
      const msg = error?.message || 'Erro ao salvar slide.';
      setErrorMessage(msg);
      alert('Erro ao salvar slide: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (isAdding || editing) {
    return (
      <div className="space-y-8">
        <button 
          onClick={() => { setIsAdding(false); setEditing(null); setErrorMessage(null); }}
          className="flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all"
        >
          <ArrowLeft size={20} /> Voltar para Lista
        </button>
        <header>
          <h1 className="text-3xl font-serif text-emerald-950">{editing ? 'Editar Slide' : 'Novo Slide'}</h1>
        </header>

        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Título</label>
            <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subtítulo</label>
            <input type="text" value={form.subtitle} onChange={(e) => setForm({...form, subtitle: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" required />
          </div>
          <ImageUploadField 
            label="Imagem do Slide" 
            value={form.image} 
            onChange={(url) => setForm({...form, image: url})} 
            folder="slides" 
          />
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Link (Opcional)</label>
            <input type="text" value={form.link} onChange={(e) => setForm({...form, link: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" />
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 cursor-pointer"
          >
            <Save size={20} /> {saving ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Adicionar Slide')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog 
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && deleteSlide(confirmId)}
        title="Excluir Slide"
        message="Tem certeza que deseja excluir este slide? Ele não aparecerá mais no carrossel da página inicial."
      />
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 mb-2">Slides da Home</h1>
          <p className="text-gray-500">Gerencie o carrossel de imagens da página inicial.</p>
        </div>
        <button onClick={() => { setIsAdding(true); setEditing(null); setErrorMessage(null); setForm({ title: '', subtitle: '', image: '', link: '' }); }} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
          <Plus size={24} /> Novo Slide
        </button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displaySlides.map(slide => (
          <div key={slide.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group">
            <div className="h-48 relative bg-emerald-900">
              {slide.image ? (
                <img src={slide.image} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-200 text-sm">Sem imagem</div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <button onClick={() => { 
                    setEditing(slide); 
                    setErrorMessage(null);
                    setForm({
                      title: slide.title || '',
                      subtitle: slide.subtitle || '',
                      image: slide.image || '',
                      link: slide.link || ''
                    }); 
                  }} className="p-3 bg-white text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors"><Edit size={20} /></button>
                  <button onClick={() => setConfirmId(slide.id)} className="p-3 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={20} /></button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg text-emerald-900">{slide.title}</h3>
              <p className="text-sm text-gray-500">{slide.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Manage Featured Modules ---

export const ManageFeaturedModules = () => {
  const { featuredModules, addFeaturedModule, updateFeaturedModule, deleteFeaturedModule } = useContent();
  const [editing, setEditing] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayModules = featuredModules.length > 0 ? featuredModules : mockFeaturedModules;

  const [form, setForm] = useState<Omit<FeaturedModule, 'id' | 'createdAt'>>({ title: '', desc: '', img: '', color: 'bg-emerald-600', link: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Por favor, informe o título do módulo.');
      return;
    }
    const { title, desc, img, color, link } = form;
    const moduleData = { title, desc, img, color, link };
    setSaving(true);
    setErrorMessage(null);
    try {
      if (editing) {
        await updateFeaturedModule(editing.id, moduleData);
      } else {
        await addFeaturedModule(moduleData);
      }
      setEditing(null);
      setIsAdding(false);
      setForm({ title: '', desc: '', img: '', color: 'bg-emerald-600', link: '' });
    } catch (error: any) {
      console.error("Error saving featured module:", error);
      const msg = error?.message || 'Erro ao salvar módulo.';
      setErrorMessage(msg);
      alert('Erro ao salvar módulo: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  if (isAdding || editing) {
    return (
      <div className="space-y-8">
        <button 
          onClick={() => { setIsAdding(false); setEditing(null); setErrorMessage(null); }}
          className="flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all"
        >
          <ArrowLeft size={20} /> Voltar para Lista
        </button>
        <header>
          <h1 className="text-3xl font-serif text-emerald-950">{editing ? 'Editar Módulo' : 'Novo Módulo'}</h1>
        </header>

        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-2xl bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Título</label>
            <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Descrição</label>
            <input type="text" value={form.desc} onChange={(e) => setForm({...form, desc: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" required />
          </div>
          <ImageUploadField 
            label="Imagem de Destaque" 
            value={form.img} 
            onChange={(url) => setForm({...form, img: url})} 
            folder="modules" 
          />
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cor (Tailwind Class)</label>
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl shadow-inner", form.color)} />
              <select 
                value={form.color} 
                onChange={(e) => setForm({...form, color: e.target.value})} 
                className="flex-grow p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none"
              >
                <option value="bg-emerald-600">Esmeralda (Verde)</option>
                <option value="bg-blue-600">Azul</option>
                <option value="bg-indigo-600">Índigo</option>
                <option value="bg-purple-600">Roxo</option>
                <option value="bg-pink-600">Rosa</option>
                <option value="bg-rose-600">Rose</option>
                <option value="bg-amber-600">Âmbar (Laranja)</option>
                <option value="bg-orange-600">Laranja</option>
                <option value="bg-slate-600">Ardósia (Cinza)</option>
                <option value="bg-cyan-600">Ciano</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Link</label>
            <input type="text" value={form.link} onChange={(e) => setForm({...form, link: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" required />
          </div>
          <button 
            type="submit" 
            disabled={saving}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-100 cursor-pointer"
          >
            <Save size={20} /> {saving ? 'Salvando...' : (editing ? 'Salvar Alterações' : 'Adicionar Módulo')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ConfirmDialog 
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => confirmId && deleteFeaturedModule(confirmId)}
        title="Excluir Módulo"
        message="Tem certeza que deseja excluir este módulo de destaque? Ele será removido da página inicial."
      />
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-4xl font-serif text-emerald-950 mb-2">Módulos da Home</h1>
          <p className="text-gray-500">Gerencie os blocos de destaque da página inicial.</p>
        </div>
        <button onClick={() => { setIsAdding(true); setEditing(null); setErrorMessage(null); setForm({ title: '', desc: '', img: '', color: 'bg-emerald-600', link: '' }); }} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
          <Plus size={24} /> Novo Módulo
        </button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {displayModules.map(m => (
          <div key={m.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group">
            <div className="h-40 relative bg-emerald-900">
              {m.img ? (
                <img src={m.img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-200 text-sm">Sem imagem</div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <button onClick={() => { 
                    setEditing(m); 
                    setErrorMessage(null);
                    setForm({
                      title: m.title || '',
                      desc: m.desc || '',
                      img: m.img || '',
                      color: m.color || 'bg-emerald-600',
                      link: m.link || ''
                    }); 
                  }} className="p-2 bg-white text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors"><Edit size={16} /></button>
                  <button onClick={() => setConfirmId(m.id)} className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className={cn("w-8 h-1 rounded-full mb-3", m.color)} />
              <h3 className="font-bold text-lg text-emerald-900">{m.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{m.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
