import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for trying out our platform',
    features: [
      '60 minutes/month transcription',
      'Basic AI chat',
      'YouTube transcripts (unlimited)',
      'Community support',
      'Watermarked exports'
    ],
    limitations: [
      'No advanced AI features',
      'No team collaboration',
      'No API access'
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    period: 'month',
    description: 'For professionals and content creators',
    features: [
      '500 minutes/month transcription',
      'All AI models (GPT-4, Claude, Gemini)',
      'Advanced summaries & analysis',
      'Sentiment analysis',
      'Topic extraction',
      'Content generation',
      'Priority processing',
      'No watermarks',
      'Email support',
      'Export to all formats'
    ],
    limitations: [],
    cta: 'Start Free Trial',
    popular: true
  },
  {
    id: 'business',
    name: 'Business',
    price: 49,
    period: 'month',
    description: 'For teams and growing businesses',
    features: [
      '2000 minutes/month transcription',
      'Everything in Pro, plus:',
      'Team collaboration (5 users)',
      'Shared workspaces',
      'API access',
      'Custom branding',
      'Zoom/Teams integration',
      'Slack/Discord bots',
      'Priority support',
      'Advanced analytics',
      'Bulk operations'
    ],
    limitations: [],
    cta: 'Start Free Trial',
    popular: false
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: 'custom',
    description: 'For large organizations',
    features: [
      'Unlimited transcription',
      'Everything in Business, plus:',
      'Unlimited team members',
      'White-label solution',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantees',
      'On-premise option',
      'Advanced security',
      'Custom AI models',
      'Training & onboarding'
    ],
    limitations: [],
    cta: 'Contact Sales',
    popular: false
  }
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSelectPlan = async (planId) => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }

    if (planId === 'free') {
      navigate('/dashboard');
      return;
    }

    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@yourdomain.com?subject=Enterprise Plan Inquiry';
      return;
    }

    setLoading(planId);

    try {
      const response = await axios.post(`${API_URL}/api/billing/checkout`, {
        planId
      });

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-base font-semibold text-indigo-600 tracking-wide uppercase">
            Pricing
          </h2>
          <p className="mt-2 text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Choose the perfect plan for you
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Start free, upgrade as you grow. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-12 flex justify-center">
          <div className="relative bg-white rounded-lg p-0.5 flex">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={`${
                billingPeriod === 'monthly'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700'
              } relative py-2 px-6 rounded-md text-sm font-medium whitespace-nowrap focus:outline-none focus:z-10 transition-all`}
            >
              Monthly billing
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('annual')}
              className={`${
                billingPeriod === 'annual'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700'
              } ml-0.5 relative py-2 px-6 rounded-md text-sm font-medium whitespace-nowrap focus:outline-none focus:z-10 transition-all`}
            >
              Annual billing
              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-xl ${
                plan.popular ? 'ring-2 ring-indigo-600' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-4">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-indigo-600 text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                <h3 className="text-2xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-4 text-sm text-gray-500">{plan.description}</p>
                
                <p className="mt-8">
                  {plan.price === null ? (
                    <span className="text-4xl font-extrabold text-gray-900">Custom</span>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-gray-900">
                        ${billingPeriod === 'annual' && plan.price > 0 
                          ? Math.floor(plan.price * 0.8) 
                          : plan.price}
                      </span>
                      <span className="text-base font-medium text-gray-500">
                        /{billingPeriod === 'annual' ? 'month' : plan.period}
                      </span>
                    </>
                  )}
                </p>

                {billingPeriod === 'annual' && plan.price > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Billed ${plan.price * 12 * 0.8}/year
                  </p>
                )}

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading === plan.id}
                  className={`mt-8 w-full py-3 px-6 rounded-lg text-sm font-semibold transition-all ${
                    plan.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  ) : (
                    plan.cta
                  )}
                </button>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="flex-shrink-0 h-6 w-6 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="ml-3 text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, index) => (
                    <li key={`limit-${index}`} className="flex items-start">
                      <svg
                        className="flex-shrink-0 h-6 w-6 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span className="ml-3 text-sm text-gray-400">{limitation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h3 className="text-3xl font-extrabold text-gray-900 text-center">
            Frequently asked questions
          </h3>
          <dl className="mt-12 space-y-10 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 lg:gap-x-8">
            <div>
              <dt className="text-lg leading-6 font-medium text-gray-900">
                Can I change plans later?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                Yes! You can upgrade or downgrade your plan at any time. Changes are prorated automatically.
              </dd>
            </div>
            <div>
              <dt className="text-lg leading-6 font-medium text-gray-900">
                What happens if I exceed my limits?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                You'll be charged $0.10 per additional minute. We'll notify you when you reach 80% of your limit.
              </dd>
            </div>
            <div>
              <dt className="text-lg leading-6 font-medium text-gray-900">
                Is there a free trial?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                Yes! All paid plans include a 14-day free trial. No credit card required to start.
              </dd>
            </div>
            <div>
              <dt className="text-lg leading-6 font-medium text-gray-900">
                Can I cancel anytime?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                Absolutely. Cancel anytime with no penalties. You'll retain access until the end of your billing period.
              </dd>
            </div>
            <div>
              <dt className="text-lg leading-6 font-medium text-gray-900">
                What payment methods do you accept?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                We accept all major credit cards, debit cards, and ACH transfers through Stripe.
              </dd>
            </div>
            <div>
              <dt className="text-lg leading-6 font-medium text-gray-900">
                Do you offer refunds?
              </dt>
              <dd className="mt-2 text-base text-gray-500">
                Yes, we offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your payment.
              </dd>
            </div>
          </dl>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-indigo-700 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-12 sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-indigo-100">
                Join thousands of users who are already transcribing with AI. Start your free trial today.
              </p>
            </div>
            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <button
                  onClick={() => navigate('/signup')}
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 transition-colors"
                >
                  Get started for free
                </button>
              </div>
              <div className="ml-3 inline-flex rounded-md shadow">
                <button
                  onClick={() => window.location.href = 'mailto:sales@yourdomain.com'}
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                  Contact sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}