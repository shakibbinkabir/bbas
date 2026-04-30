import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Inter, Noto_Sans_Bengali } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { LOCALE_COOKIE, THEME_COOKIE } from '@/lib/constants';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BBAS — Bangladesh Building Approval System',
  description:
    'Bangladesh Building Approval System — apply for and review building permits online.',
};

// Inline script that runs before React hydrates to apply the saved theme
// and locale class on <html>, preventing a flash of the wrong theme.
const NO_FLASH_SCRIPT = `
(function () {
  try {
    var c = document.cookie || '';
    var theme =
      (c.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/) || [])[1] ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    var locale = (c.match(/(?:^|; )${LOCALE_COOKIE}=(bn|en)/) || [])[1] || 'bn';
    document.documentElement.lang = locale;
    document.documentElement.setAttribute('data-locale', locale);
  } catch (e) {}
})();
`.trim();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value as 'light' | 'dark' | undefined;
  const isDark = themeCookie === 'dark';

  return (
    <html
      lang={locale}
      data-locale={locale}
      className={isDark ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body
        className={`${inter.variable} ${notoSansBengali.variable} ${
          locale === 'bn' ? 'font-bengali' : 'font-sans'
        } antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
