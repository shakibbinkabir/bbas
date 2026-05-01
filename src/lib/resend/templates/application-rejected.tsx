import { Section, Text } from '@react-email/components';
import { BrandedEmailLayout, emailColors, type EmailLocale } from './_layout';

interface ApplicationRejectedEmailProps {
  locale: EmailLocale;
  name: string;
  applicationNumber: string;
  reason: string;
  applicationUrl: string;
  authorityName?: string;
}

export function ApplicationRejectedEmail({
  locale,
  name,
  applicationNumber,
  reason,
  applicationUrl,
  authorityName,
}: ApplicationRejectedEmailProps) {
  if (locale === 'bn') {
    return (
      <BrandedEmailLayout
        locale="bn"
        preview={`আবেদন ${applicationNumber}-এর সিদ্ধান্ত`}
        greeting={`প্রিয় ${name},`}
        authorityName={authorityName}
        actionLabel="বিস্তারিত দেখুন"
        actionUrl={applicationUrl}
      >
        <Text style={{ margin: '0 0 12px 0' }}>
          আপনার আবেদন <strong>{applicationNumber}</strong> অনুমোদিত হয়নি।
        </Text>
        <Text style={{ margin: '0 0 8px 0' }}>প্রত্যাখ্যানের কারণ:</Text>
        <Section
          style={{
            backgroundColor: '#fee2e2',
            border: `1px solid #fecaca`,
            borderLeft: `4px solid #dc2626`,
            padding: '12px 14px',
            borderRadius: '4px',
            margin: '0 0 16px 0',
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#7f1d1d',
              whiteSpace: 'pre-wrap',
            }}
          >
            {reason}
          </Text>
        </Section>
        <Text style={{ margin: 0, color: emailColors.muted, fontSize: '13px' }}>
          সম্পূর্ণ বিবরণ এবং সম্ভাব্য পরবর্তী পদক্ষেপ আবেদনের পৃষ্ঠায় পাবেন।
        </Text>
      </BrandedEmailLayout>
    );
  }

  return (
    <BrandedEmailLayout
      locale="en"
      preview={`Update on application ${applicationNumber}`}
      greeting={`Dear ${name},`}
      authorityName={authorityName}
      actionLabel="View Details"
      actionUrl={applicationUrl}
    >
      <Text style={{ margin: '0 0 12px 0' }}>
        Update on application <strong>{applicationNumber}</strong>: it has not
        been approved.
      </Text>
      <Text style={{ margin: '0 0 8px 0' }}>Reason:</Text>
      <Section
        style={{
          backgroundColor: '#fee2e2',
          border: `1px solid #fecaca`,
          borderLeft: `4px solid #dc2626`,
          padding: '12px 14px',
          borderRadius: '4px',
          margin: '0 0 16px 0',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#7f1d1d',
            whiteSpace: 'pre-wrap',
          }}
        >
          {reason}
        </Text>
      </Section>
      <Text style={{ margin: 0, color: emailColors.muted, fontSize: '13px' }}>
        Full details and possible next steps are available on the application
        page.
      </Text>
    </BrandedEmailLayout>
  );
}

export default ApplicationRejectedEmail;
