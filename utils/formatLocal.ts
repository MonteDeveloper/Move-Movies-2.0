export const getLanguageName = (code: string | undefined, locale: string): string => {
  if (!code) return '';
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'language' });
    return displayNames.of(code) || code;
  } catch (e) {
    return code;
  }
};

export const getCountryName = (code: string | undefined, locale: string): string => {
  if (!code) return '';
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
    return displayNames.of(code) || code;
  } catch (e) {
    return code;
  }
};