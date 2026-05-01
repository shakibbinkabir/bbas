import { Text } from '@react-email/components';
import { BrandedEmailLayout, type EmailLocale } from './_layout';

interface StageAdvancedEmailProps {
  locale: EmailLocale;
  name: string;
  applicationNumber: string;
  stageName: string;
  applicationUrl: string;
  authorityName?: string;
}

export function StageAdvancedEmail({
  locale,
  name,
  applicationNumber,
  stageName,
  applicationUrl,
  authorityName,
}: StageAdvancedEmailProps) {
  if (locale === 'bn') {
    return (
      <BrandedEmailLayout
        locale="bn"
        preview={`আপনার আবেদন ${applicationNumber} এখন ${stageName} পর্যায়ে`}
        greeting={`প্রিয় ${name},`}
        authorityName={authorityName}
        actionLabel="আবেদন দেখুন"
        actionUrl={applicationUrl}
      >
        <Text style={{ margin: '0 0 12px 0' }}>
          আপনার আবেদন <strong>{applicationNumber}</strong> পরবর্তী পর্যায়ে চলে গেছে:
          <strong> {stageName}</strong>।
        </Text>
        <Text style={{ margin: 0 }}>
          সর্বশেষ অবস্থা ও পর্যালোচনার মন্তব্য দেখতে আবেদনের পৃষ্ঠা পরিদর্শন করুন।
        </Text>
      </BrandedEmailLayout>
    );
  }

  return (
    <BrandedEmailLayout
      locale="en"
      preview={`Application ${applicationNumber} moved to ${stageName}`}
      greeting={`Dear ${name},`}
      authorityName={authorityName}
      actionLabel="View Application"
      actionUrl={applicationUrl}
    >
      <Text style={{ margin: '0 0 12px 0' }}>
        Your application <strong>{applicationNumber}</strong> has moved to{' '}
        <strong>{stageName}</strong>.
      </Text>
      <Text style={{ margin: 0 }}>
        Visit your application page to see the latest status and reviewer
        comments.
      </Text>
    </BrandedEmailLayout>
  );
}

export default StageAdvancedEmail;
