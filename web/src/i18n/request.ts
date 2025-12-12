import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { getLocaleFromHeaders, defaultLocale, type Locale } from './config';

export default getRequestConfig(async () => {
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
