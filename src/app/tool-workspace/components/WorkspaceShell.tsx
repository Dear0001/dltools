'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Tool } from '@/data/tools';
import { ChevronRight, Heart, Home } from 'lucide-react';
import { useFavorites } from '@/lib/favorites';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/data/tools';
import { trackToolOpen } from '@/components/GoogleAnalytics';
import SavedToolDataDialog from './SavedToolDataDialog';
import DocumentConverterPanel from './tools/DocumentConverterPanel';
import { getCategoryName, getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';

// Tool-specific panels
import JsonFormatterPanel from './tools/JsonFormatterPanel';
import JsFormatterPanel from './tools/JsFormatterPanel';
import HtmlFormatterPanel from './tools/HtmlFormatterPanel';
import CssFormatterPanel from './tools/CssFormatterPanel';
import SqlFormatterPanel from './tools/SqlFormatterPanel';
import XmlFormatterPanel from './tools/XmlFormatterPanel';
import YamlFormatterPanel from './tools/YamlFormatterPanel';
import DiffPanel from './tools/DiffPanel';
import UuidPanel from './tools/UuidPanel';
import HashPanel from './tools/HashPanel';
import PasswordGeneratorPanel from './tools/PasswordGeneratorPanel';
import JwtPanel from './tools/JwtPanel';
import UrlCodecPanel from './tools/UrlCodecPanel';
import RegexPanel from './tools/RegexPanel';
import TimestampPanel from './tools/TimestampPanel';
import Base64ImagePanel from './tools/Base64ImagePanel';
import CurlPanel from './tools/CurlPanel';
import KhqrBuilderPanel from './tools/KhqrBuilderPanel';
import KhqrValidatorPanel from './tools/KhqrValidatorPanel';
import QrReaderPanel from './tools/QrReaderPanel';
import ImageCompressPanel from './tools/ImageCompressPanel';
import GenericComingSoon from './tools/GenericComingSoon';
import JsonToJavaPanel from './tools/JsonToJavaPanel';
import JsonSchemaPanel from './tools/JsonSchemaPanel';
import JsonPathPanel from './tools/JsonPathPanel';
import DataConverterPanel from './tools/DataConverterPanel';
import JsonToCodePanel from './tools/JsonToCodePanel';
import CronBuilderPanel from './tools/CronBuilderPanel';
import ConversionCalculatorPanel from './tools/ConversionCalculatorPanel';
import TextToolkitPanel from './tools/TextToolkitPanel';
import EncodingToolkitPanel from './tools/EncodingToolkitPanel';
import ApiTesterPanel from './tools/ApiTesterPanel';
import IpCidrPanel from './tools/IpCidrPanel';
import CertificateInspectorPanel from './tools/CertificateInspectorPanel';
import MarkdownFormatterPanel from './tools/MarkdownFormatterPanel';
import SvgViewerPanel from './tools/SvgViewerPanel';
import SqlQueryBuilderPanel from './tools/SqlQueryBuilderPanel';

const PANEL_MAP: Record<string, React.ComponentType<{ tool: Tool }>> = {
  'tool-json-formatter': JsonFormatterPanel,
  'tool-js-formatter': JsFormatterPanel,
  'tool-html-formatter': HtmlFormatterPanel,
  'tool-css-formatter': CssFormatterPanel,
  'tool-sql-formatter': SqlFormatterPanel,
  'tool-xml-formatter': XmlFormatterPanel,
  'tool-yaml-formatter': YamlFormatterPanel,
  'tool-json-diff': DiffPanel,
  'tool-text-diff': DiffPanel,
  'tool-xml-diff': DiffPanel,
  'tool-java-diff': DiffPanel,
  'tool-uuid': UuidPanel,
  'tool-hash': HashPanel,
  'tool-password-generator': PasswordGeneratorPanel,
  'tool-jwt-decoder': JwtPanel,
  'tool-url-codec': UrlCodecPanel,
  'tool-regex-tester': RegexPanel,
  'tool-timestamp': TimestampPanel,
  'tool-base64-image': Base64ImagePanel,
  'tool-image-compress': ImageCompressPanel,
  'tool-json-to-ts': JsonToCodePanel,
  'tool-json-to-java': JsonToJavaPanel,
  'tool-json-to-dart': JsonToCodePanel,
  'tool-cron-builder': CronBuilderPanel,
  'tool-conversion-calculator': ConversionCalculatorPanel,
  'tool-text-toolkit': TextToolkitPanel,
  'tool-encoding-toolkit': EncodingToolkitPanel,
  'tool-api-tester': ApiTesterPanel,
  'tool-ip-cidr': IpCidrPanel,
  'tool-certificate-inspector': CertificateInspectorPanel,
  'tool-markdown-formatter': MarkdownFormatterPanel,
  'tool-svg-viewer': SvgViewerPanel,
  'tool-sql-builder': SqlQueryBuilderPanel,
  'tool-json-schema': JsonSchemaPanel,
  'tool-jsonpath': JsonPathPanel,
  'tool-data-converter': DataConverterPanel,
  'tool-curl-generator': CurlPanel,
  'tool-khqr-builder': KhqrBuilderPanel,
  'tool-khqr-validator': KhqrValidatorPanel,
  'tool-qr-reader': QrReaderPanel,
  'tool-pdf-word-converter': DocumentConverterPanel,
  'tool-image-to-pdf': DocumentConverterPanel,
  'tool-image-to-word': DocumentConverterPanel,
};

export default function WorkspaceShell({ tool }: { tool: Tool }) {
  const { locale, t } = useLocale();
  const { data: session, status: authStatus } = useSession();
  const trackedToolId = useRef('');
  const category = CATEGORIES.find((c) => c.id === tool.category);
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(tool.id);
  const toolName = getToolName(tool.id, tool.name, locale);
  const PanelComponent = PANEL_MAP[tool.id] || GenericComingSoon;
  // Tool panels use browser-only APIs (DOMParser, window, localStorage), so render them after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Save to recent
  useEffect(() => {
    try {
      const stored = localStorage.getItem('devtoolkit-recent');
      const recents: unknown = stored ? JSON.parse(stored) : [];
      const previous = Array.isArray(recents)
        ? recents.filter((id): id is string => typeof id === 'string')
        : [];
      localStorage.setItem(
        'devtoolkit-recent',
        JSON.stringify([tool.id, ...previous.filter((id) => id !== tool.id)].slice(0, 8)),
      );
    } catch {
      toast.error('Could not save recent tools on this device.');
    }

    if (authStatus !== 'authenticated' || !session?.user?.id) return;
    fetch('/api/user/recents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolId: tool.id }),
    }).then(async (response) => {
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? 'Could not sync this recent tool.');
      }
    }).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Could not sync this recent tool.');
    });
  }, [authStatus, session?.user?.id, tool.id]);

  useEffect(() => {
    if (trackedToolId.current === tool.id) return;
    trackedToolId.current = tool.id;
    trackToolOpen(tool);
  }, [tool]);

  const description =
    tool.id === 'tool-pdf-word-converter'
      ? t('converterSubtitle')
      : tool.id === 'tool-image-to-pdf' || tool.id === 'tool-image-to-word'
        ? t('imageConverterSubtitle')
        : getToolDescription(tool.id, tool.description, locale);

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-56px)]">
      {/* Workspace header: breadcrumb, title, description, actions */}
      <div className="flex-shrink-0 border-b border-border bg-background-secondary px-4 py-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-16">
        <nav aria-label="Breadcrumb" className="mb-2 text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="inline-flex items-center gap-1 hover:text-primary" aria-label={t('backToHub')}>
                <Home size={12} aria-hidden="true" /> {locale === 'kh' ? 'ទំព័រដើម' : 'Home'}
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li>
              <Link href={`/tools?cat=${tool.category}`} className="hover:text-primary">
                {category ? getCategoryName(category.id, category.label, locale) : tool.category}
              </Link>
            </li>
            <li aria-hidden="true"><ChevronRight size={12} /></li>
            <li aria-current="page" className="font-medium text-foreground">{toolName}</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{toolName}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggle(tool.id)}
              aria-pressed={favorite}
              className="btn-ghost"
              title={favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart size={15} className={favorite ? 'fill-primary text-primary' : ''} aria-hidden="true" />
              <span className="hidden sm:inline">{favorite ? (locale === 'kh' ? 'ចំណូលចិត្ត' : 'Favorited') : (locale === 'kh' ? 'ចូលចិត្ត' : 'Favorite')}</span>
            </button>
            <SavedToolDataDialog tool={tool} />
          </div>
        </div>
      </div>

      {/* Workspace body */}
      <div className="min-h-[70vh] flex-1 p-3 sm:p-4 lg:min-h-0 lg:overflow-hidden lg:px-8 xl:px-10 2xl:px-16">
        {mounted ? (
          <PanelComponent tool={tool} />
        ) : (
          <div className="flex h-full min-h-[40vh] items-center justify-center" role="status" aria-label="Loading tool">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
