import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmation';
import { AdminOrderAlert } from '@/emails/AdminOrderAlert';
import { AccountWelcomeEmail } from '@/emails/AccountWelcome';
import { PasswordResetEmail } from '@/emails/PasswordReset';
import React from 'react';

// A dynamic API route that renders React Email to HTML for previewing
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const template = searchParams.get('template') || 'confirmation';

  let html = '';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jackseliquid.co.uk';

  // Dummy Data
  const dummyItems = [
    { product_name: 'Blue Raspberry E-Liquid', quantity: 2, line_total: 10.00 },
    { product_name: 'Menthol Ice', quantity: 1, line_total: 5.00 }
  ];
  const dummyAddress = {
    first_name: 'John', last_name: 'Doe', address: '123 Fake St', city: 'London', postcode: 'W1A 1AA', county: 'Greater London', country: 'UK'
  };

  switch (template) {
    case 'confirmation_viva':
      html = await render(React.createElement(OrderConfirmationEmail, {
        orderNumber: 'TEST-123', firstName: 'John', paymentMethod: 'viva', subtotal: 15.00, shipping: 3.99, discount: 0, total: 18.99,
        items: dummyItems, billingAddress: dummyAddress, shippingAddress: dummyAddress, siteUrl
      }));
      break;
    case 'confirmation_bacs':
      html = await render(React.createElement(OrderConfirmationEmail, {
        orderNumber: 'TEST-123', firstName: 'John', paymentMethod: 'bacs', subtotal: 15.00, shipping: 3.99, discount: 0, total: 18.99,
        items: dummyItems, billingAddress: dummyAddress, shippingAddress: dummyAddress, siteUrl
      }));
      break;
    case 'admin_alert_viva':
      html = await render(React.createElement(AdminOrderAlert, {
        orderId: 'TEST-UUID-1234', orderNumber: 'TEST-123', customerName: 'John Doe', paymentMethod: 'viva', subtotal: 15.00, total: 18.99,
        items: dummyItems, billingAddress: dummyAddress, shippingAddress: dummyAddress, siteUrl
      }));
      break;
    case 'admin_alert_bacs':
      html = await render(React.createElement(AdminOrderAlert, {
        orderId: 'TEST-UUID-1234', orderNumber: 'TEST-123', customerName: 'John Doe', paymentMethod: 'bacs', subtotal: 15.00, total: 18.99,
        items: dummyItems, billingAddress: dummyAddress, shippingAddress: dummyAddress, siteUrl
      }));
      break;
    case 'welcome':
      html = await render(React.createElement(AccountWelcomeEmail, {
        username: 'johndoe88', firstName: 'John', siteUrl, welcomeText: 'Thanks for creating an account on Jacks E-Liquid.\nWe look forward to seeing you soon.',
        primaryColor: '#0f766e', bgColor: '#f2f2f2', footerText: 'This email was sent by Jacks eLiquid.'
      }));
      break;
    case 'password':
      html = await render(React.createElement(PasswordResetEmail, {
        username: 'johndoe88', resetLink: '#', siteUrl, primaryColor: '#0f766e', bgColor: '#f2f2f2', footerText: 'This email was sent by Jacks eLiquid.'
      }));
      break;
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
