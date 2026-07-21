import React, { useState } from 'react';
import { Sparkles, Check, CreditCard, Loader2 } from 'lucide-react';

interface SubscribeScreenProps {
  userEmail: string;
}

export default function SubscribeScreen({ userEmail }: SubscribeScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize Stripe checkout.');
      }

      if (data.url) {
        // Redirect directly to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received from Stripe integration.');
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Unable to start Stripe checkout session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#050505] px-4 py-8 relative">
      {/* Background radial effects */}
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[90px]" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
          {/* Subtle top premium gradient highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500" />

          {/* Premium Logo Icon */}
          <div className="flex flex-col items-center text-center gap-2 mb-8">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-xl shadow-indigo-500/20 animate-pulse">
              <Sparkles className="w-6 h-6 fill-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-3">
              Unlock Unlimited Streamo<span className="text-indigo-500">Flix</span>
            </h1>
            <p className="text-xs text-white/50 max-w-sm">
              Account created successfully for <span className="text-indigo-400 font-medium">{userEmail}</span>. Complete your subscription to start watching.
            </p>
          </div>

          {/* Subscription Package Card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Premium Monthly Plan</span>
                <h3 className="text-3xl font-black text-white mt-1">
                  $9.99<span className="text-xs text-white/40 font-normal">/month</span>
                </h3>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded">
                Cancel Anytime
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-0.5 rounded-full shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-white/80 leading-snug">
                  Watch all blockbuster <span className="font-semibold text-white">Movies & Series</span> with no restrictions.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-0.5 rounded-full shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-white/80 leading-snug">
                  High-speed global custom servers (<span className="font-semibold text-white">Server 1, Server 2, Server 3</span>, etc.) with zero ads.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-0.5 rounded-full shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-white/80 leading-snug">
                  Full access to complete seasons and individual episodes.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-emerald-500/10 text-emerald-400 p-0.5 rounded-full shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-white/80 leading-snug">
                  HD Streams and responsive multi-device player formats.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-xl shadow-indigo-500/20 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initializing Secure Checkout...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Subscribe via Stripe
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-white/30 mt-4 leading-normal">
            By clicking Subscribe, you will be redirected to our Stripe test checkout gateway to complete the payment authorization. No real charges are made.
          </p>
        </div>
      </div>
    </div>
  );
}
