import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Img,
  Button
} from '@react-email/components';

interface PasswordResetEmailProps {
  username: string;
  resetLink: string;
  siteUrl: string;
  primaryColor: string;
  bgColor: string;
  footerText: string;
}

export const PasswordResetEmail = ({
  username = "johndoe",
  resetLink = "#",
  siteUrl = "https://jackseliquid.co.uk",
  primaryColor = "#0f766e",
  bgColor = "#f2f2f2",
  footerText = "This email was sent by Jacks eLiquid."
}: PasswordResetEmailProps) => {

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: bgColor, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
        <Container style={container}>
          
          <Section style={{ backgroundColor: primaryColor, padding: '40px 35px', textAlign: 'center' }}>
            <Img src={`${siteUrl}/logo.png`} width="180" alt="Jacks eLiquid" style={logo} />
          </Section>

          <Section style={greetingBlock}>
            <div style={iconBadge}>
               <Img src={`${siteUrl}/icons/key.png`} width="30" />
            </div>
            
            <Heading style={heading}>Password Reset Request</Heading>
            
            <Text style={text}>Hi <strong>{username}</strong>,</Text>
            <Text style={text}>Someone has requested a new password for the following account on Jacks E-Liquid:</Text>
            
            <Text style={text}>Username: <strong>{username}</strong></Text>
            
            <Text style={text}>If you didn't make this request, just ignore this email. If you'd like to proceed:</Text>

            <Button style={{ ...btn, backgroundColor: primaryColor }} href={resetLink}>
              Click to reset your password
            </Button>

            <Text style={{ ...text, marginTop: '20px' }}>Thanks for reading.</Text>
          </Section>

          <Section style={{ backgroundColor: '#e0f2f1', padding: '30px 35px', textAlign: 'center' }}>
            <Text style={{ ...footerHead, color: primaryColor }}>Get in Touch</Text>
            <Text style={footerInfo}>{footerText}</Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

const container = {
  margin: '0 auto',
  width: '600px',
  backgroundColor: '#ffffff',
  overflow: 'hidden'
};

const logo = { margin: '0 auto' };

const greetingBlock = {
  backgroundColor: '#f9fafb',
  padding: '45px 35px',
  textAlign: 'center' as const,
};

const iconBadge = {
  backgroundColor: '#374151',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  margin: '0 auto 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const heading = {
  fontSize: '24px',
  color: '#374151',
  margin: '0 0 20px',
};

const text = {
  fontSize: '16px',
  color: '#374151',
  marginBottom: '15px',
  lineHeight: '24px'
};

const btn = {
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '14px 28px',
  marginTop: '15px'
};

const footerHead = {
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 10px',
};

const footerInfo = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '22px',
};
