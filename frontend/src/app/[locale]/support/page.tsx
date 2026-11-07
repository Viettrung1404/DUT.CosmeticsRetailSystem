export default function SupportPage() {
  const faqs = [
    { q: "How do I track my order?", a: "Once your order ships, you will receive an email with tracking information. You can also track your order via the 'Orders' tab in your Account dashboard." },
    { q: "Can I change or cancel my order?", a: "Because we process orders quickly, we cannot guarantee cancellations or modifications. However, please contact our concierge immediately and we will do our best to accommodate you." },
    { q: "Do you offer consultations?", a: "Yes, our expert estheticians are available for complimentary virtual or in-store consultations to help you build the perfect routine." },
  ];

  return (
    <div className="bg-background min-h-screen py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-text-primary text-center mb-12">Customer Support</h1>
        
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-surface p-6 rounded-2xl border border-nude/40">
              <h3 className="text-lg font-bold text-text-primary mb-2">{faq.q}</h3>
              <p className="text-text-secondary">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center bg-primary-pink/10 p-10 rounded-3xl border border-primary-rose/20">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Still need help?</h2>
          <p className="text-text-secondary mb-6">Our concierge team is available Monday through Friday, 9am to 6pm EST.</p>
          <button className="bg-text-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-rose transition">Contact Concierge</button>
        </div>
      </div>
    </div>
  );
}