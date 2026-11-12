'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  CircleUserRound,
  Heart,
  HandCoins,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import AppLogo from '@/components/ui/AppLogo';
import ThemeSwitcher, { ThemeOptions } from '@/components/ui/ThemeSwitcher';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import CategoryIcon from '@/components/ui/CategoryIcon';
import SearchDialog from '@/components/search/SearchDialog';
import { useTheme } from '@/components/ThemeProvider';
import { normalizeTheme, type ThemeId } from '@/lib/theme';
import { CATEGORIES, CATEGORY_COUNTS, getToolPath, getToolsByCategory } from '@/data/tools';
import {
  getCategoryDescription,
  getCategoryName,
  getToolName,
  useLocale,
  type Locale,
} from '@/i18n/LocaleProvider';

/** Closes a popover on outside pointer-down or Escape, returning focus to its trigger. */
function useDismiss(
  open: boolean,
  close: () => void,
  container: React.RefObject<HTMLElement | null>,
  trigger?: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        trigger?.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, container, trigger]);
}

export default function Topbar() {
  const pathname = usePathname() ?? '/';
  const { data: session, status: authStatus } = useSession();
  const { locale, setLocale, t } = useLocale();
  const { setTheme } = useTheme();
  const kh = locale === 'kh';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileCategory, setMobileCategory] = useState<string | null>(null);
  const [preferencesLoadedFor, setPreferencesLoadedFor] = useState<string | null>(null);

  const categoriesRef = useRef<HTMLDivElement>(null);
  const categoriesTrigger = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileTrigger = useRef<HTMLButtonElement>(null);
  const supportClose = useRef<HTMLButtonElement>(null);

  const closeCategories = useCallback(() => setCategoriesOpen(false), []);

  // Desktop mouse users get the Categories menu on hover. A short close delay lets the
  // pointer travel from the button into the menu without it flickering shut. Touch and
  // keyboard users still open it by tapping/pressing the button.
  const hoverTimer = useRef<number | undefined>(undefined);
  const openedByHover = useRef(false);
  const onCategoriesEnter = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(hoverTimer.current);
    if (!categoriesOpen) openedByHover.current = true;
    setCategoriesOpen(true);
  };
  const onCategoriesLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      openedByHover.current = false;
      setCategoriesOpen(false);
    }, 150);
  };
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  useDismiss(categoriesOpen, closeCategories, categoriesRef, categoriesTrigger);
  useDismiss(profileOpen, closeProfile, profileRef, profileTrigger);

  // Close every menu after navigating.
  useEffect(() => {
    setMobileOpen(false);
    setCategoriesOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  // Ctrl/⌘ K opens search anywhere; "/" opens it outside the homepage (which has its own search box).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === '/' && !typing && pathname !== '/') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathname]);

  // Lock page scroll while the mobile drawer or support dialog is open.
  useEffect(() => {
    if (!mobileOpen && !supportOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setSupportOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen, supportOpen]);

  useEffect(() => {
    if (supportOpen) requestAnimationFrame(() => supportClose.current?.focus());
  }, [supportOpen]);

  // Load the signed-in user's saved theme and language.
  useEffect(() => {
    const userId = session?.user?.id;
    if (authStatus !== 'authenticated' || !userId) return;

    let active = true;
    fetch('/api/user/preferences')
      .then(async (response) => {
        const result = (await response.json()) as {
          theme?: string;
          locale?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error ?? 'load-failed');
        return result;
      })
      .then((preferences) => {
        if (!active) return;
        const savedTheme = normalizeTheme(preferences.theme);
        if (savedTheme) setTheme(savedTheme);
        if (preferences.locale === 'en' || preferences.locale === 'kh')
          setLocale(preferences.locale);
        setPreferencesLoadedFor(userId);
      })
      .catch(() => {
        if (active) toast.error(t('loadPrefsFailed'));
      });

    return () => {
      active = false;
    };
    // `t` changes with the locale; reloading preferences on every language switch is not wanted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, session?.user?.id, setLocale, setTheme]);

  const savePreference = async (preference: { theme?: ThemeId; locale?: Locale }) => {
    if (
      authStatus !== 'authenticated' ||
      !session?.user?.id ||
      preferencesLoadedFor !== session.user.id
    )
      return;
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preference),
      });
      if (!response.ok) throw new Error('sync-failed');
    } catch {
      toast.error(t('syncPrefsFailed'));
    }
  };

  const onThemeChange = (next: ThemeId) => void savePreference({ theme: next });
  const onLocaleChange = (next: Locale) => void savePreference({ locale: next });

  const userName = session?.user?.name?.trim() || session?.user?.email || t('account');
  const userInitial = userName.charAt(0).toLocaleUpperCase();
  const signedIn = authStatus === 'authenticated';

  const isActive = (href: string) =>
    href === '/tool-workspace'
      ? pathname.startsWith('/tool-workspace') || pathname.startsWith('/favorites')
      : pathname === href;
  const categoriesActive = pathname.startsWith('/tools/');

  const navLink = (active: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      active
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  const avatar = (sizeClass: string, textClass: string) =>
    signedIn && session?.user?.image ? (
      <Image
        src={session.user.image}
        alt=""
        width={40}
        height={40}
        unoptimized
        className={`${sizeClass} rounded-full object-cover`}
      />
    ) : signedIn ? (
      <span
        className={`flex ${sizeClass} items-center justify-center rounded-full bg-primary/15 font-semibold text-primary ${textClass}`}
      >
        {userInitial}
      </span>
    ) : (
      <span
        className={`flex ${sizeClass} items-center justify-center rounded-full bg-muted text-muted-foreground`}
      >
        <CircleUserRound size={20} strokeWidth={1.7} aria-hidden="true" />
      </span>
    );

  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        {t('skipToContent')}
      </a>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="page-container flex h-16 items-center gap-3">
          {/* Brand */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`DLTools — ${t('navHome')}`}
          >
            <AppLogo size={32} className="overflow-hidden rounded-lg border border-border" />
            <span className="text-base font-semibold tracking-tight text-foreground">DLTools</span>
          </Link>

          {/* Desktop navigation */}
          <nav aria-label={t('mainNavigation')} className="ml-4 hidden items-center gap-1 md:flex">
            <Link
              href="/tools"
              className={navLink(isActive('/tools'))}
              aria-current={isActive('/tools') ? 'page' : undefined}
            >
              {t('navAllTools')}
            </Link>
            <div
              ref={categoriesRef}
              className="relative"
              onPointerEnter={onCategoriesEnter}
              onPointerLeave={onCategoriesLeave}
            >
              <button
                ref={categoriesTrigger}
                type="button"
                className={navLink(categoriesOpen || categoriesActive)}
                aria-expanded={categoriesOpen}
                aria-controls="nav-categories-menu"
                onClick={() => {
                  // A click right after hover-opening keeps the menu open instead of toggling it shut.
                  if (openedByHover.current) {
                    openedByHover.current = false;
                    return;
                  }
                  setCategoriesOpen((open) => !open);
                }}
              >
                {t('navCategories')}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${categoriesOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {categoriesOpen && (
                // pt-2 (not mt-2) keeps the gap under the button inside the hover area.
                <div
                  id="nav-categories-menu"
                  className="absolute left-0 top-full z-[60] w-[min(92vw,44rem)] pt-2"
                >
                  <div className="rounded-2xl border border-border bg-card p-3 shadow-popover fade-in">
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {CATEGORIES.map((category) => (
                        <li key={category.id}>
                          <Link
                            href={`/tools?cat=${category.id}`}
                            onClick={closeCategories}
                            className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                              <CategoryIcon name={category.icon} size={17} />
                            </span>
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
                                {getCategoryName(category.id, category.label, locale)}
                                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                                  {CATEGORY_COUNTS[category.id]}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                                {getCategoryDescription(category.id, category.description, locale)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center justify-between border-t border-border px-2.5 pt-3">
                      <span className="text-xs text-muted-foreground">{t('brandTagline')}</span>
                      <Link
                        href="/tools"
                        onClick={closeCategories}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {t('viewAllTools')} →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/tool-workspace"
              className={navLink(isActive('/tool-workspace'))}
              aria-current={isActive('/tool-workspace') ? 'page' : undefined}
            >
              {t('navWorkspace')}
            </Link>
          </nav>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex xl:w-64"
              aria-label={t('searchDialogTitle')}
            >
              <Search size={15} aria-hidden="true" />
              <span className="flex-1 truncate text-left">{t('searchTools')}</span>
              <kbd className="kbd">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="btn-icon lg:hidden"
              aria-label={t('searchDialogTitle')}
            >
              <Search size={18} aria-hidden="true" />
            </button>

            <LanguageSwitcher onChange={onLocaleChange} className="hidden sm:inline-flex" />
            <ThemeSwitcher onChange={onThemeChange} className="hidden sm:inline-flex" />

            <div ref={profileRef} className="relative hidden md:block">
              <button
                ref={profileTrigger}
                type="button"
                className="flex h-9 items-center gap-1 rounded-full border border-border bg-card p-0.5 pr-2 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label={t('accountMenu')}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                {avatar('h-7 w-7', 'text-xs')}
                <ChevronDown
                  size={14}
                  className={`text-muted-foreground transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 top-full z-[70] mt-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-popover fade-in"
                  role="menu"
                  aria-label={t('accountMenu')}
                >
                  <div className="flex items-center gap-3 px-2.5 py-2.5">
                    {avatar('h-10 w-10', 'text-sm')}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {signedIn ? userName : t('guestProfile')}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {signedIn
                          ? (session?.user?.email ?? t('signedInGoogle'))
                          : authStatus === 'loading'
                            ? t('checkingSignIn')
                            : t('signInToSync')}
                      </p>
                    </div>
                  </div>
                  <div className="my-1 border-t border-border" />
                  <Link
                    href="/tool-workspace"
                    role="menuitem"
                    onClick={closeProfile}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <LayoutGrid size={15} className="text-muted-foreground" aria-hidden="true" />{' '}
                    {t('navWorkspace')}
                  </Link>
                  <Link
                    href="/favorites"
                    role="menuitem"
                    onClick={closeProfile}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    <Heart size={15} className="text-muted-foreground" aria-hidden="true" />{' '}
                    {t('favorites')}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeProfile();
                      setSupportOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
                  >
                    <HandCoins size={15} className="text-muted-foreground" aria-hidden="true" />{' '}
                    {t('supportProject')}
                  </button>
                  <div className="my-1 border-t border-border" />
                  <p className="px-2.5 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">
                    {t('theme')}
                  </p>
                  <ThemeOptions onChange={onThemeChange} />
                  <div className="my-1 border-t border-border" />
                  {signedIn ? (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground hover:bg-error/10 hover:text-error"
                      onClick={() => {
                        closeProfile();
                        void signOut({ callbackUrl: '/' });
                      }}
                    >
                      <LogOut size={15} aria-hidden="true" /> {t('signOut')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      disabled={authStatus === 'loading'}
                      className="btn-primary mt-1 w-full"
                      onClick={() => {
                        closeProfile();
                        void signIn('google');
                      }}
                    >
                      <LogIn size={15} aria-hidden="true" /> {t('signInGoogle')}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-icon md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? t('close') : t('menu')}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="mobile-navigation"
            aria-label={t('mainNavigation')}
            className="absolute inset-x-0 top-0 max-h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden border-b border-border bg-card px-4 pb-6 pt-3 fade-in"
          >
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setSearchOpen(true);
              }}
              className="mb-3 flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground"
            >
              <Search size={16} aria-hidden="true" /> {t('searchTools')}
            </button>
            <ul className="grid grid-cols-1 gap-1">
              {[
                { href: '/', label: t('navHome') },
                { href: '/tools', label: t('navAllTools') },
                { href: '/tool-workspace', label: t('navWorkspace') },
                { href: '/favorites', label: t('favorites') },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={pathname === link.href ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === link.href ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mb-1 mt-4 px-3 text-xs font-semibold text-muted-foreground">
              {t('navCategories')}
            </p>
            <ul className="grid grid-cols-1 gap-0.5">
              {CATEGORIES.map((category) => {
                const open = mobileCategory === category.id;
                return (
                  <li key={category.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                      aria-expanded={open}
                      onClick={() => setMobileCategory(open ? null : category.id)}
                    >
                      <CategoryIcon name={category.icon} size={16} className="text-primary" />
                      <span className="flex-1">
                        {getCategoryName(category.id, category.label, locale)}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {CATEGORY_COUNTS[category.id]}
                      </span>
                      <ChevronDown
                        size={15}
                        className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                    {open && (
                      <ul className="mb-2 ml-6 grid grid-cols-1 gap-0.5 border-l border-border pl-3">
                        {getToolsByCategory(category.id).map((tool) => (
                          <li key={tool.id}>
                            <Link
                              href={getToolPath(tool)}
                              className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              {getToolName(tool.id, tool.name, locale)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3 px-1">
                <span className="text-sm font-medium text-foreground">{t('language')}</span>
                <LanguageSwitcher onChange={onLocaleChange} />
              </div>
              <div>
                <p className="mb-1 px-1 text-sm font-medium text-foreground">{t('theme')}</p>
                <ThemeOptions onChange={onThemeChange} />
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-center gap-3">
                  {avatar('h-10 w-10', 'text-sm')}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {signedIn ? userName : t('guestProfile')}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {signedIn ? (session?.user?.email ?? t('signedInGoogle')) : t('signInToSync')}
                    </p>
                  </div>
                </div>
                {signedIn ? (
                  <button
                    type="button"
                    className="btn-ghost mt-3 w-full"
                    onClick={() => void signOut({ callbackUrl: '/' })}
                  >
                    <LogOut size={15} aria-hidden="true" /> {t('signOut')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary mt-3 w-full"
                    disabled={authStatus === 'loading'}
                    onClick={() => void signIn('google')}
                  >
                    <LogIn size={15} aria-hidden="true" /> {t('signInGoogle')}
                  </button>
                )}
              </div>
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => {
                  setMobileOpen(false);
                  setSupportOpen(true);
                }}
              >
                <HandCoins size={15} aria-hidden="true" /> {t('supportProject')}
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Support dialog */}
      {supportOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay p-4 fade-in"
          onMouseDown={() => setSupportOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-modal-title"
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card shadow-popover slide-up"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-error/10 text-error"
                  aria-hidden="true"
                >
                  <Heart size={18} />
                </span>
                <h2 id="support-modal-title" className="text-base font-semibold text-foreground">
                  {t('supportProject')}
                </h2>
              </div>
              <button
                ref={supportClose}
                type="button"
                className="btn-icon"
                onClick={() => setSupportOpen(false)}
                aria-label={t('close')}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="px-5 py-6 sm:px-8">
              <p className="text-center text-lg font-semibold text-foreground">
                {t('supportTitle')}
              </p>
              <p
                className={`mx-auto mt-2 max-w-sm text-center text-sm text-muted-foreground ${kh ? 'leading-7' : 'leading-6'}`}
              >
                {t('supportMessage')}
              </p>
              <div className="mx-auto mt-6 w-full max-w-[280px] rounded-2xl border border-border bg-white p-2">
                <Image
                  src="/assets/images/qr-code.jpg"
                  alt={t('supportQrAlt')}
                  width={300}
                  height={300}
                  className="h-auto w-full rounded-xl object-contain"
                />
              </div>
              <p className="mt-5 text-center text-sm font-medium text-foreground">
                {t('supportCta')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
