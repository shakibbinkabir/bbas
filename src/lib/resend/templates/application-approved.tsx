import { Text } from '@react-email/components';
import { BrandedEmailLayout, type EmailLocale } from './_layout';

interface ApplicationApprovedEmailProps {
  locale: EmailLocale;
  name: string;
  applicationNumber: string;
  applicationUrl: string;
  authorityName?: string;
}

export function ApplicationApprovedEmail({
  locale,
  name,
  applicationNumber,
  applicationUrl,
  authorityName,
}: ApplicationApprovedEmailProps) {
  if (locale === 'bn') {
    return (
      <BrandedEmailLayout
        locale="bn"
        preview={`অভিনন্দন! আবেদন ${applicationNumber} অনুমোদিত হয়েছে`}
        greeting={`প্রিয় ${name},`}
        authorityName={authorityName}
        actionLabel="অনুমোদনপত্র দেখুন"
        actionUrl={applicationUrl}
      >
        <Text style={{ margin: '0 0 12px 0' }}>
          <strong>অভিনন্দন!</strong> আপনার আবেদন{' '}
          <strong>{applicationNumber}</strong> অনুমোদিত হয়েছে।
        </Text>
        <Text style={{ margin: 0 }}>
          অনুমোদনপত্র ডাউনলোড করতে এবং পরবর্তী ধাপ সম্পর্কে জানতে অনুগ্রহ করে
          নিচের বোতামে ক্লিক করুন।
        </Text>
      </BrandedEmailLayout>
    );
  }

  return (
    <BrandedEmailLayout
      locale="en"
      preview={`Congratulations! Application ${applicationNumber} approved`}
      greeting={`Dear ${name},`}
      authorityName={authorityName}
      actionLabel="View Approval"
      actionUrl={applicationUrl}
    >
      <Text style={{ margin: '0 0 12px 0' }}>
        <strong>Congratulations!</strong> Your application{' '}
        <strong>{applicationNumber}</strong> has been approved.
      </Text>
      <Text style={{ margin: 0 }}>
        Tap the button below to download your approval letter and review the
        next steps.
      </Text>
    </BrandedEmailLayout>
  );
}

export default ApplicationApprovedEmail;
