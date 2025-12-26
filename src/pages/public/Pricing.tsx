import React from 'react';

const Pricing: React.FC = () => {
    // Pricing Plan Data
    const plans = [
        {
            name: "Growth",
            price: "₹2,499",
            features: "2,000 contacts, AI chatbots, priority support included."
        },
        {
            name: "Free Plan",
            price: "Free",
            features: "50 contacts, 10 broadcasts, basic templates included."
        },
        {
            name: "Starter",
            price: "₹999",
            features: "500 contacts, 1,000 messages, chatbot builder access."
        }
    ];

    // FAQ Data
    const faqs = [
        {
            question: "What plans do you offer?",
            answer: "We have Free, Starter, Growth, Business, and Enterprise plans to fit your needs."
        },
        {
            question: "Is there a free trial?",
            answer: "Yes, the Free plan includes 50 contacts, 10 broadcasts, and basic templates to get started."
        },
        {
            question: "Can I upgrade my plan anytime?",
            answer: "Absolutely! You can start free and scale up whenever you need more contacts, messages, or features."
        },
        {
            question: "Are there any hidden charges?",
            answer: "No hidden fees—our pricing is simple and transparent for every business."
        },
        {
            question: "Do all plans include WhatsApp API?",
            answer: "Yes, every plan comes with the official WhatsApp API and analytics."
        },
        {
            question: "What support options are available?",
            answer: "Support ranges from onboarding in Free to 24/7 help in Enterprise, with priority support on Growth and Business."
        }
    ];

    return (
        <div className="w-full font-sans text-gray-800 bg-gray-50">

            {/* 1. Hero Section */}
            <div className="bg-[#0B1221] text-white text-center py-20 px-4">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple Pricing</h1>
                <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
                    Start free, scale easily with transparent plans and no hidden fees.
                </p>
            </div>

            {/* 2. Main Pricing Section */}
            <section className="max-w-6xl mx-auto px-6 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-2">Simple Pricing</h2>
                    <p className="text-gray-500 text-sm">Start free, scale ready with clear plans and no hidden fees.</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-12">
                    {/* Left: Image */}
                    <div className="w-full md:w-1/2">
                        <img
                            src="https://images.unsplash.com/photo-1623295080944-9ba74d587748?auto=format&fit=crop&w=612&h=440"
                            alt="Mobile App Interface"
                            className="rounded-xl shadow-xl w-full object-cover max-h-[400px]"
                        />
                    </div>

                    {/* Right: Plans List */}
                    <div className="w-full md:w-1/2 space-y-8">
                        {plans.map((plan, index) => (
                            <div key={index} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                                    <span className="text-lg font-bold text-gray-900">{plan.price}</span>
                                </div>
                                <p className="text-gray-500 text-sm">{plan.features}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3. FAQ Section */}
            <section className="bg-white py-16">
                <div className="max-w-6xl mx-auto px-6">
                    <h2 className="text-3xl font-bold mb-10 text-left">FAQs</h2>
                    <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
                        {faqs.map((faq, index) => (
                            <div key={index}>
                                <h4 className="font-bold text-gray-900 mb-2 text-sm md:text-base">{faq.question}</h4>
                                <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. Newsletter / Footer CTA */}
            <section className="py-20 bg-white border-t border-gray-100 text-center">
                <div className="max-w-md mx-auto px-6">
                    <h2 className="text-2xl font-bold mb-2">Simple Pricing Plans</h2>
                    <p className="text-gray-400 text-xs mb-8">Start free, scale with no hidden fees.</p>

                    <form className="flex flex-col items-start gap-2">
                        <label className="text-xs font-bold text-gray-700 ml-1">Your Email</label>
                        <input
                            type="email"
                            placeholder="Enter email"
                            className="w-full p-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-black"
                        />
                        <div className="w-full flex justify-center mt-4">
                            <button
                                type="button"
                                className="bg-black text-white text-xs font-bold py-3 px-10 rounded-full hover:bg-gray-800 transition-colors"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            </section>

        </div>
    );
};

export default Pricing;