import React from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 border border-slate-200">
        <h1 className="text-3xl text-slate-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: June 18, 2026</p>

        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl text-slate-900 mb-3">1. Agreement to Terms</h2>
            <p>By accessing or using MilkMaster, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-3">2. Description of Service</h2>
            <p>MilkMaster provides a digital dairy management system that helps farm owners, milk collectors, and customers track their daily records, payments, and inventory.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-3">3. User Accounts</h2>
            <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-3">4. Intellectual Property</h2>
            <p>The Service and its original content, features, and functionality are and will remain the exclusive property of MilkMaster and its licensors.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-3">5. Termination</h2>
            <p>We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-3">6. Changes</h2>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>
          </section>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
