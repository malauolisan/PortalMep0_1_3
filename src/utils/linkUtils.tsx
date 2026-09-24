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
  img: ({ node, src, alt, ...props }: any) => {
    if (!src) return null;
    return (
      <img
        src={src}
        alt={alt || 'Imagem da publicação'}
        className="rounded-2xl max-w-full h-auto my-6 shadow-md border border-emerald-100 object-cover mx-auto"
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        {...props}
      />
    );
  },
};
