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
  unit_price?: number;
  discounted_price?: number;
  line_total: number;
  image_url?: string;
}

interface AddressData {
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  postcode: string;
  county?: string;
  country?: string;
}

interface AdminOrderAlertProps {
  orderId: string;
  orderNumber: string;
  customerName: string;
  paymentMethod: 'bacs' | 'viva' | string;
  subtotal: number;
  shipping?: number;
  discount?: number;
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
  shipping = 0,
  discount = 0,
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
          <Section style={{ backgroundColor: isBacs ? '#b91c1c' : '#0f766e', padding: '24px 20px', textAlign: 'center' }}>
            <Img
              src="https://jlauicuvxldslzciebyu.supabase.co/storage/v1/object/public/media/brand/logo.png"
              width="140"
              alt="Jacks eLiquid"
              style={{ margin: '0 auto 12px' }}
            />
            <Text style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              {isBacs ? '⚠️ NEW BACS ORDER — ACTION REQUIRED' : '✅ NEW ORDER RECEIVED'}
            </Text>
          </Section>

          {/* Summary */}
          <Section style={{ padding: '30px 30px 0' }}>
            <Heading style={{ fontSize: '24px', margin: '0 0 15px', color: '#111' }}>Order #{orderNumber}</Heading>
            <Text style={{ fontSize: '16px', margin: '0 0 10px', lineHeight: '26px' }}>
              <strong>Customer:</strong> {customerName}<br/>
              <strong>Payment:</strong> {isBacs ? 'Direct Bank Transfer (BACS)' : 'Credit Card (Viva Wallet)'}
            </Text>

            {isBacs && (
              <div style={{ backgroundColor: '#fef2f2', border: '2px solid #f87171', padding: '15px', borderRadius: '6px', marginTop: '15px' }}>
                <Text style={{ color: '#991b1b', margin: 0, fontWeight: 'bold', fontSize: '15px' }}>
                  ⛔ Do NOT ship this order until £{Number(total).toFixed(2)} has cleared in your Barclays account!
                </Text>
              </div>
            )}
          </Section>

          {/* Items */}
          <Section style={{ padding: '20px 30px 0' }}>
            <Hr style={{ borderColor: '#e5e7eb', margin: '10px 0 20px' }} />
            <Heading style={{ fontSize: '17px', margin: '0 0 15px', color: '#374151' }}>Order Items</Heading>

            {items.map((item, i) => (
              <Row key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                {/* Thumbnail */}
                <Column style={{ width: '64px', verticalAlign: 'middle' }}>
                  {item.image_url ? (
                    <Img
                      src={item.image_url}
                      width="54"
                      height="54"
                      alt={item.product_name}
                      style={{ borderRadius: '6px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '54px', height: '54px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📦</div>
                  )}
                </Column>
                {/* Name + variant + qty */}
                <Column style={{ verticalAlign: 'middle', paddingLeft: '10px' }}>
                  <Text style={{ margin: 0, fontWeight: 'bold', fontSize: '15px', color: '#111' }}>{item.product_name}</Text>
                  {item.variant_name && <Text style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>{item.variant_name}</Text>}
                  <Text style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Qty: {item.quantity}</Text>
                </Column>
                {/* Price */}
                <Column style={{ width: '90px', textAlign: 'right', verticalAlign: 'middle' }}>
                  <Text style={{ margin: 0, fontWeight: '600', fontSize: '15px' }}>£{Number(item.line_total).toFixed(2)}</Text>
                </Column>
              </Row>
            ))}
          </Section>

          {/* Totals */}
          <Section style={{ padding: '15px 30px 0' }}>
            <Row style={{ padding: '6px 0' }}>
              <Column align="right"><Text style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Subtotal</Text></Column>
              <Column style={{ width: '110px' }} align="right"><Text style={{ margin: 0, fontSize: '14px' }}>£{Number(subtotal).toFixed(2)}</Text></Column>
            </Row>
            <Row style={{ padding: '6px 0' }}>
              <Column align="right"><Text style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Shipping</Text></Column>
              <Column style={{ width: '110px' }} align="right"><Text style={{ margin: 0, fontSize: '14px' }}>£{Number(shipping).toFixed(2)}</Text></Column>
            </Row>
            {Number(discount) > 0 && (
              <Row style={{ padding: '6px 0' }}>
                <Column align="right"><Text style={{ margin: 0, fontSize: '14px', color: '#0d9488' }}>Discount</Text></Column>
                <Column style={{ width: '110px' }} align="right"><Text style={{ margin: 0, fontSize: '14px', color: '#0d9488' }}>-£{Number(discount).toFixed(2)}</Text></Column>
              </Row>
            )}
            <Hr style={{ borderColor: '#e5e7eb', margin: '8px 0' }} />
            <Row style={{ padding: '6px 0' }}>
              <Column align="right"><Text style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111' }}>Total</Text></Column>
              <Column style={{ width: '110px' }} align="right"><Text style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111' }}>£{Number(total).toFixed(2)}</Text></Column>
            </Row>
          </Section>

          {/* Addresses */}
          <Section style={{ padding: '25px 30px 0' }}>
            <Hr style={{ borderColor: '#e5e7eb', margin: '0 0 20px' }} />
            <Row>
              <Column style={{ width: '50%', verticalAlign: 'top', paddingRight: '10px' }}>
                <Heading style={{ fontSize: '15px', color: '#374151', marginBottom: '8px' }}>Billing Address</Heading>
                <Text style={{ fontSize: '14px', lineHeight: '22px', color: '#4b5563', margin: 0 }}>
                  {billingAddress.first_name} {billingAddress.last_name}<br/>
                  {billingAddress.address}<br/>
                  {billingAddress.city}{billingAddress.county ? `, ${billingAddress.county}` : ''}<br/>
                  {billingAddress.postcode}
                </Text>
              </Column>
              <Column style={{ width: '50%', verticalAlign: 'top', paddingLeft: '10px' }}>
                <Heading style={{ fontSize: '15px', color: '#374151', marginBottom: '8px' }}>Shipping Address</Heading>
                <Text style={{ fontSize: '14px', lineHeight: '22px', color: '#4b5563', margin: 0 }}>
                  {shippingAddress.first_name} {shippingAddress.last_name}<br/>
                  {shippingAddress.address}<br/>
                  {shippingAddress.city}{shippingAddress.county ? `, ${shippingAddress.county}` : ''}<br/>
                  {shippingAddress.postcode}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* CTA */}
          <Section style={{ padding: '30px', textAlign: 'center' }}>
            <Button
              style={{ backgroundColor: '#0f766e', color: '#fff', padding: '14px 28px', textDecoration: 'none', borderRadius: '6px', display: 'inline-block', fontWeight: 'bold', fontSize: '15px' }}
              href={`${siteUrl}/admin/orders/${orderId}`}
            >
              Open in Kitchen →
            </Button>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

export default AdminOrderAlert;
