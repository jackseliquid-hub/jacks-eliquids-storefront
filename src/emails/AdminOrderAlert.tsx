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
  Hr,
  Row,
  Column,
  Button
} from '@react-email/components';

interface OrderItem {
  product_name: string;
  variant_name?: string | null;
  quantity: number;
  line_total: number;
}

interface AddressData {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  postcode: string;
}

interface AdminOrderAlertProps {
  orderId: string;
  orderNumber: string;
  customerName: string;
  paymentMethod: 'bacs' | 'viva' | string;
  subtotal: number;
  total: number;
  items: OrderItem[];
  billingAddress: AddressData;
  shippingAddress: AddressData;
  siteUrl: string;
}

export const AdminOrderAlert = ({
  orderId = "uuid",
  orderNumber = "000000",
  customerName = "Customer",
  paymentMethod = "bacs",
  subtotal = 0,
  total = 0,
  items = [],
  billingAddress = { first_name: "John", last_name: "Doe", address: "123 Test St", city: "Test City", postcode: "AB1 2CD" },
  shippingAddress = { first_name: "John", last_name: "Doe", address: "123 Test St", city: "Test City", postcode: "AB1 2CD" },
  siteUrl = "https://jackseliquid.co.uk"
}: AdminOrderAlertProps) => {

  const isBacs = paymentMethod === 'bacs';

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f2f2f2', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
        <Container style={{ margin: '0 auto', width: '600px', backgroundColor: '#ffffff' }}>
          
          {/* Header */}
          <Section style={{ backgroundColor: isBacs ? '#b91c1c' : '#1f2937', padding: '20px', textAlign: 'center' }}>
            <Text style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              {isBacs ? '⚠️ NEW BACS ORDER - ACTION REQUIRED' : '✅ NEW ORDER RECEIVED'}
            </Text>
          </Section>

          {/* Details */}
          <Section style={{ padding: '30px' }}>
            <Heading style={{ fontSize: '24px', margin: '0 0 15px' }}>Order #{orderNumber}</Heading>
            <Text style={{ fontSize: '16px', margin: '0 0 25px' }}>
              <strong>Customer:</strong> {customerName}<br/>
              <strong>Payment:</strong> {isBacs ? 'Direct Bank Transfer (BACS)' : 'Credit Card (Viva)'}<br/>
              <strong>Total:</strong> £{Number(total).toFixed(2)}
            </Text>

            {isBacs && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', padding: '15px', borderRadius: '6px', marginBottom: '25px' }}>
                <Text style={{ color: '#991b1b', margin: 0, fontWeight: 'bold' }}>
                  This is a BACS order. It is currently ON HOLD. Do not ship until you verify £{Number(total).toFixed(2)} has hit your Barclays account!
                </Text>
              </div>
            )}

            <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

            <Heading style={{ fontSize: '18px' }}>Items</Heading>
            {items.map((item, i) => (
              <Row key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <Column>
                  <Text style={{ margin: 0, fontWeight: 'bold' }}>{item.quantity}x {item.product_name}</Text>
                  {item.variant_name && <Text style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{item.variant_name}</Text>}
                </Column>
                <Column style={{ width: '80px', textAlign: 'right' }}>
                  <Text style={{ margin: 0 }}>£{Number(item.line_total).toFixed(2)}</Text>
                </Column>
              </Row>
            ))}

            <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

            <Row>
              <Column style={{ width: '50%', verticalAlign: 'top' }}>
                <Heading style={{ fontSize: '16px' }}>Billing Address</Heading>
                <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#4b5563' }}>
                  {billingAddress.first_name} {billingAddress.last_name}<br/>
                  {billingAddress.address}<br/>
                  {billingAddress.city}, {billingAddress.postcode}
                </Text>
              </Column>
              <Column style={{ width: '50%', verticalAlign: 'top' }}>
                <Heading style={{ fontSize: '16px' }}>Shipping Address</Heading>
                <Text style={{ fontSize: '14px', lineHeight: '20px', color: '#4b5563' }}>
                  {shippingAddress.first_name} {shippingAddress.last_name}<br/>
                  {shippingAddress.address}<br/>
                  {shippingAddress.city}, {shippingAddress.postcode}
                </Text>
              </Column>
            </Row>

            <Button 
              style={{ backgroundColor: '#1f2937', color: '#fff', padding: '12px 24px', textDecoration: 'none', borderRadius: '4px', display: 'inline-block', marginTop: '30px' }}
              href={`${siteUrl}/admin/orders/${orderId}`}
            >
              Open in Kitchen
            </Button>
            
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default AdminOrderAlert;
