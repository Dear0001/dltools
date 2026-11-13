'use client';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { useFavorites } from './favorites';
import { fill, useLocale } from '@/i18n/LocaleProvider';

/** Favourite toggle with the same success/error feedback everywhere (tool page header and tool cards). */
export function useFavoriteAction() {
  const { t } = useLocale();
  const favorites = useFavorites();
  const { isFavorite, toggle } = favorites;

  const toggleWithFeedback = useCallback(
    (id: string, name: string) => {
      const wasFavorite = isFavorite(id);
      if (!toggle(id)) {
        toast.error(t('favoriteSaveFailed'));
        return;
      }
      toast.success(fill(wasFavorite ? t('favoriteRemoved') : t('favoriteAdded'), { name }));
    },
    [isFavorite, toggle, t],
  );

  return { ...favorites, toggleWithFeedback };
}
