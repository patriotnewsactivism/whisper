# 💰 Monetization Setup Guide

This guide will help you set up the complete monetization system for your AI transcription platform.

## 🎯 Overview

The monetization system includes:
- ✅ Stripe payment processing
- ✅ Subscription management (Free, Pro, Business, Enterprise)
- ✅ Usage tracking and limits
- ✅ Overage billing
- ✅ API access control
- ✅ Feature gating based on plans

## 📋 Prerequisites

1. **Stripe Account**
   - Sign up at https://stripe.com
   - Get your API keys (test and live)

2. **Database** (Choose one)
   - PostgreSQL (recommended)
   - MongoDB
   - MySQL

3. **Node.js** (v18+)

4. **Environment Variables**

## 🚀 Step-by-Step Setup

### Step 1: Stripe Configuration

1. **Create Stripe Account**
   ```
   Go to https://stripe.com and sign up
   ```

2. **Get API Keys**
   ```
   Dashboard → Developers → API keys
   - Publishable key (starts with pk_)
   - Secret key (starts with sk_)
   ```

3. **Create Products & Prices**
   
   **Pro Plan ($19/month)**
   ```
   Dashboard → Products → Add Product
   Name: Pro Plan
   Price: $19.00 USD
   Billing: Recurring monthly
   Copy the Price ID (starts with price_)
   ```

   **Business Plan ($49/month)**
   ```
   Dashboard → Products → Add Product
   Name: Business Plan
   Price: $49.00 USD
   Billing: Recurring monthly
   Copy the Price ID (starts with price_)
   ```

4. **Set up Webhooks**
   ```
   Dashboard → Developers → Webhooks → Add endpoint
   
   Endpoint URL: https://yourdomain.com/api/billing/webhook
   
   Events to listen for:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.paid
   - invoice.payment_failed
   
   Copy the Webhook Secret (starts with whsec_)
   ```

### Step 2: Environment Variables

Create a `.env` file in your server directory:

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
STRIPE_BUSINESS_PRICE_ID=price_your_business_price_id

# Database (PostgreSQL example)
DATABASE_URL=postgresql://user:password@localhost:5432/transcription_db

# Transcription Services
ELEVATEAI_API_KEY=your_elevateai_key
ASSEMBLYAI_API_KEY=your_assemblyai_key
OPENAI_API_KEY=your_openai_key

# AI Bot Services
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Step 3: Database Setup

#### Option A: PostgreSQL (Recommended)

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu
   sudo apt-get install postgresql
   
   # Windows
   Download from https://www.postgresql.org/download/
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE transcription_db;
   ```

3. **Create Tables**
   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     name VARCHAR(255),
     stripe_customer_id VARCHAR(255),
     plan_id VARCHAR(50) DEFAULT 'free',
     subscription_id VARCHAR(255),
     subscription_status VARCHAR(50),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Usage table
   CREATE TABLE usage (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id),
     month VARCHAR(7) NOT NULL, -- YYYY-MM
     transcription_minutes INTEGER DEFAULT 0,
     api_calls INTEGER DEFAULT 0,
     storage_used BIGINT DEFAULT 0,
     ai_requests JSONB DEFAULT '{}',
     features JSONB DEFAULT '{}',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE(user_id, month)
   );

   -- Transcriptions table
   CREATE TABLE transcriptions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id),
     title VARCHAR(255),
     source_type VARCHAR(50), -- 'upload', 'youtube', 'recording'
     source_url TEXT,
     duration_minutes DECIMAL(10, 2),
     status VARCHAR(50), -- 'processing', 'completed', 'failed'
     transcript TEXT,
     metadata JSONB,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Invoices table
   CREATE TABLE invoices (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id),
     stripe_invoice_id VARCHAR(255) UNIQUE,
     amount INTEGER NOT NULL,
     currency VARCHAR(3) DEFAULT 'usd',
     status VARCHAR(50),
     paid_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Create indexes
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
   CREATE INDEX idx_usage_user_month ON usage(user_id, month);
   CREATE INDEX idx_transcriptions_user ON transcriptions(user_id);
   CREATE INDEX idx_invoices_user ON invoices(user_id);
   ```

#### Option B: MongoDB

```javascript
// User Schema
{
  _id: ObjectId,
  email: String (unique),
  passwordHash: String,
  name: String,
  stripeCustomerId: String,
  planId: String (default: 'free'),
  subscriptionId: String,
  subscriptionStatus: String,
  createdAt: Date,
  updatedAt: Date
}

// Usage Schema
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  month: String, // YYYY-MM
  transcriptionMinutes: Number,
  apiCalls: Number,
  storageUsed: Number,
  aiRequests: Object,
  features: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### Step 4: Install Dependencies

```bash
cd server
npm install stripe jsonwebtoken bcryptjs pg
```

### Step 5: Update Server Configuration

Add to your `server/index.js`:

```javascript
const billingRoutes = require('./routes/billing');
const { authenticate } = require('./middleware/auth');
const { checkUsageLimit, requireFeature } = require('./middleware/subscription');

// Billing routes
app.use('/api/billing', billingRoutes);

// Protected transcription endpoint with usage check
app.post('/api/transcribe', 
  authenticate,
  checkUsageLimit('transcriptionMinutes', 1),
  upload.single('audio'), 
  async (req, res) => {
    // Your transcription logic here
  }
);

// Protected AI features
app.post('/api/ai-bot',
  authenticate,
  requireFeature('advancedFeatures'),
  async (req, res) => {
    // Your AI bot logic here
  }
);
```

### Step 6: Frontend Integration

1. **Install Stripe.js**
   ```bash
   cd client
   npm install @stripe/stripe-js @stripe/react-stripe-js
   ```

2. **Create Stripe Context**
   ```javascript
   // client/src/contexts/StripeContext.jsx
   import { loadStripe } from '@stripe/stripe-js';
   import { Elements } from '@stripe/react-stripe-js';

   const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

   export function StripeProvider({ children }) {
     return (
       <Elements stripe={stripePromise}>
         {children}
       </Elements>
     );
   }
   ```

3. **Add to main app**
   ```javascript
   // client/src/main.jsx
   import { StripeProvider } from './contexts/StripeContext';

   ReactDOM.createRoot(document.getElementById('root')).render(
     <StripeProvider>
       <App />
     </StripeProvider>
   );
   ```

### Step 7: Testing

1. **Test Mode**
   - Use Stripe test keys (sk_test_... and pk_test_...)
   - Use test card: 4242 4242 4242 4242
   - Any future expiry date
   - Any 3-digit CVC

2. **Test Webhooks Locally**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login
   stripe login
   
   # Forward webhooks to local server
   stripe listen --forward-to localhost:3001/api/billing/webhook
   ```

3. **Test Subscription Flow**
   - Sign up for free account
   - Upgrade to Pro plan
   - Check usage limits
   - Test overage scenarios
   - Cancel subscription
   - Check downgrade to free

### Step 8: Go Live

1. **Switch to Live Keys**
   - Replace test keys with live keys in `.env`
   - Update webhook endpoint to production URL

2. **Security Checklist**
   - ✅ Use HTTPS in production
   - ✅ Validate webhook signatures
   - ✅ Sanitize user inputs
   - ✅ Rate limit API endpoints
   - ✅ Use strong JWT secrets
   - ✅ Enable CORS properly
   - ✅ Set up monitoring and alerts

3. **Compliance**
   - ✅ Add Terms of Service
   - ✅ Add Privacy Policy
   - ✅ Add Refund Policy
   - ✅ GDPR compliance (if EU users)
   - ✅ PCI compliance (handled by Stripe)

## 💡 Usage Examples

### Check if user can transcribe

```javascript
const { canPerformAction } = require('./services/usage-service');

const check = canPerformAction(userId, 'transcriptionMinutes', 5);
if (!check.allowed) {
  return res.status(429).json({
    error: 'Usage limit exceeded',
    message: check.reason
  });
}
```

### Track transcription usage

```javascript
const { trackTranscription } = require('./services/usage-service');

const result = trackTranscription(userId, durationMinutes);
console.log(`Used: ${result.usage}/${result.limit} minutes`);
```

### Check feature access

```javascript
const { hasFeatureAccess } = require('./services/stripe-service');

if (!hasFeatureAccess(userPlan, 'advancedFeatures')) {
  return res.status(403).json({
    error: 'Feature not available in your plan'
  });
}
```

## 📊 Monitoring

### Key Metrics to Track

1. **Revenue Metrics**
   - Monthly Recurring Revenue (MRR)
   - Churn rate
   - Customer Lifetime Value (LTV)

2. **Usage Metrics**
   - Average transcription minutes per user
   - Feature adoption rates
   - API usage patterns

3. **Conversion Metrics**
   - Free to paid conversion rate
   - Trial to paid conversion rate
   - Upgrade rate (Pro to Business)

### Stripe Dashboard

Monitor in real-time:
- Revenue
- Active subscriptions
- Failed payments
- Churn
- Customer analytics

## 🆘 Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is correct
   - Verify webhook secret matches
   - Check server logs for errors
   - Test with Stripe CLI

2. **Payment fails**
   - Check Stripe logs
   - Verify card details
   - Check for 3D Secure requirements
   - Review declined payment reasons

3. **Usage not tracking**
   - Verify user authentication
   - Check usage service initialization
   - Review database connections
   - Check for errors in logs

## 📚 Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [SCA/3D Secure](https://stripe.com/docs/strong-customer-authentication)

## 🎯 Next Steps

1. ✅ Complete database setup
2. ✅ Configure Stripe products
3. ✅ Set up webhooks
4. ✅ Test subscription flow
5. ✅ Build pricing page UI
6. ✅ Build billing dashboard UI
7. ✅ Add email notifications
8. ✅ Set up monitoring
9. ✅ Launch to production

---

**Need Help?** Check the troubleshooting section or reach out for support.

**Ready to make money?** Let's go! 🚀💰