import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Billing() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const [subRes, usageRes, invoicesRes] = await Promise.all([
        axios.get(`${API_URL}/api/billing/subscription`),
        axios.get(`${API_URL}/api/usage/stats`),
        axios.get(`${API_URL}/api/billing/invoices`)
      ]);

      setSubscription(subRes.data);
      setUsage(usageRes.data);
      setInvoices(invoicesRes.data.invoices);
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/billing/portal`);
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
      setActionLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    setActionLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/billing/checkout`, { planId });
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Failed to start checkout:', error);
      alert('Failed to start checkout. Please try again.');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const currentPlan = subscription?.plan || 'free';
  const planNames = { free: 'Free', pro: 'Pro', business: 'Business', enterprise: 'Enterprise' };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>

        {/* Current Plan */}
        <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Current Plan</h2>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{planNames[currentPlan]} Plan</p>
                {subscription?.subscription?.status && (
                  <p className="mt-1 text-sm text-gray-500">
                    Status: <span className="capitalize">{subscription.subscription.status}</span>
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                {currentPlan === 'free' ? (
                  <button
                    onClick={() => handleUpgrade('pro')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Upgrade to Pro
                  </button>
                ) : (
                  <button
                    onClick={handleManageBilling}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    Manage Subscription
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        {usage && (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Transcription Usage */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">Transcription Minutes</h3>
              <div className="mt-2">
                <p className="text-3xl font-bold text-gray-900">
                  {usage.transcription?.used || 0}
                  <span className="text-lg font-normal text-gray-500">
                    {usage.transcription?.limit === -1 ? ' / ∞' : ` / ${usage.transcription?.limit}`}
                  </span>
                </p>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      usage.transcription?.percentage > 80 ? 'bg-red-600' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(usage.transcription?.percentage || 0, 100)}%` }}
                  ></div>
                </div>
                {usage.transcription?.isOverLimit && (
                  <p className="mt-2 text-sm text-red-600">
                    Overage charges: ${(usage.transcription.overageCharges / 100).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {/* Storage Usage */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">Storage Used</h3>
              <div className="mt-2">
                <p className="text-3xl font-bold text-gray-900">
                  {usage.storage?.usedMB || 0} MB
                  <span className="text-lg font-normal text-gray-500">
                    {usage.storage?.limitMB === 'Unlimited' ? ' / ∞' : ` / ${usage.storage?.limitMB} MB`}
                  </span>
                </p>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      usage.storage?.percentage > 80 ? 'bg-red-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(usage.storage?.percentage || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* API Calls */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">API Calls</h3>
              <div className="mt-2">
                <p className="text-3xl font-bold text-gray-900">
                  {usage.api?.totalCalls || 0}
                </p>
                <p className="mt-1 text-sm text-gray-500">This month</p>
              </div>
            </div>
          </div>
        )}

        {/* AI Usage */}
        {usage?.ai && (
          <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">AI Model Usage</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Object.entries(usage.ai.byModel).map(([model, count]) => (
                  <div key={model} className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-500 capitalize">{model}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Invoice History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.created * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invoice.amountFormatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {currentPlan === 'free' && (
          <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-8 sm:px-12 sm:py-12">
              <div className="text-center">
                <h2 className="text-3xl font-extrabold text-white">
                  Unlock unlimited potential
                </h2>
                <p className="mt-4 text-lg text-indigo-100">
                  Upgrade to Pro and get 500 minutes/month, all AI models, and advanced features.
                </p>
                <button
                  onClick={() => handleUpgrade('pro')}
                  disabled={actionLoading}
                  className="mt-8 inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 disabled:opacity-50"
                >
                  Upgrade to Pro - $19/month
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}