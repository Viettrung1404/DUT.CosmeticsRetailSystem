export default function TermsPage() {
  return (
    <div className="bg-background min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 bg-surface p-12 rounded-3xl border border-nude/40">
        <h1 className="text-4xl font-bold text-text-primary mb-4">Terms of Service</h1>
        <p className="text-text-secondary mb-8 pb-6 border-b border-nude/40">Last Updated: October 2026</p>
        
        <div className="prose max-w-none text-text-secondary space-y-6">
          <p>These terms of service ("Terms") govern your use of the Glow-Up website and the services, features, content, or applications we offer.</p>
          
          <h2 className="text-2xl font-bold text-text-primary mt-8">1. Acceptance of Terms</h2>
          <p>By accessing our website, you agree to be bound by these Terms of Service and to use the site in accordance with these Terms, our Privacy Policy, and any additional terms and conditions.</p>

          <h2 className="text-2xl font-bold text-text-primary mt-8">2. Products and Pricing</h2>
          <p>All products listed on our website are subject to availability. We reserve the right to discontinue any product at any time. Prices for all products are subject to change.</p>

          <h2 className="text-2xl font-bold text-text-primary mt-8">3. User Accounts</h2>
          <p>You may be required to register with the site. You agree to keep your password confidential and will be responsible for all use of your account and password.</p>
        </div>
      </div>
    </div>
  );
}