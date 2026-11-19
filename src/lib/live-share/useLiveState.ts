'use client';
import { useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { LiveToolContext } from './toolContext';

export interface Codec<T> {
  encode(value: T): string;
  /** Must not throw; return `fallback` for unusable input. */
  decode(raw: string, fallback: T): T;
}

const stringCodec: Codec<string> = { encode: (v) => v, decode: (raw) => raw };
const numberCodec: Codec<number> = { encode: (v) => String(v), decode: (raw, fallback) => (Number.isFinite(Number(raw)) && raw !== '' ? Number(raw) : fallback) };
const booleanCodec: Codec<boolean> = { encode: (v) => (v ? 'true' : 'false'), decode: (raw, fallback) => (raw === 'true' ? true : raw === 'false' ? false : fallback) };

function defaultCodec<T>(initial: T): Codec<T> {
  switch (typeof initial) {
    case 'number': return numberCodec as unknown as Codec<T>;
    case 'boolean': return booleanCodec as unknown as Codec<T>;
    default: return stringCodec as unknown as Codec<T>;
  }
}

const noop = () => {};

/**
 * Drop-in replacement for `useState` for any state that should be part of the shared Live Share workspace.
 *
 * - Normal / host: behaves exactly like `useState`, and (when a session is active) publishes the value.
 * - Viewer: returns the host's value for `key`; the setter does nothing, so a viewer can never alter shared state.
 *
 * `key` must be declared in the tool's entry in `registry.ts`; undeclared keys are never sent. Strings, numbers
 * and booleans are handled automatically; pass a `codec` for anything else.
 */
export function useLiveState<T>(key: string, initial: T, codec?: Codec<T>): [T, Dispatch<SetStateAction<T>>] {
  const ctx = useContext(LiveToolContext);
  const [local, setLocal] = useState<T>(initial);
  const c = codec ?? defaultCodec(initial);
  const viewer = ctx?.mode === 'viewer';

  const raw = viewer ? ctx.fields[key] : undefined;
  const viewerValue = useMemo(
    // Before the host has sent a value: an empty string for text (never show *our* sample text as the host's), else the default.
    () => (raw === undefined ? (typeof initial === 'string' ? ('' as unknown as T) : initial) : c.decode(raw, initial)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [raw],
  );

  const encoded = viewer ? null : c.encode(local);
  useEffect(() => {
    if (ctx && encoded !== null) ctx.register(key, encoded);
  }, [ctx, key, encoded]);
  useEffect(() => () => ctx?.unregister(key), [ctx, key]);

  const stableNoop = useCallback(noop, []) as Dispatch<SetStateAction<T>>;
  return viewer ? [viewerValue, stableNoop] : [local, setLocal];
}
