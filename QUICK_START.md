# 🚀 Quick Start Guide - Get to Revenue in 30 Minutes!

You're **90% done**! Here's exactly what to do to start accepting payments.

## ✅ What's Already Done

- ✅ Complete monetization system
- ✅ User authentication
- ✅ Pricing page
- ✅ Billing dashboard
- ✅ Usage tracking
- ✅ Stripe integration
- ✅ Database schema
- ✅ All API endpoints

## 🎯 30-Minute Setup Checklist

### Step 1: Install Dependencies (2 minutes)

```bash
# Root dependencies
npm install bcryptjs jsonwebtoken pg stripe

# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install axios react-router-dom
cd ..
```

### Step 2: Database Setup (5 minutes)

**Option A: Supabase (Recommended - FREE & Easy)**

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project
4. Wait 2 minutes for setup
5. Go to Settings → Database
6. Copy the "Connection string" (URI format)
7. Add to `.env`:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT].supabase.co:5432/postgres
   ```

**Option B: Local PostgreSQL**

```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or
sudo apt-get install postgresql  # Ubuntu

# Create database
createdb transcription_db

# Add to .env
DATABASE_URL=postgresql://localhost:5432/transcription_db
```

### Step 3: Stripe Setup (10 minutes)

1. **Create Stripe Account**
   - Go to [stripe.com](https://stripe.com)
   - Sign up (it's free)
   - Complete verification

2. **Get API Keys**
   - Go to Developers → API keys
   - Copy "Publishable key" (starts with `pk_test_`)
   - Copy "Secret key" (starts with `sk_test_`)

3. **Create Products**
   
   **Pro Plan:**
   - Go to Products → Add Product
   - Name: "Pro Plan"
   - Price: $19.00 USD
   - Billing: Recurring monthly
   - Click "Save product"
   - Copy the Price ID (starts with `price_`)

   **Business Plan:**
   - Go to Products → Add Product
   - Name: "Business Plan"
   - Price: $49.00 USD
   - Billing: Recurring monthly
   - Click "Save product"
   - Copy the Price ID (starts with `price_`)

4. **Set up Webhook**
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://yourdomain.com/api/billing/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
   - Click "Add endpoint"
   - Copy the "Signing secret" (starts with `whsec_`)

### Step 4: Environment Variables (3 minutes)

Create `.env` file in the root directory:

```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-random
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=your_database_url_from_step_2

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
STRIPE_BUSINESS_PRICE_ID=price_your_business_price_id

# Transcription Services
ELEVATEAI_API_KEY=your_elevateai_key
ASSEMBLYAI_API_KEY=your_assemblyai_key
OPENAI_API_KEY=your_openai_key

# AI Bot Services
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key
```

Create `client/.env` file:

```env
VITE_API_URL=http://localhost:3001
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### Step 5: Update Client Routes (5 minutes)

Update `client/src/main.jsx`:

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Pricing from './pages/Pricing';
import Billing from './pages/Billing';
import './index.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute>
              <Billing />
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### Step 6: Test Locally (5 minutes)

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Start client
cd client
npm run dev
```

**Test the flow:**
1. Go to http://localhost:5173
2. Click "Sign up"
3. Create an account
4. Go to Pricing page
5. Click "Upgrade to Pro"
6. Use test card: `4242 4242 4242 4242`
7. Any future date, any CVC
8. Complete checkout
9. Check billing dashboard

### Step 7: Deploy (Optional - 10 minutes)

**Netlify Deployment:**

```bash
# Build client
cd client
npm run build

# Deploy to Netlify
netlify deploy --prod

# Add environment variables in Netlify dashboard
```

**Server Deployment (Railway/Render):**

1. Push code to GitHub
2. Connect to Railway/Render
3. Add environment variables
4. Deploy!

## 🎉 You're Done!

You can now:
- ✅ Accept user signups
- ✅ Process payments
- ✅ Manage subscriptions
- ✅ Track usage
- ✅ Bill customers
- ✅ **MAKE MONEY!** 💰

## 🧪 Testing with Stripe Test Mode

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

**Test Webhooks Locally:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3001/api/billing/webhook
```

## 📊 Monitor Your Revenue

**Stripe Dashboard:**
- Revenue: https://dashboard.stripe.com/revenue
- Customers: https://dashboard.stripe.com/customers
- Subscriptions: https://dashboard.stripe.com/subscriptions

## 🆘 Troubleshooting

**Database connection fails:**
- Check DATABASE_URL is correct
- Ensure database is running
- Check firewall settings

**Stripe checkout fails:**
- Verify API keys are correct
- Check webhook is configured
- Ensure price IDs match

**Authentication issues:**
- Check JWT_SECRET is set
- Verify token is being sent
- Check CORS settings

## 🚀 Next Steps

Now that you're accepting payments, you can:
1. Add more features
2. Improve UI/UX
3. Add marketing pages
4. Launch on Product Hunt
5. Scale to $100k MRR!

---

**Need help?** Check the full documentation in MONETIZATION_SETUP.md

**Ready to go live?** Switch to Stripe live keys and deploy!

**Let's make money!** 💰🚀