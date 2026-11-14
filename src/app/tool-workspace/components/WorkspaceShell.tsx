'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Tool } from '@/data/tools';
import { Check, Globe2, Heart, Link2, Share2, ShieldCheck } from 'lucide-react';
import { getToolPrivacyMode } from '@/data/toolPrivacy';
import { Breadcrumbs } from '@/components/PageHeader';
import ToolIcon from '@/components/ui/ToolIcon';
import { useFavoriteAction } from '@/lib/useFavoriteAction';
import ActionButton from '@/components/ui/ActionButton';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { CATEGORIES } from '@/data/tools';
import { trackToolOpen } from '@/components/GoogleAnalytics';
import SavedToolDataDialog from './SavedToolDataDialog';
import DocumentConverterPanel from './tools/DocumentConverterPanel';
import { getCategoryName, getToolDescription, getToolName, translateText, useLocale } from '@/i18n/LocaleProvider';

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
import Base64DocumentPanel from './tools/Base64DocumentPanel';
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
  'tool-base64-document': Base64DocumentPanel,
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
  const { isFavorite, toggleWithFeedback } = useFavoriteAction();
  const favorite = isFavorite(tool.id);
  const toolName = getToolName(tool.id, tool.name, locale);
  const PanelComponent = PANEL_MAP[tool.id] || GenericComingSoon;
  // Tool panels use browser-only APIs (DOMParser, window, localStorage), so render them after mount.
  const [mounted, setMounted] = useState(false);
  // Share only appears where the browser has a native share sheet (mostly mobile).
  const [canShare, setCanShare] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  useEffect(() => {
    setMounted(true);
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);
  useEffect(() => {
    if (!linkCopied) return;
    const timer = window.setTimeout(() => setLinkCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [linkCopied]);

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
      toast.error(translateText('Could not save recent tools on this device.', locale));
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
      toast.error(translateText(error instanceof Error ? error.message : 'Could not sync this recent tool.', locale));
    });
    // `locale` only localizes the error toast; re-saving on a language switch is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      toast.success(t('linkCopied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: toolName, text: description, url: window.location.href });
    } catch (error) {
      // Closing the share sheet is not an error.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error(t('shareFailed'));
    }
  };
  const privacyMode = getToolPrivacyMode(tool.id);

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-4rem)]">
      {/* Workspace header: breadcrumb, title, description, actions */}
      <div className="flex-shrink-0 border-b border-border bg-background-secondary">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            className="mb-3"
            items={[
              { label: t('navAllTools'), href: '/tools' },
              { label: category ? getCategoryName(category.id, category.label, locale) : tool.category, href: `/tools?cat=${tool.category}` },
              { label: toolName },
            ]}
          />
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <ToolIcon tool={tool} size="lg" className="hidden sm:inline-flex" />
              <div className="min-w-0">
                <h1 className={`text-xl font-semibold text-foreground sm:text-2xl ${locale === 'kh' ? 'leading-8 sm:leading-9' : 'tracking-tight'}`}>{toolName}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
                <p className="mt-2 flex max-w-3xl items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  {privacyMode === 'local'
                    ? <ShieldCheck size={13} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                    : <Globe2 size={13} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />}
                  <span>
                    <span className="font-medium text-foreground">{privacyMode === 'local' ? t('runsLocally') : t('sendsRequests')}</span>
                    {' · '}
                    {privacyMode === 'local' ? t('privacyLocalHelp') : t('privacyNetworkHelp')}
                  </span>
                </p>
              </div>
            </div>
            <div role="group" aria-label={t('toolActions')} className="flex shrink-0 flex-wrap items-center gap-2">
              <ActionButton
                icon={Link2}
                successIcon={Check}
                showSuccess={linkCopied}
                label={linkCopied ? t('linkCopied') : t('copyLink')}
                tooltip={t('copyLinkTip')}
                onClick={() => void copyLink()}
              />
              {canShare && (
                <ActionButton icon={Share2} label={t('share')} tooltip={t('shareTip')} onClick={() => void share()} />
              )}
              <ActionButton
                icon={Heart}
                iconClassName={favorite ? 'fill-primary text-primary' : ''}
                label={t('favorite')}
                tooltip={favorite ? t('favoriteRemoveTip') : t('favoriteAddTip')}
                aria-pressed={favorite}
                onClick={() => toggleWithFeedback(tool.id, toolName)}
              />
              <SavedToolDataDialog tool={tool} />
            </div>
          </div>
        </div>
      </div>

      {/* Workspace body */}
      <div className="min-h-[70vh] flex-1 px-4 py-4 sm:px-6 lg:min-h-0 lg:overflow-hidden lg:px-8">
        {mounted ? (
          <PanelComponent tool={tool} />
        ) : (
          <div className="flex h-full min-h-[40vh] items-center justify-center" role="status" aria-label={t('loadingTool')}>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
