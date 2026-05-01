import { Text } from '@react-email/components';
import { BrandedEmailLayout, type EmailLocale } from './_layout';

interface WelcomeOfficerEmailProps {
  locale: EmailLocale;
  name: string;
  authorityName: string;
  loginUrl: string;
}

export function WelcomeOfficerEmail({
  locale,
  name,
  authorityName,
  loginUrl,
}: WelcomeOfficerEmailProps) {
  if (locale === 'bn') {
    return (
      <BrandedEmailLayout
        locale="bn"
        preview="BBAS-এ স্বাগতম"
        greeting={`প্রিয় ${name},`}
        authorityName={authorityName}
        actionLabel="লগ-ইন করুন"
        actionUrl={loginUrl}
      >
        <Text style={{ margin: '0 0 12px 0' }}>
          BBAS-এ স্বাগতম! <strong>{authorityName}</strong>-এর জন্য আপনার অফিসার
          অ্যাকাউন্ট তৈরি করা হয়েছে।
        </Text>
        <Text style={{ margin: '0 0 12px 0' }}>
          লগ-ইন করতে আপনার নিবন্ধিত ফোন নম্বর বা ইমেইল ব্যবহার করুন; OTP-এর
          মাধ্যমে যাচাই করা হবে।
        </Text>
        <Text style={{ margin: 0 }}>শুরু করতে নিচের বোতামে ক্লিক করুন।</Text>
      </BrandedEmailLayout>
    );
  }

  return (
    <BrandedEmailLayout
      locale="en"
      preview="Welcome to BBAS"
      greeting={`Dear ${name},`}
      authorityName={authorityName}
      actionLabel="Log in"
      actionUrl={loginUrl}
    >
      <Text style={{ margin: '0 0 12px 0' }}>
        Welcome to BBAS! Your officer account has been created for{' '}
        <strong>{authorityName}</strong>.
      </Text>
      <Text style={{ margin: '0 0 12px 0' }}>
        Sign in with your registered phone number or email — verification is
        completed via a one-time code.
      </Text>
      <Text style={{ margin: 0 }}>Tap the button below to get started.</Text>
    </BrandedEmailLayout>
  );
}

export default WelcomeOfficerEmail;
