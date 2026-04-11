/**
 * Royal Mail Click & Drop API client
 * https://api.parcel.royalmail.com/
 */

const RM_BASE = 'https://api.parcel.royalmail.com/api/v1';

function rmHeaders() {
  const key = process.env.ROYAL_MAIL_API_KEY;
  if (!key) throw new Error('ROYAL_MAIL_API_KEY environment variable is not set');
  return {
    'Authorization': key,
    'Content-Type': 'application/json',
  };
}

export interface RMAddress {
  fullName: string;
  companyName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  countryCode: string;
}

export interface RMOrderPayload {
  orderReference: string;        // max 40 chars — we use our order number
  recipient: {
    address: RMAddress;
    phoneNumber?: string;
    emailAddress?: string;
  };
  billing: {
    address: RMAddress;
  };
  orderDate: string;             // ISO 8601
  plannedDispatchDate?: string;  // YYYY-MM-DD
  packages: Array<{
    weightInGrams: number;
    packageFormatIdentifier?: 'letter' | 'largeLetter' | 'parcel' | 'nestedParcel';
    contents?: Array<{
      name: string;
      quantity: number;
      unitValue?: number;
    }>;
  }>;
  subtotal?: number;
  shippingCostCharged?: number;
  total?: number;
  currencyCode?: string;
  specialInstructions?: string;
}

export interface RMCreatedOrder {
  orderIdentifier: number;
  orderReference: string;
  createdOn: string;
}

export interface RMCreateResponse {
  successCount: number;
  errorsCount: number;
  createdOrders: RMCreatedOrder[];
  failedOrders: Array<{
    order: { orderReference: string };
    errors: Array<{ errorCode: number; errorMessage: string }>;
  }>;
}

/**
 * Push one or more orders to Click & Drop.
 * Returns the full response including any errors.
 */
export async function createClickDropOrders(orders: RMOrderPayload[]): Promise<RMCreateResponse> {
  const res = await fetch(`${RM_BASE}/orders`, {
    method: 'POST',
    headers: rmHeaders(),
    body: JSON.stringify({ items: orders }),
  });

  if (!res.ok && res.status !== 200 && res.status !== 201) {
    const text = await res.text();
    throw new Error(`Royal Mail API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<RMCreateResponse>;
}

/**
 * Build the Click & Drop payload from a Jacks E-Liquid order row.
 */
export function buildRMPayload(order: {
  id: string;
  order_number?: number | string;
  created_at: number | string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  shipping_address: Record<string, string>;
  billing_address:  Record<string, string>;
  items?: Array<{
    product_name: string;
    variant_name?: string | null;
    quantity: number;
    unit_price: number;
    discounted_price?: number | null;
    line_total?: number;
  }>;
}): RMOrderPayload {
  const sa = order.shipping_address;
  const ba = order.billing_address;

  const orderRef = `JEL-${order.order_number || order.id.substring(0, 8).toUpperCase()}`;

  function buildAddress(addr: Record<string, string>): RMAddress {
    return {
      fullName:     `${addr.first_name || ''} ${addr.last_name || ''}`.trim() || 'Customer',
      companyName:  addr.company || undefined,
      addressLine1: addr.address || addr.address_1 || '',
      addressLine2: addr.address_2 || undefined,
      city:         addr.city || '',
      county:       addr.county || addr.state || undefined,
      postcode:     (addr.postcode || addr.post_code || '').replace(/\s/g, '').toUpperCase(),
      countryCode:  'GB',
    };
  }

  // Tomorrow as planned dispatch date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dispatchDate = tomorrow.toISOString().split('T')[0];

  // Order date — handle both unix secs and ISO strings
  const createdMs = typeof order.created_at === 'number'
    ? (order.created_at < 1_000_000_000_000 ? order.created_at * 1000 : order.created_at)
    : new Date(order.created_at).getTime();
  const orderDate = new Date(createdMs).toISOString();

  // Build package contents from order items
  const items = order.items || [];
  const contents = items.map(item => ({
    name:         item.variant_name
                    ? `${item.product_name} — ${item.variant_name}`
                    : item.product_name,
    quantity:     item.quantity,
    unitValue:    Number((item.discounted_price ?? item.unit_price).toFixed(2)),
    unitWeightInGrams: 150, // sensible default per e-liquid bottle
  }));

  // Estimate total weight: 150g per item unit, minimum 100g
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const weightInGrams = Math.max(100, totalItems * 150);

  return {
    orderReference:      orderRef.substring(0, 40),
    recipient: {
      address:     buildAddress(sa),
      phoneNumber: sa.phone || undefined,
      emailAddress: sa.email || undefined,
    },
    billing: {
      address: buildAddress(ba),
    },
    orderDate,
    plannedDispatchDate: dispatchDate,
    packages: [{
      weightInGrams,
      packageFormatIdentifier: 'parcel',
      contents: contents.length > 0 ? contents : undefined,
    }],
    subtotal:            order.subtotal,
    shippingCostCharged: order.shipping_cost,
    total:               order.total,
    currencyCode:        'GBP',
  };
}

