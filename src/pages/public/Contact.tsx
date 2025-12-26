import React from 'react';

const Contact: React.FC = () => {
    // Data for the FAQ section
    const faqs = [
        {
            question: "How do I start?",
            answer: "Simply contact us anytime, and we'll guide you step by step from setup to launch."
        },
        {
            question: "What about pricing?",
            answer: "Our team is available 24/7, responding quickly to keep your communication smooth without delays."
        },
        {
            question: "Is consultation free?",
            answer: "Yes, we work closely with you to develop automated WhatsApp tools that fit your unique workflow and customer base."
        },
        {
            question: "How fast is support?",
            answer: "Yes, we offer free consultations to understand your needs before you commit."
        },
        {
            question: "Can you customize solutions?",
            answer: "We offer flexible plans tailored to your business size and needs for great value."
        }
    ];

    return (
        <div className="w-full font-sans text-gray-800">

            {/* 1. Hero Section */}
            <div className="bg-[#0B1221] text-white text-center py-20 px-4">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
                <p className="text-gray-400 text-lg">
                    Need help with Wappie AI? Our team is ready to assist you anytime.
                </p>
            </div>

            <div className="max-w-6xl mx-auto px-6">

                {/* 2. Main Contact Form Section */}
                <section className="py-16">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold mb-2">Contact Wappie AI</h2>
                        <p className="text-gray-500 text-sm">Questions? We're here 24/7 to help.</p>
                    </div>

                    <div className="flex flex-col md:flex-row rounded-2xl overflow-hidden shadow-lg h-auto min-h-[500px]">

                        {/* Left: Form */}
                        <div className="w-full md:w-1/2 bg-[#EFF1F5] p-8 md:p-12 flex flex-col justify-center">
                            <form className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter full name"
                                        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message*</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Write your message"
                                        className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                                    ></textarea>
                                </div>
                                <button
                                    type="button"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full transition-colors w-fit"
                                >
                                    Send Message
                                </button>
                            </form>
                        </div>

                        {/* Right: Image */}
                        <div className="w-full md:w-1/2 relative">
                            <img
                                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80"
                                alt="Support Team"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </section>

                {/* 3. FAQ Section */}
                <section className="py-16 border-t border-gray-100">
                    <div className="grid md:grid-cols-3 gap-10">
                        <div className="md:col-span-1">
                            <h3 className="text-2xl font-bold text-gray-900">Got questions?</h3>
                        </div>
                        <div className="md:col-span-2 space-y-8">
                            {faqs.map((faq, index) => (
                                <div key={index}>
                                    <h4 className="text-base font-semibold text-gray-900 mb-2">{faq.question}</h4>
                                    <p className="text-sm text-gray-500 leading-relaxed">{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 4. Footer Info */}
                <section className="py-16 text-center space-y-8">
                    <div>
                        <h3 className="text-2xl font-bold mb-3">Contact Us</h3>
                        <p className="text-gray-500 text-xs max-w-md mx-auto">
                            Have questions or need help? Our team is ready to assist you with your WhatsApp automation needs.
                        </p>
                    </div>

                    <div className="space-y-6 text-sm">
                        <div>
                            <p className="font-bold text-gray-900 mb-1">Email</p>
                            <p className="text-gray-600">account@wappie.shop</p>
                        </div>

                        <div>
                            <p className="font-bold text-gray-900 mb-1">Address</p>
                            <p className="text-gray-600 max-w-xs mx-auto">
                                RAINMAKERS WORKSPACE<br />
                                2ND FLOOR RAHEJA ARCADE, UNIT 201 TO 210<br />
                                5TH BLOCK KORAMANGALA,<br />
                                Bangalore, Karnataka, India - 560095
                            </p>
                        </div>

                        <div>
                            <p className="font-bold text-gray-900 mb-1">Phone</p>
                            <p className="text-gray-600">+91 9163158988</p>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default Contact;