import * as React from 'react';
import {
  Html, Head, Body, Container, Section,
  Text, Heading, Hr, Row, Column, Img
} from '@react-email/components';

interface ContactFormEmailProps {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  submittedAt: string;
}

export function ContactFormEmail({ name, email, phone, subject, message, submittedAt }: ContactFormEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f5f5f7', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px' }}>

          {/* Header */}
          <Section style={{ background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)', borderRadius: '12px 12px 0 0', padding: '32px', textAlign: 'center' }}>
            <Img
              src="https://jackseliquid.co.uk/logo.png"
              alt="Jack's E-Liquid"
              width="140"
              height="52"
              style={{ objectFit: 'contain', margin: '0 auto 16px' }}
            />
            <Heading style={{ color: '#ffffff', fontSize: '22px', margin: '0', fontWeight: 700 }}>
              📬 New Contact Form Submission
            </Heading>
            <Text style={{ color: 'rgba(255,255,255,0.8)', margin: '8px 0 0', fontSize: '14px' }}>
              {submittedAt}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ background: '#ffffff', padding: '32px', borderRadius: '0 0 12px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>

            {/* Sender details */}
            <Section style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
              <Row>
                <Column>
                  <Text style={{ margin: '0 0 8px', fontSize: '12px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</Text>
                  <Text style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: '#111' }}>{name}</Text>
                  <Text style={{ margin: '0 0 4px', fontSize: '14px', color: '#0f766e' }}>
                    ✉️ {email}
                  </Text>
                  {phone && (
                    <Text style={{ margin: '0', fontSize: '14px', color: '#555' }}>
                      📞 {phone}
                    </Text>
                  )}
                </Column>
              </Row>
            </Section>

            {/* Subject */}
            <Text style={{ margin: '0 0 6px', fontSize: '12px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</Text>
            <Text style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 600, color: '#111' }}>{subject}</Text>

            <Hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '0 0 24px' }} />

            {/* Message */}
            <Text style={{ margin: '0 0 6px', fontSize: '12px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</Text>
            <Section style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px' }}>
              <Text style={{ margin: 0, fontSize: '15px', color: '#333', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {message}
              </Text>
            </Section>

            <Hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '24px 0 16px' }} />

            <Text style={{ margin: 0, fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
              💡 Hit <strong>Reply</strong> to respond directly to {name} at {email}
            </Text>
          </Section>

          {/* Footer */}
          <Text style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '16px' }}>
            Jack&apos;s E-Liquid | sales@jackseliquid.co.uk
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
