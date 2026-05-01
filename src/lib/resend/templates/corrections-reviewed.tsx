import { Text } from '@react-email/components';
import { BrandedEmailLayout, type EmailLocale } from './_layout';

interface CorrectionsReviewedEmailProps {
  locale: EmailLocale;
  name: string;
  applicationNumber: string;
  applicationUrl: string;
  authorityName?: string;
}

export function CorrectionsReviewedEmail({
  locale,
  name,
  applicationNumber,
  applicationUrl,
  authorityName,
}: CorrectionsReviewedEmailProps) {
  if (locale === 'bn') {
    return (
      <BrandedEmailLayout
        locale="bn"
        preview={`আবেদন ${applicationNumber}-এর সংশোধন জমা হয়েছে`}
        greeting={`প্রিয় ${name},`}
        authorityName={authorityName}
        actionLabel="আবেদনটি পর্যালোচনা করুন"
        actionUrl={applicationUrl}
      >
        <Text style={{ margin: '0 0 12px 0' }}>
          আবেদনকারী আবেদন <strong>{applicationNumber}</strong>-এর জন্য সংশোধনসহ
          জবাব দিয়েছেন।
        </Text>
        <Text style={{ margin: 0 }}>
          জমাকৃত সংশোধন পর্যালোচনা করতে আবেদনটি খুলুন।
        </Text>
      </BrandedEmailLayout>
    );
  }

  return (
    <BrandedEmailLayout
      locale="en"
      preview={`Corrections submitted for ${applicationNumber}`}
      greeting={`Dear ${name},`}
      authorityName={authorityName}
      actionLabel="Review Application"
      actionUrl={applicationUrl}
    >
      <Text style={{ margin: '0 0 12px 0' }}>
        The applicant has responded with corrections for application{' '}
        <strong>{applicationNumber}</strong>.
      </Text>
      <Text style={{ margin: 0 }}>
        Open the application to review the submitted corrections.
      </Text>
    </BrandedEmailLayout>
  );
}

export default CorrectionsReviewedEmail;
