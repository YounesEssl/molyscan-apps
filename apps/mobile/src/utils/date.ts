import i18n from '@/i18n';

function getDateLocale(): string {
  return i18n.resolvedLanguage?.startsWith('fr') || i18n.language?.startsWith('fr')
    ? 'fr-FR'
    : 'en-US';
}

export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return i18n.t('common.justNow');
  if (diffMins < 60) return i18n.t('common.minutesAgo', { count: diffMins });
  if (diffHours < 24) return i18n.t('common.hoursAgo', { count: diffHours });
  if (diffDays < 7) return i18n.t('common.daysAgo', { count: diffDays });

  return date.toLocaleDateString(getDateLocale(), {
    day: '2-digit',
    month: 'short',
  });
}

export function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(getDateLocale(), {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
