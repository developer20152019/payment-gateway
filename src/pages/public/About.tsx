import React, { useState } from 'react';

// Team image constant
const teamImage = 'https://images.unsplash.com/photo-1603201667141-5a2d4c673378?auto=format&fit=crop&w=1224&h=424';

interface FaqItem {
    question: string;
    answer: string;
}

const faqs: FaqItem[] = [
    { question: "What is Wappie AI?", answer: "Wappie AI powers automated WhatsApp chats for businesses worldwide, helping you connect with customers instantly." },
    { question: "How do I start?", answer: "Sign up with us, get free queries, and follow our simple verification and setup steps to launch your bot." },
    { question: "What benefits can I expect?", answer: "Wappie AI manages open rates, provides 24/7 automated support, and delivers personalized communication at scale." },
    { question: "Is WhatsApp API access included?", answer: "Yes, we offer official WhatsApp Business API access to all our customers." },
    { question: "Do you offer global support?", answer: "Absolutely, we support businesses across 60+ countries worldwide with multilingual capabilities." },
];

const About: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleFaq = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="w-full bg-gray-50 min-h-screen font-sans text-gray-800">

            {/* 1. Hero Section */}
            <div className="bg-[#0B1221] text-white text-center py-20 px-6">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">About Wappie AI</h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                    Powering smarter, faster, and more personal WhatsApp conversations for businesses worldwide.
                </p>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-12 space-y-16">

                {/* 2. Mission & Why Choose Us */}
                <section className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6 text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Since 2020, we've empowered over 100 businesses worldwide to break communication barriers. We believe in making AI-driven WhatsApp communication accessible, efficient, and human-centric.
                        </p>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6 text-green-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
                        <p className="text-gray-600 leading-relaxed">
                            We deliver results. With 98% open rates, instant 24/7 support, and seamless automation, we help you turn conversations into conversions without the manual legwork.
                        </p>
                    </div>
                </section>

                {/* 3. Team Image */}
                <section className="relative rounded-2xl overflow-hidden shadow-lg group">
                    <img
                        src={teamImage}
                        alt="Wappie AI Team"
                        className="w-full h-80 md:h-96 object-cover transform group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                        <div className="p-8 text-white">
                            <h3 className="text-2xl font-bold">Built by Experts</h3>
                            <p className="opacity-90">Our diverse team is dedicated to your success.</p>
                        </div>
                    </div>
                </section>

                {/* 4. Testimonials */}
                <section className="text-center">
                    <h2 className="text-3xl font-bold mb-10 text-gray-900">What Our Users Say</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Testimonial 1 */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-left relative">
                            <div className="text-blue-200 absolute top-4 right-6 text-6xl font-serif">"</div>
                            <p className="text-gray-600 italic mb-6 relative z-10">
                                Wappie AI transformed our customer chats—fast, friendly, and always on point. It feels like we hired a full support team overnight.
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">UA</div>
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">User A</p>
                                    <p className="text-xs text-gray-500">E-commerce Manager</p>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 2 */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-left relative">
                            <div className="text-blue-200 absolute top-4 right-6 text-6xl font-serif">"</div>
                            <p className="text-gray-600 italic mb-6 relative z-10">
                                Our response times dropped instantly, and customers love the personal touch Wappie AI brings. Highly recommended!
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">UB</div>
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">User B</p>
                                    <p className="text-xs text-gray-500">Business Owner</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. FAQ Section */}
                <section className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">Common Questions</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200"
                            >
                                <button
                                    type="button"
                                    className={`w-full text-left p-5 font-semibold flex justify-between items-center focus:outline-none ${openIndex === index ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-800'}`}
                                    onClick={() => toggleFaq(index)}
                                >
                                    <span className="text-base">{faq.question}</span>
                                    <span className={`text-xl font-light transform transition-transform duration-200 ${openIndex === index ? 'rotate-180' : ''}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </span>
                                </button>

                                {openIndex === index && (
                                    <div className="p-5 pt-2 text-gray-600 text-sm leading-relaxed border-t border-gray-100 animate-fadeIn">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default About;