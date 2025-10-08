const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe Service - Handle all Stripe-related operations
 */

// Subscription Plans Configuration
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: {
      transcriptionMinutes: 60,
      aiModels: ['basic'],
      storage: 1024 * 1024 * 100, // 100MB
      teamMembers: 1,
      apiAccess: false,
      prioritySupport: false,
      customBranding: false,
      advancedFeatures: false
    }
  },
  pro: {
    name: 'Pro',
    price: 1900, // $19.00 in cents
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      transcriptionMinutes: 500,
      aiModels: ['gpt-4', 'claude', 'gemini'],
      storage: 1024 * 1024 * 1024 * 10, // 10GB
      teamMembers: 1,
      apiAccess: true,
      prioritySupport: true,
      customBranding: false,
      advancedFeatures: true
    }
  },
  business: {
    name: 'Business',
    price: 4900, // $49.00 in cents
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
    features: {
      transcriptionMinutes: 2000,
      aiModels: ['gpt-4', 'claude', 'gemini'],
      storage: 1024 * 1024 * 1024 * 50, // 50GB
      teamMembers: 5,
      apiAccess: true,
      prioritySupport: true,
      customBranding: true,
      advancedFeatures: true
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // Custom pricing
    priceId: null,
    features: {
      transcriptionMinutes: -1, // Unlimited
      aiModels: ['gpt-4', 'claude', 'gemini'],
      storage: -1, // Unlimited
      teamMembers: -1, // Unlimited
      apiAccess: true,
      prioritySupport: true,
      customBranding: true,
      advancedFeatures: true,
      whiteLabel: true,
      dedicatedSupport: true,
      sla: true
    }
  }
};

/**
 * Create a new Stripe customer
 */
async function createCustomer(email, name, metadata = {}) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata
    });
    return customer;
  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    throw error;
  }
}

/**
 * Create a checkout session for subscription
 */
async function createCheckoutSession(customerId, priceId, successUrl, cancelUrl) {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * Create a billing portal session
 */
async function createBillingPortalSession(customerId, returnUrl) {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    throw error;
  }
}

/**
 * Cancel subscription
 */
async function cancelSubscription(subscriptionId, immediately = false) {
  try {
    if (immediately) {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } else {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return subscription;
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Update subscription
 */
async function updateSubscription(subscriptionId, newPriceId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    });
    return updatedSubscription;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

/**
 * Create usage record for metered billing
 */
async function createUsageRecord(subscriptionItemId, quantity, timestamp) {
  try {
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment',
      }
    );
    return usageRecord;
  } catch (error) {
    console.error('Error creating usage record:', error);
    throw error;
  }
}

/**
 * Get customer invoices
 */
async function getCustomerInvoices(customerId, limit = 10) {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  } catch (error) {
    console.error('Error retrieving invoices:', error);
    throw error;
  }
}

/**
 * Get upcoming invoice
 */
async function getUpcomingInvoice(customerId) {
  try {
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
    return invoice;
  } catch (error) {
    console.error('Error retrieving upcoming invoice:', error);
    throw error;
  }
}

/**
 * Create a payment intent for one-time payments
 */
async function createPaymentIntent(amount, currency, customerId, metadata = {}) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      metadata,
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw error;
  }
}

/**
 * Get plan details by plan ID
 */
function getPlanDetails(planId) {
  return PLANS[planId] || PLANS.free;
}

/**
 * Check if user has access to feature
 */
function hasFeatureAccess(planId, feature) {
  const plan = getPlanDetails(planId);
  return plan.features[feature] !== undefined ? plan.features[feature] : false;
}

/**
 * Get usage limit for plan
 */
function getUsageLimit(planId, limitType) {
  const plan = getPlanDetails(planId);
  return plan.features[limitType] || 0;
}

/**
 * Calculate overage charges
 */
function calculateOverageCharges(planId, usedMinutes) {
  const plan = getPlanDetails(planId);
  const limit = plan.features.transcriptionMinutes;
  
  if (limit === -1) return 0; // Unlimited
  if (usedMinutes <= limit) return 0; // Within limit
  
  const overageMinutes = usedMinutes - limit;
  const overageRate = 0.10; // $0.10 per minute
  return Math.ceil(overageMinutes * overageRate * 100); // Return in cents
}

module.exports = {
  PLANS,
  createCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  createUsageRecord,
  getCustomerInvoices,
  getUpcomingInvoice,
  createPaymentIntent,
  verifyWebhookSignature,
  getPlanDetails,
  hasFeatureAccess,
  getUsageLimit,
  calculateOverageCharges,
};