export default function ReturnsPage() {
  return (
    <div className="bg-background min-h-screen py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 bg-surface p-12 rounded-3xl border border-nude/40">
        <h1 className="text-4xl font-bold text-text-primary mb-8 border-b border-nude/40 pb-6">Returns & Exchanges</h1>
        
        <div className="prose max-w-none text-text-secondary space-y-6">
          <p className="text-lg">We want you to be completely satisfied with your Glow-Up purchase. If you are not entirely happy, we are here to help.</p>

          <h2 className="text-2xl font-bold text-text-primary mt-8">Our 30-Day Guarantee</h2>
          <p>We accept returns of gently used or unopened items within 30 days of the original purchase date for a full refund to your original form of payment.</p>
          
          <h2 className="text-2xl font-bold text-text-primary mt-8">How to Return</h2>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Log into your Glow-Up account and navigate to Order History.</li>
            <li>Select the order containing the item(s) you wish to return.</li>
            <li>Click "Start a Return" and follow the prompts to generate a prepaid shipping label.</li>
            <li>Package your items securely and attach the label.</li>
            <li>Drop off at any authorized carrier location.</li>
          </ol>

          <div className="mt-12 text-center">
            <button className="bg-primary-rose text-white px-8 py-3 rounded-full font-bold hover:bg-primary-rose/90 transition">Start a Return</button>
          </div>
        </div>
      </div>
    </div>
  );
}