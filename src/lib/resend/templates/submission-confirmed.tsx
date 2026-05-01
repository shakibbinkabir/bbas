import { Text } from '@react-email/components';
import { BrandedEmailLayout, type EmailLocale } from './_layout';

interface SubmissionConfirmedEmailProps {
  locale: EmailLocale;
  name: string;
  applicationNumber: string;
  applicationUrl: string;
  authorityName?: string;
}

export function SubmissionConfirmedEmail({
  locale,
  name,
  applicationNumber,
  applicationUrl,
  authorityName,
}: SubmissionConfirmedEmailProps) {
  if (locale === 'bn') {
    return (
      <BrandedEmailLayout
        locale="bn"
        preview={`আপনার আবেদন ${applicationNumber} গৃহীত হয়েছে`}
        greeting={`প্রিয় ${name},`}
        authorityName={authorityName}
        actionLabel="আবেদন দেখুন"
        actionUrl={applicationUrl}
      >
        <Text style={{ margin: '0 0 12px 0' }}>
          আপনার আবেদন <strong>{applicationNumber}</strong> সফলভাবে গৃহীত হয়েছে।
        </Text>
        <Text style={{ margin: '0 0 12px 0' }}>
          আপনার আবেদনটি এখন পর্যালোচনার অপেক্ষায় রয়েছে। প্রতিটি পর্যায়ে অগ্রগতির
          আপডেট আপনাকে ইমেইলের মাধ্যমে জানানো হবে।
        </Text>
        <Text style={{ margin: 0 }}>
          আবেদনের বর্তমান অবস্থা দেখতে নিচের বোতামে ক্লিক করুন।
        </Text>
      </BrandedEmailLayout>
    );
  }

  return (
    <BrandedEmailLayout
      locale="en"
      preview={`Your application ${applicationNumber} has been received`}
      greeting={`Dear ${name},`}
      authorityName={authorityName}
      actionLabel="View Application"
      actionUrl={applicationUrl}
    >
      <Text style={{ margin: '0 0 12px 0' }}>
        Your application <strong>{applicationNumber}</strong> has been received.
      </Text>
      <Text style={{ margin: '0 0 12px 0' }}>
        It is now queued for review. We will email you as your application
        progresses through each stage.
      </Text>
      <Text style={{ margin: 0 }}>
        Tap the button below to track its current status.
      </Text>
    </BrandedEmailLayout>
  );
}

export default SubmissionConfirmedEmail;
