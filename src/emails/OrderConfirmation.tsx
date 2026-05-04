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
  Button,
  Hr,
  Row,
  Column,
  Link
} from '@react-email/components';

interface OrderItem {
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  line_total: number;
  image_url?: string;
}

interface AddressData {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  postcode: string;
  country?: string;
  county?: string;
}

interface OrderConfirmationEmailProps {
  orderNumber: string;
  firstName: string;
  paymentMethod: 'bacs' | 'viva' | string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  items: OrderItem[];
  billingAddress: AddressData;
  shippingAddress: AddressData;
  siteUrl: string;
  couponCode?: string;
  savings?: {
    productSavings: number;
    couponSavings: number;
    totalSavings: number;
    couponCode?: string;
  };
}

export const OrderConfirmationEmail = ({
  orderNumber = "000000",
  firstName = "Customer",
  paymentMethod = "viva",
  subtotal = 0,
  shipping = 0,
  discount = 0,
  total = 0,
  items = [],
  billingAddress = { first_name: "John", last_name: "Doe", address: "123 Test St", city: "Test City", postcode: "AB1 2CD" },
  shippingAddress = { first_name: "John", last_name: "Doe", address: "123 Test St", city: "Test City", postcode: "AB1 2CD" },
  siteUrl = "https://jackseliquid.co.uk",
  couponCode,
  savings
}: OrderConfirmationEmailProps) => {
  
  const isBacs = paymentMethod === 'bacs';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          
          {/* Header Section */}
          <Section style={headerBlock}>
            <Img
              src="https://jlauicuvxldslzciebyu.supabase.co/storage/v1/object/public/media/brand/logo.png"
              width="180"
              alt="Jacks eLiquid"
              style={logo}
            />
          </Section>

          {/* Greeting Section */}
          <Section style={greetingBlock}>
            <Heading style={orderHeading}>Order #{orderNumber}</Heading>
            <Text style={introText}>Hi {firstName}, Thank you for your purchase.</Text>
            
            {isBacs ? (
              <>
                <div style={bacsDetailsBox}>
                  <Text style={bacsHeadingText}><strong>At the checkout you selected to pay by BACS (Bank Transfer).</strong></Text>
                  <Text style={bacsBodyText}>
                    If you have access to online banking an even easier way is to add us as a Payee / Recipient to your account just use your name as the reference and our bank details found below (you will only need do this once) then you can simply transfer your payment to our account each time you place an order. All the bank details you need are listed below.
                  </Text>
                  <Text style={bacsBodyText}>
                    You will also need your order number <strong>#{orderNumber}</strong> and the Total amount <strong>£{total.toFixed(2)}</strong>
                  </Text>

                  <div style={bankDetailsCard}>
                    <Text style={bankHeading}>Our Bank Details</Text>
                    <Text style={bankLine}><strong>Account Name:</strong> N Porter</Text>
                    <Text style={bankLine}><strong>Account Number:</strong> 22811478</Text>
                    <Text style={bankLine}><strong>Bank Name:</strong> Starling</Text>
                    <Text style={bankLine}><strong>Sort Code:</strong> 60-83-71</Text>
                  </div>

                  <div style={intlDetailsCard}>
                    <Text style={intlHeading}><strong>Paying from outside the UK you may need.</strong></Text>
                    <Text style={bankLine}><strong>IBAN Number:</strong> GB34SRLG60837122811478</Text>
                    <Text style={bankLine}><strong>BIC / Swift Number:</strong> SRLGGB2L</Text>
                  </div>
                </div>

                <div style={payByCardBox}>
                  <Text style={bacsBodyText}>
                    If you changed your mind and would like to pay by card you can still do so by clicking the button below. You will also need your order number <strong>#{orderNumber}</strong> and the Total amount <strong>£{total.toFixed(2)}</strong>
                  </Text>
                  <div style={{ textAlign: 'center' as const, marginTop: '16px' }}>
                    <Button style={payByCardBtn} href="https://www.vivapayments.com/web2?ref=1043992034126654">
                      I would like to pay by card
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <Text style={introSubText}>We are now processing your order.</Text>
            )}

            <Button style={btn} href={`${siteUrl}/account/orders`}>
              VIEW YOUR ORDER
            </Button>
          </Section>

          {/* Order Items Section */}
          <Section style={detailsBlock}>
            <Heading style={tableHeading}>Your Order Details</Heading>
            <Hr style={hr} />
            
            {items.map((item, i) => (
              <Row key={i} style={itemRow}>
                <Column style={{ width: '60px' }}>
                  {item.image_url ? (
                    <Img src={item.image_url} width="50" style={itemImage} />
                  ) : (
                    <div style={{ width: '50px', height: '50px', background: '#f3f4f6', borderRadius: '4px' }} />
                  )}
                </Column>
                <Column>
                  <Text style={itemName}>{item.product_name}</Text>
                  {item.variant_name && <Text style={itemSub}>{item.variant_name}</Text>}
                  <Text style={itemSub}>Qty: {item.quantity}</Text>
                </Column>
                <Column style={{ textAlign: 'right' }}>
                  <Text style={itemPrice}>£{Number(item.line_total).toFixed(2)}</Text>
                </Column>
              </Row>
            ))}

            <Hr style={hr} />

            {/* Totals Box */}
            <div style={totalsBox}>
              <Row>
                <Column align="right"><Text style={totalLabel}>Subtotal</Text></Column>
                <Column align="right" style={{ width: '100px' }}><Text style={totalValue}>£{Number(subtotal).toFixed(2)}</Text></Column>
              </Row>
              <Row>
                <Column align="right"><Text style={totalLabel}>Shipping</Text></Column>
                <Column align="right" style={{ width: '100px' }}><Text style={totalValue}>£{Number(shipping).toFixed(2)}</Text></Column>
              </Row>
              {Number(discount) > 0 && (
                <Row>
                  <Column align="right"><Text style={totalLabel}>{couponCode ? `Discount (${couponCode})` : 'Discount'}</Text></Column>
                  <Column align="right" style={{ width: '100px' }}><Text style={{...totalValue, color: '#059669'}}>-£{Number(discount).toFixed(2)}</Text></Column>
                </Row>
              )}
              <Row>
                <Column align="right"><Text style={grandTotalLabel}>Total</Text></Column>
                <Column align="right" style={{ width: '100px' }}><Text style={grandTotalValue}>£{Number(total).toFixed(2)}</Text></Column>
              </Row>
            </div>
          </Section>

          {/* Savings "Feel Good" Block — only shown if any savings */}
          {savings && savings.totalSavings > 0 && (
            <Section style={savingsBlock}>
              <div style={savingsInner}>
                <Text style={savingsHeading}>🎉 Your Savings on This Order</Text>
                {savings.productSavings > 0 && (
                  <Row style={{ padding: '3px 0' }}>
                    <Column><Text style={savingsLabel}>Product deals</Text></Column>
                    <Column align="right" style={{ width: '100px' }}><Text style={savingsValue}>-£{savings.productSavings.toFixed(2)}</Text></Column>
                  </Row>
                )}
                {savings.couponSavings > 0 && (
                  <Row style={{ padding: '3px 0' }}>
                    <Column><Text style={savingsLabel}>Discount code{savings.couponCode ? ` (${savings.couponCode})` : ''}</Text></Column>
                    <Column align="right" style={{ width: '100px' }}><Text style={savingsValue}>-£{savings.couponSavings.toFixed(2)}</Text></Column>
                  </Row>
                )}
                <Hr style={{ borderColor: '#86efac', margin: '8px 0' }} />
                <Row>
                  <Column><Text style={savingsTotalLabel}>Total saved</Text></Column>
                  <Column align="right" style={{ width: '100px' }}><Text style={savingsTotalValue}>£{savings.totalSavings.toFixed(2)}</Text></Column>
                </Row>
              </div>
            </Section>
          )}

          {/* Address Section */}
          <Section style={addressBlock}>
            <Row>
              <Column style={addressCell}>
                <Heading style={addressHeading}>Billing Address</Heading>
                <Text style={addressText}>
                  {billingAddress.first_name} {billingAddress.last_name}<br/>
                  {billingAddress.address}<br/>
                  {billingAddress.city}, {billingAddress.county}<br/>
                  {billingAddress.postcode}<br/>
                  {billingAddress.country}
                </Text>
              </Column>
              <Column style={addressCell}>
                <Heading style={addressHeading}>Shipping Address</Heading>
                <Text style={addressText}>
                  {shippingAddress.first_name} {shippingAddress.last_name}<br/>
                  {shippingAddress.address}<br/>
                  {shippingAddress.city}, {shippingAddress.county}<br/>
                  {shippingAddress.postcode}<br/>
                  {shippingAddress.country}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Review CTA Section */}
          <Section style={reviewBlock}>
            <div style={reviewInner}>
              <Text style={reviewHeading}>⭐ Enjoying Your Experience?</Text>
              <Text style={reviewBody}>
                We&apos;d love to hear from you! Your reviews help other vapers discover quality products
                and help us keep improving. It only takes a minute and means the world to a small business like ours.
              </Text>
              <Button style={reviewBtn} href={`${siteUrl}/review`}>
                LEAVE A REVIEW ⭐
              </Button>
            </div>
          </Section>

          {/* Footer Section */}
          <Section style={footerBlock}>
            <Text style={footerHead}>Get in Touch</Text>
            <Text style={footerInfo}>
              This email was sent by Jacks eLiquid.<br/>
              For any questions please email <Link href="mailto:support@jackseliquid.co.uk" style={footerLink}>support@jackseliquid.co.uk</Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default OrderConfirmationEmail;

const main = {
  backgroundColor: '#f2f2f2',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  width: '600px',
  backgroundColor: '#ffffff',
  overflow: 'hidden'
};

const headerBlock = {
  backgroundColor: '#0f766e',
  padding: '40px 35px',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const greetingBlock = {
  backgroundColor: '#f9fafb',
  padding: '45px 35px',
  textAlign: 'center' as const,
};

const orderHeading = {
  fontSize: '24px',
  color: '#374151',
  margin: '0 0 10px',
};

const introText = {
  fontSize: '20px',
  color: '#374151',
  marginBottom: '10px',
};

const introSubText = {
  fontSize: '18px',
  color: '#6b7280',
  marginBottom: '40px',
};

const bacsDetailsBox = {
  backgroundColor: '#f9fafb',
  borderTop: '4px solid #99f6e4',
  borderRadius: '0 0 8px 8px',
  padding: '24px 28px',
  textAlign: 'left' as const,
  marginBottom: '0px',
  marginTop: '25px',
};

const bacsHeadingText = {
  color: '#1f2937',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const bacsBodyText = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 14px',
};

const bankDetailsCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px 20px',
  marginTop: '16px',
  marginBottom: '20px',
};

const bankHeading = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#111827',
  margin: '0 0 10px',
};

const bankLine = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '26px',
  margin: '0',
};

const intlDetailsCard = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px 20px',
  marginTop: '0',
};

const intlHeading = {
  fontSize: '15px',
  color: '#1f2937',
  margin: '0 0 8px',
};

const payByCardBox = {
  backgroundColor: '#f9fafb',
  padding: '20px 28px 24px',
  textAlign: 'left' as const,
  marginBottom: '35px',
  borderRadius: '0 0 8px 8px',
};

const payByCardBtn = {
  backgroundColor: '#0d9488',
  borderRadius: '24px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 36px',
};

const btn = {
  backgroundColor: '#0d9488',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 28px',
};

const detailsBlock = {
  padding: '30px 35px',
  backgroundColor: '#ffffff',
};

const tableHeading = {
  fontSize: '20px',
  color: '#374151',
  marginBottom: '10px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '15px 0',
};

const itemRow = {
  padding: '10px 0',
};

const itemImage = {
  borderRadius: '4px',
};

const itemName = {
  fontSize: '16px',
  color: '#374151',
  margin: '0 0 5px',
  fontWeight: '600'
};

const itemSub = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
};

const itemPrice = {
  fontSize: '16px',
  color: '#374151',
  fontWeight: '600',
  margin: '0'
};

const totalsBox = {
  marginTop: '15px',
};

const totalLabel = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '5px 0',
};

const totalValue = {
  fontSize: '14px',
  color: '#374151',
  margin: '5px 0',
  textAlign: 'right' as const,
};

const grandTotalLabel = {
  fontSize: '18px',
  color: '#111827',
  fontWeight: 'bold',
  margin: '15px 0 0',
};

const grandTotalValue = {
  fontSize: '18px',
  color: '#111827',
  fontWeight: 'bold',
  margin: '15px 0 0',
  textAlign: 'right' as const,
};

const addressBlock = {
  padding: '0 35px 30px',
  backgroundColor: '#ffffff',
};

const addressCell = {
  width: '50%',
  verticalAlign: 'top',
};

const addressHeading = {
  fontSize: '18px',
  color: '#374151',
  borderBottom: '1px solid #e5e7eb',
  paddingBottom: '10px',
  marginBottom: '10px',
};

const addressText = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '22px',
};

const footerBlock = {
  backgroundColor: '#e0f2f1',
  padding: '30px 35px',
  textAlign: 'center' as const,
};

const footerHead = {
  fontSize: '18px',
  color: '#0d9488',
  fontWeight: 'bold',
  margin: '0 0 10px',
};

const footerInfo = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '22px',
};

const footerLink = {
  color: '#0d9488',
  textDecoration: 'underline',
};

// Savings "feel good" block styles
const savingsBlock = {
  padding: '0 35px 10px',
  backgroundColor: '#ffffff',
};

const savingsInner = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '8px',
  padding: '18px 20px',
};

const savingsHeading = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#059669',
  margin: '0 0 12px',
};

const savingsLabel = {
  fontSize: '14px',
  color: '#065f46',
  margin: '0',
};

const savingsValue = {
  fontSize: '14px',
  color: '#059669',
  fontWeight: '600',
  margin: '0',
  textAlign: 'right' as const,
};

const savingsTotalLabel = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#047857',
  margin: '0',
};

const savingsTotalValue = {
  fontSize: '16px',
  fontWeight: 'bold' as const,
  color: '#047857',
  margin: '0',
  textAlign: 'right' as const,
};

// Review CTA block styles
const reviewBlock = {
  padding: '0 35px 10px',
  backgroundColor: '#ffffff',
};

const reviewInner = {
  backgroundColor: '#f0fdfa',
  border: '1px solid #ccfbf1',
  borderRadius: '8px',
  padding: '22px 24px',
  textAlign: 'center' as const,
};

const reviewHeading = {
  fontSize: '17px',
  fontWeight: 'bold' as const,
  color: '#0f766e',
  margin: '0 0 10px',
};

const reviewBody = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '22px',
  margin: '0 0 18px',
};

const reviewBtn = {
  backgroundColor: '#0d9488',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};
