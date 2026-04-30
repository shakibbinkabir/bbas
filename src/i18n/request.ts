import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { defaultLocale, isLocale } from './config';
import { LOCALE_COOKIE } from '@/lib/constants';

async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  const file = path.join(process.cwd(), 'public', 'locales', locale, 'common.json');
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  const messages = await loadMessages(locale);

  return {
    locale,
    messages: messages as Record<string, string>,
    timeZone: 'Asia/Dhaka',
  };
});
