import React, { useState, useEffect } from 'react';

const Refund: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string>('returns');

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
        { id: 'returns', title: "1. Returns Policy" },
        { id: 'exemptions', title: "2. Non-returnable Items" },
        { id: 'refunds', title: "3. Refund Process" },
        { id: 'late-refunds', title: "4. Late or Missing Refunds" },
        { id: 'sale-items', title: "5. Sale Items" },
        { id: 'exchanges', title: "6. Exchanges" },
        { id: 'shipping', title: "7. Shipping Returns" },
    ];

    return (
        <div className="w-full bg-gray-50 min-h-screen font-sans text-gray-700">

            {/* Hero Header */}
            <div className="bg-[#0B1221] text-white py-16 px-6 text-center">
                <h1 className="text-3xl md:text-5xl font-bold mb-4">Refund Policy</h1>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    We want you to be satisfied. Read below to understand our returns and refund procedures.
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
                <main className="w-full lg:w-3/4 bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 space-y-10">

                    {/* Returns */}
                    <section id="returns" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">1. Returns Policy</h2>
                        <div className="leading-relaxed space-y-4 text-gray-600">
                            <p>
                                Our policy lasts <strong>30 days</strong>. If 30 days have gone by since your purchase, unfortunately, we can’t offer you a refund or exchange.
                            </p>
                            <p>
                                To be eligible for a return, your item must be unused and in the same condition that you received it. It must also be in the original packaging.
                            </p>
                            <p>
                                To complete your return, we require a receipt or proof of purchase. Please do not send your purchase back to the manufacturer.
                            </p>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Exemptions */}
                    <section id="exemptions" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">2. Non-returnable Items</h2>
                        <div className="leading-relaxed space-y-4 text-gray-600">
                            <p>Several types of goods are exempt from being returned:</p>
                            <ul className="list-disc pl-5 space-y-2">
                                <li>Perishable goods (food, flowers, newspapers, magazines)</li>
                                <li>Intimate or sanitary goods</li>
                                <li>Hazardous materials, flammable liquids, or gases</li>
                                <li>Gift cards</li>
                                <li>Downloadable software products</li>
                                <li>Some health and personal care items</li>
                            </ul>

                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mt-4">
                                <p className="font-semibold text-yellow-800 mb-2">Partial Refunds (if applicable)</p>
                                <p className="text-sm text-yellow-700">
                                    Partial refunds may be granted in certain situations, such as books with obvious signs of use; opened CD/DVD/software; items not in original condition, damaged or missing parts not due to our error; or items returned more than 30 days after delivery.
                                </p>
                            </div>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Refunds */}
                    <section id="refunds" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">3. Refund Process</h2>
                        <p className="leading-relaxed">
                            Once your return is received and inspected, we will send you an email to notify you that we have received your returned item and whether your refund is approved or rejected.
                        </p>
                        <p className="leading-relaxed">
                            If approved, your refund will be processed, and a credit will automatically be applied to your original payment method within a certain number of days.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Late Refunds */}
                    <section id="late-refunds" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">4. Late or missing refunds</h2>
                        <p className="mb-2">If you haven’t received a refund yet, please follow these steps:</p>
                        <ol className="list-decimal pl-5 space-y-2 marker:font-bold marker:text-gray-900">
                            <li>Check your bank account again.</li>
                            <li>Contact your credit card company, it may take time before the refund is officially posted.</li>
                            <li>Contact your bank; there is often some processing time before a refund is posted.</li>
                        </ol>
                        <p className="mt-4 bg-gray-50 p-4 rounded-lg">
                            If you’ve done all of this and you still have not received your refund yet, please contact us at <a href="mailto:account@wappieai.shop" className="text-blue-600 font-medium hover:underline">account@wappieai.shop</a>.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Sale Items */}
                    <section id="sale-items" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">5. Sale items</h2>
                        <p className="leading-relaxed">
                            Only regular priced items may be refunded; unfortunately, sale items cannot be refunded.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Exchanges */}
                    <section id="exchanges" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">6. Exchanges & Gifts</h2>

                        <h3 className="text-lg font-bold text-gray-800">Defective Items</h3>
                        <p className="leading-relaxed">
                            We only replace items if they are defective or damaged. If you need to exchange it for the same item, send us an email at <a href="mailto:account@wappieai.shop" className="text-blue-600 underline">account@wappieai.shop</a>.
                        </p>

                        <h3 className="text-lg font-bold text-gray-800 mt-4">Gifts</h3>
                        <p className="leading-relaxed">
                            If the item was marked as a gift when purchased and shipped directly to you, you’ll receive a gift credit for the value of your return. Once the returned item is received, a gift certificate will be mailed to you.
                        </p>
                        <p className="leading-relaxed">
                            If the item wasn’t marked as a gift when purchased, or the gift giver had the order shipped to themselves to give to you later, we will send a refund to the gift giver and they will find out about your return.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Shipping */}
                    <section id="shipping" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">7. Shipping Returns</h2>
                        <p>To return your product, you should mail your product to:</p>

                        <div className="bg-gray-100 p-6 rounded-lg text-sm font-medium text-gray-800 border-l-4 border-gray-400">
                            RAINMAKERS WORKSPACE<br />
                            2ND FLOOR RAHEJA ARCADE, UNIT 201 TO 210<br />
                            5TH BLOCK KORAMANGALA,<br />
                            Bangalore, Karnataka, India - 560095
                        </div>

                        <p className="leading-relaxed text-sm text-gray-500">
                            You will be responsible for paying for your own shipping costs for returning your item. Shipping costs are non-refundable. If you receive a refund, the cost of return shipping will be deducted from your refund.
                        </p>
                        <p className="leading-relaxed text-sm text-gray-500">
                            Depending on where you live, the time it may take for your exchanged product to reach you may vary. If you are shipping an item over $75, you should consider using a trackable shipping service or purchasing shipping insurance. We don’t guarantee that we will receive your returned item.
                        </p>
                    </section>

                </main>
            </div>
        </div>
    );
};

export default Refund;