export const formatDate = (dateString: string | undefined, lang: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  // Map 'it' to 'it-IT' and 'en' to 'en-US'
  const locale = lang === 'it' ? 'it-IT' : 'en-US';
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};