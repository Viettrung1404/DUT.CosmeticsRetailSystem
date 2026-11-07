export default function ShippingPage() {
  return (
    <div className="bg-background min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 bg-surface p-12 rounded-3xl border border-nude/40">
        <h1 className="text-4xl font-bold text-text-primary mb-8 border-b border-nude/40 pb-6">Shipping Policy</h1>
        
        <div className="prose max-w-none text-text-secondary space-y-6">
          <h2 className="text-2xl font-bold text-text-primary mt-8">Domestic Shipping</h2>
          <p>We offer complimentary standard shipping on all domestic orders over $50. For orders under $50, a flat rate of $5.95 applies.</p>
          
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Standard:</strong> 3-5 business days</li>
            <li><strong>Expedited:</strong> 2 business days ($15)</li>
            <li><strong>Overnight:</strong> 1 business day ($25)</li>
          </ul>

          <h2 className="text-2xl font-bold text-text-primary mt-12">International Shipping</h2>
          <p>We ship globally to select countries. Duties and taxes are calculated at checkout and are the responsibility of the customer. International shipping typically takes 7-14 business days depending on customs.</p>
          
          <h2 className="text-2xl font-bold text-text-primary mt-12">Order Processing</h2>
          <p>Orders placed before 1 PM EST Monday-Friday will typically ship the same day. Orders placed on weekends or holidays will process the following business day.</p>
        </div>
      </div>
    </div>
  );
}