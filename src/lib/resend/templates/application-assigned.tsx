import { Text } from '@react-email/components';
import { BrandedEmailLayout, type EmailLocale } from './_layout';

interface ApplicationAssignedEmailProps {
  locale: EmailLocale;
  name: string;
  applicationNumber: string;
  applicationUrl: string;
  authorityName?: string;
}

export function ApplicationAssignedEmail({
  locale,
  name,
  applicationNumber,
  applicationUrl,
  authorityName,
}: ApplicationAssignedEmailProps) {
  if (locale === 'bn') {
    return (
      <BrandedEmailLayout
        locale="bn"
        preview={`আবেদন ${applicationNumber} আপনাকে নিয়োগ করা হয়েছে`}
        greeting={`প্রিয় ${name},`}
        authorityName={authorityName}
        actionLabel="আবেদন খুলুন"
        actionUrl={applicationUrl}
      >
        <Text style={{ margin: '0 0 12px 0' }}>
          আপনাকে আবেদন <strong>{applicationNumber}</strong> পর্যালোচনার জন্য
          নিয়োগ করা হয়েছে।
        </Text>
        <Text style={{ margin: 0 }}>
          আবেদনের বিস্তারিত দেখতে এবং কাজ শুরু করতে নিচের বোতামে ক্লিক করুন।
        </Text>
      </BrandedEmailLayout>
    );
  }

  return (
    <BrandedEmailLayout
      locale="en"
      preview={`You have been assigned application ${applicationNumber}`}
      greeting={`Dear ${name},`}
      authorityName={authorityName}
      actionLabel="Open Application"
      actionUrl={applicationUrl}
    >
      <Text style={{ margin: '0 0 12px 0' }}>
        You have been assigned application{' '}
        <strong>{applicationNumber}</strong>.
      </Text>
      <Text style={{ margin: 0 }}>
        Tap the button below to review the details and get started.
      </Text>
    </BrandedEmailLayout>
  );
}

export default ApplicationAssignedEmail;
