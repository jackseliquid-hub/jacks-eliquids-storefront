import { Resend } from 'resend';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmation';
import React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY || '');

interface SendOrderEmailParams {
  emailTo: string;
  orderNumber: string;
  firstName: string;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  items: any[];
  billingAddress: any;
  shippingAddress: any;
}

export async function sendOrderConfirmationEmail(params: SendOrderEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is missing. Email skipped.");
    return { success: false, error: "Missing API Key" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jackseliquid.co.uk';

  try {
    const data = await resend.emails.send({
      from: 'Jacks E-Liquid <sales@jackseliquid.co.uk>',
      to: [params.emailTo],
      subject: `Order Confirmation #${params.orderNumber} - Jacks eLiquid`,
      react: React.createElement(OrderConfirmationEmail, {
        orderNumber: params.orderNumber,
        firstName: params.firstName,
        paymentMethod: params.paymentMethod,
        subtotal: params.subtotal,
        shipping: params.shipping,
        discount: params.discount,
        total: params.total,
        items: params.items,
        billingAddress: params.billingAddress,
        shippingAddress: params.shippingAddress,
        siteUrl
      })
    });

    console.log("Email Dispatch Success:", data);
    return { success: true, data };
  } catch (error: any) {
    console.error("Email Dispatch Failure:", error);
    return { success: false, error: error.message };
  }
}
