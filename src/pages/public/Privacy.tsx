import React, { useState, useEffect } from 'react';

const Privacy: React.FC = () => {
    // State to track active section for the sidebar highlighting
    const [activeSection, setActiveSection] = useState<string>('section-1');

    // Scroll listener to update active section based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            const sections = document.querySelectorAll('section');
            let current = '';
            sections.forEach((section) => {
                const sectionTop = section.offsetTop;
                if (window.scrollY >= sectionTop - 150) {
                    current = section.getAttribute('id') || '';
                }
            });
            if (current) setActiveSection(current);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - 120, // Offset for sticky header
                behavior: 'smooth'
            });
        }
    };

    const links = [
        { id: 'section-1', title: "1. Information Collection" },
        { id: 'section-2', title: "2. Consent" },
        { id: 'section-3', title: "3. Disclosure" },
        { id: 'section-4', title: "4. Payment Security" },
        { id: 'section-5', title: "5. Third-Party Services" },
        { id: 'section-6', title: "6. Security" },
        { id: 'section-7', title: "7. Cookies" },
        { id: 'section-8', title: "8. Age of Consent" },
        { id: 'section-9', title: "9. Policy Changes" },
        { id: 'contact', title: "Questions & Contact" },
    ];

    return (
        <div className="w-full bg-gray-50 min-h-screen font-sans text-gray-700">

            {/* Hero Header */}
            <div className="bg-[#0B1221] text-white py-16 px-6 text-center">
                <h1 className="text-3xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    We value your privacy. This statement explains how we handle your personal information and ensure your security.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">

                {/* Left Sidebar: Table of Contents (Hidden on Mobile) */}
                <aside className="hidden lg:block w-1/4 min-w-[250px]">
                    <div className="sticky top-10 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Table of Contents</h3>
                        <nav className="space-y-1">
                            {links.map((link) => (
                                <button
                                    key={link.id}
                                    onClick={() => scrollToSection(link.id)}
                                    className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${activeSection === link.id
                                            ? 'bg-blue-50 text-blue-700 font-semibold'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {link.title}
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* Right: Main Content */}
                <main className="w-full lg:w-3/4 bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 space-y-12">

                    {/* Section 1 */}
                    <section id="section-1" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">1. What do we do with your information?</h2>
                        <div className="leading-relaxed space-y-4 text-gray-600">
                            <p>
                                When you purchase something from our store, as part of the buying and selling process, we collect the personal information you give us such as your name, address, and email address.
                            </p>
                            <p>
                                When you browse our store, we also automatically receive your computer’s internet protocol (IP) address in order to provide us with information that helps us learn about your browser and operating system.
                            </p>
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                                <strong>Email marketing (if applicable):</strong> With your permission, we may send you emails about our store, new products, and other updates.
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 2 */}
                    <section id="section-2" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">2. Consent</h2>
                        <div className="leading-relaxed space-y-4 text-gray-600">
                            <h3 className="text-lg font-semibold text-gray-900">How do you get my consent?</h3>
                            <p>
                                When you provide us with personal information to complete a transaction, verify your credit card, place an order, arrange for a delivery, or return a purchase, we imply that you consent to our collecting it and using it for that specific reason only.
                            </p>
                            <p>
                                If we ask for your personal information for a secondary reason, like marketing, we will either ask you directly for your expressed consent or provide you with an opportunity to say no.
                            </p>

                            <h3 className="text-lg font-semibold text-gray-900 mt-6">How do I withdraw my consent?</h3>
                            <p>
                                If after you opt-in, you change your mind, you may withdraw your consent for us to contact you, for the continued collection, use or disclosure of your information, at any time, by contacting us at <a href="mailto:account@wappieai.shop" className="text-blue-600 hover:underline font-medium">account@wappieai.shop</a> or mailing us at the address provided in the contact section.
                            </p>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 3 */}
                    <section id="section-3" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">3. Disclosure</h2>
                        <p className="leading-relaxed">
                            We may disclose your personal information if we are required by law to do so or if you violate our Terms of Service.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 4 */}
                    <section id="section-4" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">4. Payment</h2>
                        <div className="leading-relaxed space-y-4 text-gray-600">
                            <p>
                                We use <strong>Razorpay</strong> for processing payments. We/Razorpay do not store your card data on their servers. The data is encrypted through the Payment Card Industry Data Security Standard (PCI-DSS) when processing payment. Your purchase transaction data is only used as long as is necessary to complete your purchase transaction. After that is complete, your purchase transaction information is not saved.
                            </p>
                            <p>
                                Our payment gateway adheres to the standards set by PCI-DSS as managed by the PCI Security Standards Council, which is a joint effort of brands like Visa, MasterCard, American Express, and Discover.
                            </p>
                            <p className="text-sm italic">
                                For more insight, you may also want to read terms and conditions of Razorpay on <a href="https://razorpay.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">https://razorpay.com</a>.
                            </p>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 5 */}
                    <section id="section-5" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">5. Third-Party Services</h2>
                        <div className="leading-relaxed space-y-4 text-gray-600">
                            <p>
                                In general, the third-party providers used by us will only collect, use, and disclose your information to the extent necessary to allow them to perform the services they provide to us.
                            </p>
                            <p>
                                However, certain third-party service providers, such as payment gateways, have their own privacy policies. We recommend that you read their privacy policies so you can understand the manner in which your personal information will be handled by these providers.
                            </p>
                            <p>
                                Once you leave our store’s website or are redirected to a third-party website or application, you are no longer governed by this Privacy Policy or our website’s Terms of Service.
                            </p>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 6 */}
                    <section id="section-6" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">6. Security</h2>
                        <p className="leading-relaxed">
                            To protect your personal information, we take reasonable precautions and follow industry best practices to make sure it is not inappropriately lost, misused, accessed, disclosed, altered, or destroyed.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 7 */}
                    <section id="section-7" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">7. Cookies</h2>
                        <p className="leading-relaxed">
                            We use cookies to maintain the session of your user. It is not used to personally identify you on other websites.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 8 */}
                    <section id="section-8" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">8. Age of Consent</h2>
                        <p className="leading-relaxed">
                            By using this site, you represent that you are at least the age of majority in your state or province of residence, or that you are the age of majority in your state or province of residence and you have given us your consent to allow any of your minor dependents to use this site.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 9 */}
                    <section id="section-9" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">9. Changes to this Policy</h2>
                        <p className="leading-relaxed">
                            We reserve the right to modify this privacy policy at any time, so please review it frequently. Changes and clarifications will take effect immediately upon their posting on the website. If we make material changes to this policy, we will notify you here.
                        </p>
                        <p>
                            If our store is acquired or merged with another company, your information may be transferred to the new owners so that we may continue to sell products to you.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Questions & Contact Box */}
                    <section id="contact" className="bg-[#0B1221] text-white p-8 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Questions and Contact Information</h2>
                        <p className="mb-6 leading-relaxed text-gray-300">
                            If you would like to access, correct, amend, or delete any personal information we have about you, register a complaint, or simply want more information, contact our Privacy Compliance Officer.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-semibold text-blue-400 uppercase text-sm tracking-wide mb-1">Email</h3>
                                <a href="mailto:account@wappieai.shop" className="hover:text-blue-300 transition-colors">
                                    account@wappieai.shop
                                </a>
                            </div>
                            <div>
                                <h3 className="font-semibold text-blue-400 uppercase text-sm tracking-wide mb-1">Mailing Address</h3>
                                <p className="text-sm text-gray-300">
                                    RAINMAKERS WORKSPACE, 2nd Floor, Raheja Arcade,<br />
                                    Unit 201 to 210, 5th Block, Koramangala,<br />
                                    Bangalore, Karnataka, India - 560095
                                </p>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default Privacy;