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

interface OrderShippedEmailProps {
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
}

export const OrderShippedEmail = ({
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
  siteUrl = "https://jackseliquid.co.uk"
}: OrderShippedEmailProps) => {
  
  const isBacs = paymentMethod === 'bacs';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          
          {/* Header Section */}
          <Section style={headerBlock}>
            <Img
              src={`${siteUrl}/logo.png`}
              width="180"
              alt="Jacks eLiquid"
              style={logo}
            />
          </Section>

          {/* Greeting Section */}
          <Section style={greetingBlock}>
            <Heading style={orderHeading}>Order #{orderNumber} Shipped! 🚚</Heading>
            <Text style={introText}>Hi {firstName}, great news.</Text>
            <Text style={introSubText}>Your order has been packaged and is now on its way to you!</Text>

            <Button style={btn} href={`${siteUrl}/account`}>
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
                  <Column align="right"><Text style={totalLabel}>Discount</Text></Column>
                  <Column align="right" style={{ width: '100px' }}><Text style={totalValue}>-£{Number(discount).toFixed(2)}</Text></Column>
                </Row>
              )}
              <Row>
                <Column align="right"><Text style={grandTotalLabel}>Total</Text></Column>
                <Column align="right" style={{ width: '100px' }}><Text style={grandTotalValue}>£{Number(total).toFixed(2)}</Text></Column>
              </Row>
            </div>
          </Section>

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

export default OrderShippedEmail;

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
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  padding: '20px',
  textAlign: 'left' as const,
  marginBottom: '35px',
  marginTop: '25px'
};

const bacsAlert = {
  color: '#b45309',
  fontSize: '16px',
  marginBottom: '15px'
};

const bacsInstruct = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px'
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
