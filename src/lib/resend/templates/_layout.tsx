import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

export type EmailLocale = 'bn' | 'en';

interface BrandedEmailLayoutProps {
  locale: EmailLocale;
  preview: string;
  greeting: string;
  authorityName?: string;
  children: ReactNode;
  actionLabel?: string;
  actionUrl?: string;
}

const colors = {
  brand: '#15803d',
  brandDark: '#166534',
  text: '#0f172a',
  muted: '#64748b',
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
};

const FONT_STACK =
  "'Hind Siliguri', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export function BrandedEmailLayout({
  locale,
  preview,
  greeting,
  authorityName,
  children,
  actionLabel,
  actionUrl,
}: BrandedEmailLayoutProps) {
  const footerLine =
    locale === 'bn'
      ? 'এটি BBAS থেকে স্বয়ংক্রিয়ভাবে পাঠানো একটি বার্তা।'
      : 'This is an automated message from BBAS.';

  const authorityFooter =
    authorityName ??
    (locale === 'bn'
      ? 'বাংলাদেশ ভবন অনুমোদন কর্তৃপক্ষ'
      : 'Bangladesh Building Approval Authority');

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          fontFamily: FONT_STACK,
          margin: 0,
          padding: 0,
          color: colors.text,
        }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            padding: '24px 16px',
          }}
        >
          {/* Brand bar */}
          <Section
            style={{
              backgroundColor: colors.brand,
              borderRadius: '8px 8px 0 0',
              padding: '20px 24px',
            }}
          >
            <Text
              style={{
                color: '#ffffff',
                fontSize: '22px',
                fontWeight: 700,
                margin: 0,
                letterSpacing: '0.5px',
              }}
            >
              BBAS
            </Text>
            <Text
              style={{
                color: '#dcfce7',
                fontSize: '12px',
                margin: '2px 0 0 0',
              }}
            >
              {locale === 'bn'
                ? 'বাংলাদেশ ভবন অনুমোদন সিস্টেম'
                : 'Bangladesh Building Approval System'}
            </Text>
          </Section>

          {/* Card */}
          <Section
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              padding: '24px',
            }}
          >
            <Text
              style={{
                fontSize: '16px',
                fontWeight: 600,
                margin: '0 0 12px 0',
              }}
            >
              {greeting}
            </Text>

            <Section style={{ fontSize: '14px', lineHeight: '22px' }}>
              {children}
            </Section>

            {actionLabel && actionUrl ? (
              <Section style={{ textAlign: 'center', margin: '28px 0 8px 0' }}>
                <Button
                  href={actionUrl}
                  style={{
                    backgroundColor: colors.brand,
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  {actionLabel}
                </Button>
              </Section>
            ) : null}

            <Hr style={{ borderColor: colors.border, margin: '24px 0 16px 0' }} />

            <Text
              style={{
                fontSize: '12px',
                color: colors.muted,
                margin: 0,
                lineHeight: '18px',
              }}
            >
              {authorityFooter}
              <br />
              {footerLine}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const emailColors = colors;
