import { Resend } from 'resend';
import { OrderConfirmationEmail } from '@/emails/OrderConfirmation';
import { OrderShippedEmail } from '@/emails/OrderShipped';
import { AdminOrderAlert } from '@/emails/AdminOrderAlert';
import { AccountWelcomeEmail } from '@/emails/AccountWelcome';
import { PasswordResetEmail } from '@/emails/PasswordReset';
import React from 'react';

const resend = new Resend(process.env.RESEND_API_KEY || '');

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jacks-eliquids-storefront.vercel.app';

// Ensure product image URLs are always absolute - Supabase Storage URLs start with https://
// but some older records may have relative paths stored.
function sanitizeItems(items: any[]): any[] {
  return items.map(item => ({
    ...item,
    image_url: item.image_url && item.image_url.startsWith('http')
      ? item.image_url
      : undefined  // drop non-absolute URLs so the email shows the grey placeholder
  }));
}

interface SendOrderEmailParams {
  emailTo: string;
  orderId?: string;
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
        items: sanitizeItems(params.items),
        billingAddress: params.billingAddress,
        shippingAddress: params.shippingAddress,
        siteUrl: SITE_URL
      })
    });

    console.log("Email Dispatch Success:", data);
    return { success: true, data };
  } catch (error: any) {
    console.error("Email Dispatch Failure:", error);
    return { success: false, error: error.message };
  }
}

export async function sendOrderShippedEmail(params: SendOrderEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is missing. Email skipped.");
    return { success: false, error: "Missing API Key" };
  }

  try {
    const data = await resend.emails.send({
      from: 'Jacks E-Liquid <sales@jackseliquid.co.uk>',
      to: [params.emailTo],
      subject: `Your Order #${params.orderNumber} has Shipped! 🚚 - Jacks eLiquid`,
      react: React.createElement(OrderShippedEmail, {
        orderNumber: params.orderNumber,
        firstName: params.firstName,
        paymentMethod: params.paymentMethod,
        subtotal: params.subtotal,
        shipping: params.shipping,
        discount: params.discount,
        total: params.total,
        items: sanitizeItems(params.items),
        billingAddress: params.billingAddress,
        shippingAddress: params.shippingAddress,
        siteUrl: SITE_URL
      })
    });

    console.log("Email Dispatch Success:", data);
    return { success: true, data };
  } catch (error: any) {
    console.error("Email Dispatch Failure:", error);
    return { success: false, error: error.message };
  }
}

export async function sendAdminOrderAlert(params: SendOrderEmailParams, adminEmail: string = 'jackseliquid@gmail.com') {
  if (!process.env.RESEND_API_KEY) return { success: false, error: "Missing API Key" };

  try {
    const data = await resend.emails.send({
      from: 'Jacks Server <sales@jackseliquid.co.uk>',
      to: [adminEmail],
      subject: `[Admin Alert] ${params.paymentMethod === 'bacs' ? '⚠️ BACS' : '✅'} Order #${params.orderNumber}`,
      react: React.createElement(AdminOrderAlert, {
        orderId: params.orderId || params.orderNumber,
        orderNumber: params.orderNumber,
        customerName: `${params.firstName} ${params.billingAddress?.last_name || ''}`,
        paymentMethod: params.paymentMethod,
        subtotal: params.subtotal,
        shipping: params.shipping,
        discount: params.discount,
        total: params.total,
        items: sanitizeItems(params.items),
        billingAddress: params.billingAddress,
        shippingAddress: params.shippingAddress,
        siteUrl: SITE_URL
      })
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendAccountWelcomeEmail(emailTo: string, username: string, firstName: string) {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jackseliquid.co.uk';

  try {
    const data = await resend.emails.send({
      from: 'Jacks E-Liquid <sales@jackseliquid.co.uk>',
      to: [emailTo],
      subject: `Welcome to Jacks E-Liquid!`,
      react: React.createElement(AccountWelcomeEmail, {
        username,
        firstName,
        siteUrl,
        welcomeText: 'Thanks for creating an account on Jacks E-Liquid.\nWe look forward to seeing you soon.',
        primaryColor: '#0f766e',
        bgColor: '#f2f2f2',
        footerText: 'This email was sent by Jacks eLiquid. For any questions please email support@jackseliquid.co.uk'
      })
    });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
