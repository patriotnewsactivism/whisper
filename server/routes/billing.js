const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  createCheckoutSession,
  createBillingPortalSession,
  getSubscription,
  cancelSubscription,
  updateSubscription,
  getCustomerInvoices,
  getUpcomingInvoice,
  verifyWebhookSignature,
  PLANS
} = require('../services/stripe-service');
const { updatePlan, resetUsage } = require('../services/usage-service');

/**
 * Get available pricing plans
 */
router.get('/plans', (req, res) => {
  try {
    const plans = Object.entries(PLANS).map(([id, plan]) => ({
      id,
      name: plan.name,
      price: plan.price,
      priceFormatted: plan.price ? `$${(plan.price / 100).toFixed(2)}` : 'Custom',
      features: plan.features
    }));
    
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      error: 'Failed to fetch plans',
      message: error.message
    });
  }
});

/**
 * Create checkout session for subscription
 */
router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { planId } = req.body;
    
    if (!planId || !PLANS[planId]) {
      return res.status(400).json({
        error: 'Invalid plan',
        message: 'Please select a valid plan'
      });
    }
    
    const plan = PLANS[planId];
    
    if (!plan.priceId) {
      return res.status(400).json({
        error: 'Invalid plan',
        message: 'This plan cannot be purchased online. Please contact sales.'
      });
    }
    
    // TODO: Get user's Stripe customer ID from database
    const customerId = req.user.stripeCustomerId;
    
    if (!customerId) {
      return res.status(400).json({
        error: 'Customer not found',
        message: 'Please complete your profile first'
      });
    }
    
    const successUrl = `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/pricing`;
    
    const session = await createCheckoutSession(
      customerId,
      plan.priceId,
      successUrl,
      cancelUrl
    );
    
    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message
    });
  }
});

/**
 * Create billing portal session
 */
router.post('/portal', authenticate, async (req, res) => {
  try {
    // TODO: Get user's Stripe customer ID from database
    const customerId = req.user.stripeCustomerId;
    
    if (!customerId) {
      return res.status(400).json({
        error: 'Customer not found',
        message: 'Please complete your profile first'
      });
    }
    
    const returnUrl = `${process.env.FRONTEND_URL}/billing`;
    
    const session = await createBillingPortalSession(customerId, returnUrl);
    
    res.json({
      url: session.url
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      message: error.message
    });
  }
});

/**
 * Get current subscription
 */
router.get('/subscription', authenticate, async (req, res) => {
  try {
    // TODO: Get user's subscription ID from database
    const subscriptionId = req.user.subscriptionId;
    
    if (!subscriptionId) {
      return res.json({
        subscription: null,
        plan: 'free'
      });
    }
    
    const subscription = await getSubscription(subscriptionId);
    
    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
      },
      plan: req.user.planId || 'free'
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription',
      message: error.message
    });
  }
});

/**
 * Cancel subscription
 */
router.post('/subscription/cancel', authenticate, async (req, res) => {
  try {
    const { immediately } = req.body;
    
    // TODO: Get user's subscription ID from database
    const subscriptionId = req.user.subscriptionId;
    
    if (!subscriptionId) {
      return res.status(400).json({
        error: 'No subscription found',
        message: 'You do not have an active subscription'
      });
    }
    
    const subscription = await cancelSubscription(subscriptionId, immediately);
    
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
      },
      message: immediately 
        ? 'Subscription canceled immediately' 
        : 'Subscription will be canceled at the end of the billing period'
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      message: error.message
    });
  }
});

/**
 * Update subscription (upgrade/downgrade)
 */
router.post('/subscription/update', authenticate, async (req, res) => {
  try {
    const { newPlanId } = req.body;
    
    if (!newPlanId || !PLANS[newPlanId]) {
      return res.status(400).json({
        error: 'Invalid plan',
        message: 'Please select a valid plan'
      });
    }
    
    const newPlan = PLANS[newPlanId];
    
    if (!newPlan.priceId) {
      return res.status(400).json({
        error: 'Invalid plan',
        message: 'This plan cannot be purchased online. Please contact sales.'
      });
    }
    
    // TODO: Get user's subscription ID from database
    const subscriptionId = req.user.subscriptionId;
    
    if (!subscriptionId) {
      return res.status(400).json({
        error: 'No subscription found',
        message: 'Please subscribe first'
      });
    }
    
    const subscription = await updateSubscription(subscriptionId, newPlan.priceId);
    
    // Update user's plan in usage tracking
    updatePlan(req.user.userId, newPlanId);
    
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status
      },
      newPlan: newPlanId,
      message: 'Subscription updated successfully'
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      error: 'Failed to update subscription',
      message: error.message
    });
  }
});

/**
 * Get invoices
 */
router.get('/invoices', authenticate, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // TODO: Get user's Stripe customer ID from database
    const customerId = req.user.stripeCustomerId;
    
    if (!customerId) {
      return res.json({ invoices: [] });
    }
    
    const invoices = await getCustomerInvoices(customerId, parseInt(limit));
    
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount: invoice.amount_paid,
      amountFormatted: `$${(invoice.amount_paid / 100).toFixed(2)}`,
      currency: invoice.currency,
      created: invoice.created,
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url
    }));
    
    res.json({ invoices: formattedInvoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      error: 'Failed to fetch invoices',
      message: error.message
    });
  }
});

/**
 * Get upcoming invoice
 */
router.get('/invoices/upcoming', authenticate, async (req, res) => {
  try {
    // TODO: Get user's Stripe customer ID from database
    const customerId = req.user.stripeCustomerId;
    
    if (!customerId) {
      return res.json({ invoice: null });
    }
    
    const invoice = await getUpcomingInvoice(customerId);
    
    res.json({
      invoice: {
        amount: invoice.amount_due,
        amountFormatted: `$${(invoice.amount_due / 100).toFixed(2)}`,
        currency: invoice.currency,
        periodStart: invoice.period_start,
        periodEnd: invoice.period_end,
        nextPaymentAttempt: invoice.next_payment_attempt
      }
    });
  } catch (error) {
    console.error('Error fetching upcoming invoice:', error);
    res.status(500).json({
      error: 'Failed to fetch upcoming invoice',
      message: error.message
    });
  }
});

/**
 * Stripe webhook handler
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    
    const event = verifyWebhookSignature(req.body, signature, webhookSecret);
    
    console.log('Webhook event received:', event.type);
    
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log('Unhandled event type:', event.type);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      error: 'Webhook error',
      message: error.message
    });
  }
});

/**
 * Webhook event handlers
 */

async function handleCheckoutCompleted(session) {
  console.log('Checkout completed:', session.id);
  // TODO: Update user's subscription in database
  // TODO: Send welcome email
}

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  // TODO: Update user's subscription in database
  // TODO: Initialize usage tracking
  // TODO: Send confirmation email
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  // TODO: Update user's subscription in database
  // TODO: Update usage limits
  // TODO: Send notification email
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);
  // TODO: Update user's subscription in database
  // TODO: Downgrade to free plan
  // TODO: Send cancellation email
}

async function handleInvoicePaid(invoice) {
  console.log('Invoice paid:', invoice.id);
  // TODO: Reset usage for new billing period
  // TODO: Send receipt email
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed:', invoice.id);
  // TODO: Send payment failed email
  // TODO: Notify user to update payment method
}

module.exports = router;