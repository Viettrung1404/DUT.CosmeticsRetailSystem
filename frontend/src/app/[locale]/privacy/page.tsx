export default function PrivacyPage() {
  return (
    <div className="bg-background min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 bg-surface p-12 rounded-3xl border border-nude/40">
        <h1 className="text-4xl font-bold text-text-primary mb-4">Privacy Policy</h1>
        <p className="text-text-secondary mb-8 pb-6 border-b border-nude/40">Last Updated: October 2026</p>
        
        <div className="prose max-w-none text-text-secondary space-y-6">
          <p>At Glow-Up, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.</p>
          
          <h2 className="text-2xl font-bold text-text-primary mt-8">Information We Collect</h2>
          <p>We collect information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products, or otherwise when you contact us.</p>
          <ul className="list-disc pl-5">
            <li>Personal Data: Name, email address, shipping address, billing address, phone number.</li>
            <li>Payment Data: Credit card information (processed securely via Stripe).</li>
          </ul>

          <h2 className="text-2xl font-bold text-text-primary mt-8">How We Use Your Information</h2>
          <p>We use personal information collected via our website for a variety of business purposes described below:</p>
          <ul className="list-disc pl-5">
            <li>To facilitate account creation and logon process.</li>
            <li>To fulfill and manage your orders, payments, returns, and exchanges.</li>
            <li>To send administrative information to you.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}