import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 border border-slate-200">
        <h1 className="text-3xl text-slate-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: June 18, 2026</p>

        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl text-slate-900 mb-3">1. Introduction</h2>
            <p>Welcome to MilkMaster. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website or use our application.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-3">2. The data we collect about you</h2>
            <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
              <li><strong>Transaction Data</strong> includes details about payments and milk collection records.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-3">3. How we use your personal data</h2>
            <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Where we need to perform the contract we are about to enter into or have entered into with you.</li>
              <li>Where it is necessary for our legitimate interests and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal obligation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-3">4. Data Security</h2>
            <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorised way, altered or disclosed.</p>
          </section>

          <section>
            <h2 className="text-xl text-slate-900 mb-3">5. Contact Us</h2>
            <p>If you have any questions about this privacy policy or our privacy practices, please contact us via email at support@milkmaster.chatwizs.com.</p>
          </section>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-100">
          <a href="/" className="text-blue-600 hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
