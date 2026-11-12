'use client';
import React, { useState } from 'react';
import { Copy, Download, Trash2, ArrowLeftRight, CheckCircle2, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';
import { localizeControlContent, translateText, useLocale } from '@/i18n/LocaleProvider';


interface PanelLayoutProps {
  inputPanel: React.ReactNode;
  outputPanel: React.ReactNode;
  inputLabel?: string;
  outputLabel?: string;
  inputActions?: React.ReactNode;
  outputActions?: React.ReactNode;
  outputText?: string;
  onSwap?: () => void;
  onClear?: () => void;
  /** Restores the tool's example input. Shown as a "Sample" button in the input header. */
  onSample?: () => void;
  /** File name used by the download button. */
  downloadName?: string;
  /**
   * Replaces the default text download (e.g. an image or a generated file).
   * The download button is enabled when this is set and `canDownload` is true.
   */
  onDownload?: () => void;
  canDownload?: boolean;
  /** Hide the copy / download buttons for outputs where they make no sense. */
  copyable?: boolean;
  downloadable?: boolean;
  /**
   * `code` (default): the body is an edge-to-edge editor or code view.
   * `content`: a padded, scrollable surface for forms, previews and result lists.
   */
  inputBody?: 'code' | 'content';
  outputBody?: 'code' | 'content';
  outputStatus?: 'idle' | 'success' | 'error';
  errorMessage?: string;
  vertical?: boolean;
}

const BODY_CLASS = {
  code: 'flex flex-1 flex-col overflow-hidden',
  content: 'flex flex-1 flex-col overflow-y-auto p-4 scrollbar-thin',
} as const;

export default function PanelLayout({
  inputPanel,
  outputPanel,
  inputLabel = 'Input',
  outputLabel = 'Output',
  inputActions,
  outputActions,
  outputText,
  onSwap,
  onClear,
  onSample,
  downloadName = 'output.txt',
  onDownload,
  canDownload,
  copyable = true,
  downloadable = true,
  inputBody = 'code',
  outputBody = 'code',
  outputStatus = 'idle',
  errorMessage,
  vertical = false,
}: PanelLayoutProps) {
  const { locale, t } = useLocale();
  const [copied, setCopied] = useState(false);

  const copyOutput = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      toast.success(translateText('Copied to clipboard', locale));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clipboard access was denied.';
      toast.error(locale === 'kh' ? t('copyFailed') : `Could not copy output: ${message}`);
    }
  };

  const downloadEnabled = onDownload ? canDownload ?? true : Boolean(outputText);

  const downloadOutput = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${t('downloaded')}: ${downloadName}`);
  };

  const containerClass = vertical
    ? 'flex flex-col lg:h-full' :'flex flex-col gap-3 lg:gap-0 lg:flex-row lg:h-full';

  const panelClass = vertical
    ? 'flex-1 flex flex-col min-h-[18rem] lg:min-h-0'
    : 'flex-1 flex flex-col min-w-0 min-h-[18rem] lg:min-h-0';

  return (
    <div className={containerClass}>
      {/* Input panel */}
      <div className={panelClass}>
        <div className="panel-header flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="status-dot-idle" />
            <span className="text-xs font-semibold text-muted-foreground">{translateText(inputLabel, locale)}</span>
          </div>
          <div className="flex items-center gap-1">
            {localizeControlContent(inputActions, locale)}
            {onSample && (
              <button type="button" className="btn-icon gap-1 px-2 text-xs font-medium" onClick={onSample} title={t('loadSample')} aria-label={t('loadSample')}>
                <FlaskConical size={13} aria-hidden="true" />
                <span className="hidden sm:inline">{t('sample')}</span>
              </button>
            )}
            {onSwap && (
              <button type="button" className="btn-icon" onClick={onSwap} title={translateText('Swap input and output', locale)} aria-label={translateText('Swap input and output', locale)}>
                <ArrowLeftRight size={14} />
              </button>
            )}
            {onClear && (
              <button type="button" className="btn-icon" onClick={onClear} title={translateText('Clear input', locale)} aria-label={translateText('Clear input', locale)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div className={`${BODY_CLASS[inputBody]} ${inputBody === 'code' ? 'bg-input' : 'bg-card'} border-x border-b border-border rounded-b-[var(--radius)]`}>
          {localizeControlContent(inputPanel, locale)}
        </div>
      </div>

      {/* Divider */}
      <div className={vertical ? 'h-2 flex-shrink-0' : 'w-2 flex-shrink-0 hidden lg:block'} />

      {/* Output panel */}
      <div className={panelClass}>
        <div className="panel-header flex-shrink-0">
          <div className="flex items-center gap-2">
            {outputStatus === 'success' && <span className="status-dot-success" />}
            {outputStatus === 'error' && <span className="status-dot-error" />}
            {outputStatus === 'idle' && <span className="status-dot-idle" />}
            <span className="text-xs font-semibold text-muted-foreground">{translateText(outputLabel, locale)}</span>
            {errorMessage && (
              <span role="alert" className="max-w-[12rem] truncate font-mono text-xs text-error sm:max-w-xs" title={errorMessage}>{errorMessage}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {localizeControlContent(outputActions, locale)}
            {copyable && (
            <button
              type="button"
              className={`btn-icon ${copied ? 'text-primary' : ''}`}
              onClick={copyOutput}
              title={translateText('Copy output', locale)}
              aria-label={translateText('Copy output', locale)}
              disabled={!outputText}
            >
              {copied ? <CheckCircle2 size={14} className="text-success" /> : <Copy size={14} />}
            </button>
            )}
            {downloadable && (
                        <button
              type="button"
              className="btn-icon"
              onClick={downloadOutput}
              title={translateText('Download output', locale)}
              aria-label={translateText('Download output', locale)}
              disabled={!downloadEnabled}
            >
              <Download size={14} />
            </button>
            )}
          </div>
        </div>
        <div className={`${BODY_CLASS[outputBody]} ${outputBody === 'code' ? 'bg-editor' : 'bg-card'} border-x border-b border-border rounded-b-[var(--radius)]`}>
          {localizeControlContent(outputPanel, locale)}
        </div>
      </div>
    </div>
  );
}