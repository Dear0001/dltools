'use client';
import { useEffect } from 'react';
import { translateText, useLocale } from '@/i18n/LocaleProvider';

/**
 * Translates English UI text to Khmer after render, using the dictionaries in
 * LocaleProvider / khTools. It only replaces text that exactly matches a known
 * string, so user input and tool output are never touched. Code areas,
 * textareas and anything marked data-no-translate are skipped. Switching back
 * to English restores the original text.
 */
const SKIP = 'script,style,textarea,input,pre,code,svg,[data-no-translate],.font-mono-code,.output-code,[contenteditable="true"]';
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;

export default function AutoTranslate() {
  const { locale } = useLocale();

  useEffect(() => {
    if (locale !== 'kh') return;

    const textOriginals = new Map<Text, string>();
    const attrOriginals = new Map<Element, Map<string, string>>();

    const skipped = (el: Element | null) => !el || el.closest(SKIP) !== null;

    const translateTextNode = (node: Text) => {
      const parent = node.parentElement;
      if (skipped(parent)) return;
      const value = node.nodeValue ?? '';
      const trimmed = value.trim();
      if (!trimmed || !/[A-Za-z]/.test(trimmed)) return;
      const translated = translateText(trimmed.replace(/\s+/g, ' '), 'kh');
      if (translated !== trimmed.replace(/\s+/g, ' ')) {
        if (!textOriginals.has(node)) textOriginals.set(node, value);
        node.nodeValue = value.replace(trimmed, translated);
      }
    };

    const translateAttrs = (el: Element) => {
      if (el.closest('[data-no-translate],script,style,pre,code') ) return;
      for (const attr of ATTRS) {
        const value = el.getAttribute(attr);
        if (!value || !/[A-Za-z]/.test(value)) continue;
        const translated = translateText(value.trim(), 'kh');
        if (translated !== value.trim()) {
          let saved = attrOriginals.get(el);
          if (!saved) attrOriginals.set(el, (saved = new Map()));
          if (!saved.has(attr)) saved.set(attr, value);
          el.setAttribute(attr, translated);
        }
      }
    };

    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return translateTextNode(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const el = root as Element;
      if (skipped(el)) return;
      translateAttrs(el);
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      let n = walker.nextNode();
      while (n) {
        if (n.nodeType === Node.TEXT_NODE) translateTextNode(n as Text);
        else translateAttrs(n as Element);
        n = walker.nextNode();
      }
    };

    let queued = false;
    const pending = new Set<Node>();
    const flush = () => {
      queued = false;
      const nodes = [...pending];
      pending.clear();
      nodes.forEach((n) => n.isConnected && walk(n));
      observer.takeRecords(); // ignore the mutations we just made
    };
    const schedule = (n: Node) => {
      pending.add(n);
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(flush);
      }
    };

    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'childList') r.addedNodes.forEach(schedule);
        else if (r.type === 'characterData') schedule(r.target);
        else if (r.type === 'attributes' && r.target instanceof Element) schedule(r.target);
      }
    });

    // Content rendered later on the client is translated as soon as it appears.
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });

    // Text that came from the server is only rewritten once hydration has had
    // time to finish; changing it earlier makes React report a hydration mismatch.
    let initialPass = 0;
    const runInitialPass = () => {
      walk(document.body);
      observer.takeRecords();
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    initialPass = idle
      ? idle(runInitialPass, { timeout: 1500 })
      : window.setTimeout(runInitialPass, 800);

    return () => {
      const cancelIdle = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cancelIdle) cancelIdle(initialPass);
      window.clearTimeout(initialPass);
      observer.disconnect();
      textOriginals.forEach((original, node) => {
        if (node.isConnected) node.nodeValue = original;
      });
      attrOriginals.forEach((saved, el) => {
        saved.forEach((original, attr) => el.isConnected && el.setAttribute(attr, original));
      });
    };
  }, [locale]);

  return null;
}
