import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';
import { getLocaleFromHeaders, defaultLocale, locales, LOCALE_COOKIE_NAME, type Locale } from './config';

export default getRequestConfig(async () => {
  // First check for cookie preference
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (localeCookie && locales.includes(localeCookie as Locale)) {
    return {
      locale: localeCookie as Locale,
      messages: (await import(`../../messages/${localeCookie}.json`)).default
    };
  }

  // Fall back to Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const locale = getLocaleFromHeaders(acceptLanguage);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});

export async function getMessages(locale?: Locale) {
  const targetLocale = locale || defaultLocale;
  return (await import(`../../messages/${targetLocale}.json`)).default;
}
