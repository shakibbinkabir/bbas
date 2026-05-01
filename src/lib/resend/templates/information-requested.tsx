import { Section, Text } from '@react-email/components';
import { BrandedEmailLayout, emailColors, type EmailLocale } from './_layout';

interface InformationRequestedEmailProps {
  locale: EmailLocale;
  name: string;
  applicationNumber: string;
  comment: string;
  applicationUrl: string;
  authorityName?: string;
}

export function InformationRequestedEmail({
  locale,
  name,
  applicationNumber,
  comment,
  applicationUrl,
  authorityName,
}: InformationRequestedEmailProps) {
  if (locale === 'bn') {
    return (
      <BrandedEmailLayout
        locale="bn"
        preview={`আবেদন ${applicationNumber}-এ সংশোধন প্রয়োজন`}
        greeting={`প্রিয় ${name},`}
        authorityName={authorityName}
        actionLabel="পর্যালোচনা ও জবাব দিন"
        actionUrl={applicationUrl}
      >
        <Text style={{ margin: '0 0 12px 0' }}>
          <strong>পদক্ষেপ প্রয়োজন:</strong> আপনার আবেদন{' '}
          <strong>{applicationNumber}</strong>-এ কিছু সংশোধন প্রয়োজন।
        </Text>
        <Text style={{ margin: '0 0 8px 0' }}>কর্মকর্তার মন্তব্য:</Text>
        <Section
          style={{
            backgroundColor: '#fef3c7',
            border: `1px solid #fde68a`,
            borderLeft: `4px solid #f59e0b`,
            padding: '12px 14px',
            borderRadius: '4px',
            margin: '0 0 16px 0',
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#78350f',
              whiteSpace: 'pre-wrap',
            }}
          >
            {comment}
          </Text>
        </Section>
        <Text style={{ margin: 0, color: emailColors.muted, fontSize: '13px' }}>
          সংশোধন করতে অনুগ্রহ করে লগ-ইন করে আবেদনটি পর্যালোচনা করুন।
        </Text>
      </BrandedEmailLayout>
    );
  }

  return (
    <BrandedEmailLayout
      locale="en"
      preview={`Action required on application ${applicationNumber}`}
      greeting={`Dear ${name},`}
      authorityName={authorityName}
      actionLabel="Review & Respond"
      actionUrl={applicationUrl}
    >
      <Text style={{ margin: '0 0 12px 0' }}>
        <strong>Action required:</strong> Your application{' '}
        <strong>{applicationNumber}</strong> needs corrections.
      </Text>
      <Text style={{ margin: '0 0 8px 0' }}>Officer&apos;s comment:</Text>
      <Section
        style={{
          backgroundColor: '#fef3c7',
          border: `1px solid #fde68a`,
          borderLeft: `4px solid #f59e0b`,
          padding: '12px 14px',
          borderRadius: '4px',
          margin: '0 0 16px 0',
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#78350f',
            whiteSpace: 'pre-wrap',
          }}
        >
          {comment}
        </Text>
      </Section>
      <Text style={{ margin: 0, color: emailColors.muted, fontSize: '13px' }}>
        Please log in to review and respond.
      </Text>
    </BrandedEmailLayout>
  );
}

export default InformationRequestedEmail;
