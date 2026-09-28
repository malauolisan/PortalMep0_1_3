import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Normalizes any raw URL string (with or without protocol, www, relative, etc.)
 * into a safe, valid clickable URL.
 * Also intelligently handles cases where the user put `https://` as the link
 * but the actual URL was in the text label.
 */
export const formatExternalUrl = (rawUrl: string, fallbackText?: string): { url: string; isExternal: boolean } => {
  let trimmed = (rawUrl || '').trim();
  const text = (fallbackText || '').trim();

  // If URL is incomplete or empty, check if fallbackText looks like a URL
  if (!trimmed || trimmed === '#' || trimmed === 'https://' || trimmed === 'http://') {
    if (text && (/^https?:\/\//i.test(text) || /^www\./i.test(text) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(text))) {
      trimmed = text;
    } else {
      return { url: '#', isExternal: false };
    }
  }

  // Allow data URIs for images/assets
  if (trimmed.startsWith('data:image/')) {
    return { url: trimmed, isExternal: false };
  }

  // Anchor links within the page
  if (trimmed.startsWith('#')) {
    return { url: trimmed, isExternal: false };
  }

  // Internal application routes (e.g. /noticias, /artigos)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { url: trimmed, isExternal: false };
  }

  // Protocol-relative URLs (e.g. //google.com)
  if (trimmed.startsWith('//')) {
    return { url: `https:${trimmed}`, isExternal: true };
  }

  // Mailto or Tel
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return { url: trimmed, isExternal: true };
  }

  // Standard absolute HTTP/HTTPS URLs
  if (/^https?:\/\//i.test(trimmed)) {
    // Check if it's literally just "https://" or "http://" without domain
    if (/^https?:\/\/$/i.test(trimmed)) {
      if (text && (/^www\./i.test(text) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(text))) {
        return { url: `https://${text.replace(/^https?:\/\//i, '')}`, isExternal: true };
      }
      return { url: '#', isExternal: false };
    }
    return { url: trimmed, isExternal: true };
  }

  // Domain-like URLs (e.g. www.google.com, facebook.com/mep, uol.com.br)
  if (/^(www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i.test(trimmed)) {
    return { url: `https://${trimmed}`, isExternal: true };
  }

  // Default fallback: if it doesn't look like an internal path, prefix with https://
  if (trimmed.includes('.')) {
    return { url: `https://${trimmed}`, isExternal: true };
  }

  return { url: trimmed, isExternal: false };
};

/**
 * URL sanitizer for react-markdown `urlTransform`.
 * Ensures domains without https:// are prefixed so react-markdown doesn't strip or corrupt them.
 */
export const customUrlTransform = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (/^(www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
};

/**
 * Image metadata parsed from Markdown alt text, URL fragments, or HTML attributes.
 * Syntax supported in alt:
 *   ![Título ou Descrição | 50% | esquerda | Legenda opcional](url)
 * Syntax supported in URL:
 *   ![Título](url#size=medium&align=right&caption=Minha+Legenda)
 */
export interface ParsedImageInfo {
  alt: string;
  size: string; // '25%' | '50%' | '75%' | '100%' | '300px' etc.
  align: 'left' | 'right' | 'center' | 'inline';
  caption?: string;
  url: string;
}

export function parseImageMetadata(src: string, rawAlt: string = ''): ParsedImageInfo {
  let alt = (rawAlt || '').trim();
  let size = '100%';
  let align: 'left' | 'right' | 'center' | 'inline' = 'center';
  let caption: string | undefined = undefined;
  let url = (src || '').trim();

  // 1. Check for URL fragment/hash e.g. #size=medium&align=left
  if (url.includes('#')) {
    const [baseUrl, fragment] = url.split('#');
    url = baseUrl;
    try {
      const params = new URLSearchParams(fragment);
      if (params.get('size')) size = params.get('size')!;
      if (params.get('align')) {
        const a = params.get('align')!.toLowerCase();
        if (a === 'left' || a === 'esquerda') align = 'left';
        else if (a === 'right' || a === 'direita') align = 'right';
        else if (a === 'inline' || a === 'livre') align = 'inline';
        else if (a === 'center' || a === 'centro') align = 'center';
      }
      if (params.get('caption')) caption = params.get('caption')!;
      if (params.get('w')) size = params.get('w')!;
    } catch {
      // Ignore URLSearchParams error
    }
  }

  // 2. Check for pipe format in alt text: "Meu Alt | 50% | esquerda | Minha Legenda"
  if (alt.includes('|')) {
    const parts = alt.split('|').map(p => p.trim());
    alt = parts[0] || 'Imagem';

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const lower = part.toLowerCase();

      // Check alignment tokens
      if (lower === 'left' || lower === 'esquerda' || lower === 'esq') {
        align = 'left';
      } else if (lower === 'right' || lower === 'direita' || lower === 'dir') {
        align = 'right';
      } else if (lower === 'center' || lower === 'centro' || lower === 'centralizada' || lower === 'meio') {
        align = 'center';
      } else if (lower === 'inline' || lower === 'livre' || lower === 'em-linha' || lower === 'emlinha') {
        align = 'inline';
      } else if (lower.startsWith('align:') || lower.startsWith('alinhamento:')) {
        const val = lower.split(':')[1]?.trim();
        if (val === 'left' || val === 'esquerda') align = 'left';
        else if (val === 'right' || val === 'direita') align = 'right';
        else if (val === 'inline' || val === 'livre') align = 'inline';
        else align = 'center';
      }
      // Check size tokens
      else if (lower === 'small' || lower === 'pequena' || lower === 'pequeno' || lower === '25%') {
        size = '25%';
      } else if (lower === 'medium' || lower === 'media' || lower === 'médio' || lower === 'média' || lower === '50%') {
        size = '50%';
      } else if (lower === 'large' || lower === 'grande' || lower === '75%') {
        size = '75%';
      } else if (lower === 'full' || lower === 'total' || lower === 'completa' || lower === '100%') {
        size = '100%';
      } else if (/^\d+(%|px|rem|em|vw)$/.test(lower)) {
        size = lower;
      } else if (lower.startsWith('size:') || lower.startsWith('tamanho:') || lower.startsWith('w:')) {
        const val = part.split(':')[1]?.trim() || '';
        size = val;
      } else if (lower.startsWith('caption:') || lower.startsWith('legenda:')) {
        caption = part.substring(part.indexOf(':') + 1).trim();
      } else {
        // If not recognized as size or align keyword, treat as caption
        if (!caption) {
          caption = part;
        }
      }
    }
  }

  return { alt, size, align, caption, url };
}

/**
 * Custom renderer components for react-markdown with guaranteed working links and images.
 */
export const markdownComponents = {
  a: ({ node, href, children, ...props }: any) => {
    // Extract text content of children to use as fallback if href was incomplete
    let textContent = '';
    try {
      if (typeof children === 'string') {
        textContent = children;
      } else if (Array.isArray(children)) {
        textContent = children
          .map((c) => (typeof c === 'string' ? c : c?.props?.children || ''))
          .join('');
      }
    } catch {
      textContent = '';
    }

    const { url, isExternal } = formatExternalUrl(href || '', textContent);
    const isEffectiveLink = url && url !== '#' && url !== 'https://' && url !== 'http://';

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation();
      if (!isEffectiveLink) {
        e.preventDefault();
      }
    };

    return (
      <a
        href={isEffectiveLink ? url : '#'}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-emerald-600 underline font-medium hover:text-emerald-800 transition-colors cursor-pointer break-words inline-flex items-center gap-1 group/link"
        onClick={handleClick}
        title={isExternal && isEffectiveLink ? `Abrir link externo: ${url}` : undefined}
        {...props}
      >
        <span className="underline decoration-emerald-400 group-hover/link:decoration-emerald-700">
          {children}
        </span>
        {isExternal && isEffectiveLink && (
          <ExternalLink
            size={13}
            className="inline-block shrink-0 opacity-70 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all text-emerald-600"
          />
        )}
      </a>
    );
  },
  img: ({ node, src, alt, className = '', style = {}, ...props }: any) => {
    if (!src) return null;
    const { alt: cleanAlt, size, align, caption, url } = parseImageMetadata(src, alt);

    // Compute width styling
    const customWidthStyle: React.CSSProperties = { ...style };
    if (size === '25%') {
      customWidthStyle.width = '25%';
      customWidthStyle.minWidth = '180px';
      customWidthStyle.maxWidth = '100%';
    } else if (size === '50%') {
      customWidthStyle.width = '50%';
      customWidthStyle.minWidth = '260px';
      customWidthStyle.maxWidth = '100%';
    } else if (size === '75%') {
      customWidthStyle.width = '75%';
      customWidthStyle.minWidth = '320px';
      customWidthStyle.maxWidth = '100%';
    } else if (size === '100%') {
      customWidthStyle.width = '100%';
      customWidthStyle.maxWidth = '100%';
    } else if (size) {
      customWidthStyle.width = size;
      customWidthStyle.maxWidth = '100%';
    }

    let alignClass = '';
    if (align === 'left') {
      alignClass = 'img-float-left float-left mr-6 mb-4 mt-2 clear-left max-w-full';
    } else if (align === 'right') {
      alignClass = 'img-float-right float-right ml-6 mb-4 mt-2 clear-right max-w-full';
    } else if (align === 'inline') {
      alignClass = 'img-inline inline-block align-middle mx-2 my-1 max-w-full';
    } else {
      alignClass = 'img-center block mx-auto my-6 clear-both max-w-full';
    }

    const imgElement = (
      <img
        src={url}
        alt={cleanAlt || caption || 'Imagem da publicação'}
        className={`rounded-2xl h-auto shadow-md border border-emerald-100/80 object-cover ${
          align === 'center' ? 'mx-auto' : ''
        } ${!caption ? alignClass : 'w-full block'} ${className}`}
        style={!caption ? customWidthStyle : undefined}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        {...props}
      />
    );

    if (caption) {
      return (
        <figure
          className={`not-prose my-4 ${alignClass} ${className}`}
          style={customWidthStyle}
        >
          {imgElement}
          <figcaption className="text-xs text-gray-500 italic mt-2 text-center px-2 pb-0.5 leading-relaxed">
            {caption}
          </figcaption>
        </figure>
      );
    }

    return imgElement;
  },
};
