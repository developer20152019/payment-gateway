import React, { useState, useEffect } from 'react';

const Terms: React.FC = () => {
    const [activeSection, setActiveSection] = useState<string>('overview');

    // Scroll listener to update active section in sidebar
    useEffect(() => {
        const handleScroll = () => {
            const sections = document.querySelectorAll('section');
            let current = '';
            sections.forEach((section) => {
                const sectionTop = section.offsetTop;
                // Offset of 200px to trigger the highlight slightly before the section hits top
                if (window.scrollY >= sectionTop - 200) {
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
                top: element.offsetTop - 100, // Offset for sticky headers
                behavior: 'smooth'
            });
        }
    };

    // Table of Contents Data
    const navLinks = [
        { id: 'overview', title: "Overview" },
        { id: 'sec-1', title: "1. Online Store Terms" },
        { id: 'sec-2', title: "2. General Conditions" },
        { id: 'sec-3', title: "3. Accuracy of Info" },
        { id: 'sec-4', title: "4. Modifications" },
        { id: 'sec-5', title: "5. Products or Services" },
        { id: 'sec-6', title: "6. Billing & Account" },
        { id: 'sec-7', title: "7. Optional Tools" },
        { id: 'sec-8', title: "8. Third-Party Links" },
        { id: 'sec-9', title: "9. User Comments" },
        { id: 'sec-10', title: "10. Personal Info" },
        { id: 'sec-12', title: "12. Prohibited Uses" },
        { id: 'sec-18', title: "18. Governing Law" },
        { id: 'contact', title: "20. Contact Info" },
    ];

    return (
        <div className="w-full bg-gray-50 min-h-screen font-sans text-gray-700">

            {/* Hero Header */}
            <div className="bg-[#0B1221] text-white py-16 px-6 text-center">
                <h1 className="text-3xl md:text-5xl font-bold mb-4">Terms of Service</h1>
                <p className="text-gray-400 max-w-2xl mx-auto">
                    Please read these terms carefully before accessing or using our website.
                </p>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-12">

                {/* Left Sidebar: Sticky Navigation (Hidden on Mobile) */}
                <aside className="hidden lg:block w-1/4 min-w-[260px]">
                    <div className="sticky top-10 bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-h-[80vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Table of Contents</h3>
                        <nav className="space-y-1">
                            {navLinks.map((link) => (
                                <button
                                    key={link.id}
                                    onClick={() => scrollToSection(link.id)}
                                    className={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors duration-200 ${activeSection === link.id
                                            ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
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

                    {/* Overview */}
                    <section id="overview" className="space-y-4">
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">Overview</h2>
                        <div className="leading-relaxed space-y-4 text-gray-600">
                            <p>
                                This website is operated by <strong>WAPPIE TECHNOLOGIES</strong>. Throughout the site, the terms “we”, “us” and “our” refer to WAPPIE TECHNOLOGIES. WAPPIE TECHNOLOGIES offers this website, including all information, tools and services available from this site to you, the user, conditioned upon your acceptance of all terms, conditions, policies and notices stated here.
                            </p>
                            <p>
                                By visiting our site and/or purchasing something from us, you engage in our “Service” and agree to be bound by the following terms and conditions (“Terms of Service”, “Terms”), including those additional terms and conditions and policies referenced herein and/or available by hyperlink.
                            </p>
                        </div>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 1 */}
                    <section id="sec-1" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 1 - ONLINE STORE TERMS</h3>
                        <p className="leading-relaxed">
                            By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence, or that you are the age of majority in your state or province of residence and you have given us your consent to allow any of your minor dependents to use this site. You may not use our products for any illegal or unauthorized purpose nor may you, in the use of the Service, violate any laws in your jurisdiction (including but not limited to copyright laws).
                        </p>
                    </section>

                    {/* Section 2 */}
                    <section id="sec-2" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 2 - GENERAL CONDITIONS</h3>
                        <p className="leading-relaxed">
                            We reserve the right to refuse service to anyone for any reason at any time. You understand that your content (not including credit card information), may be transferred unencrypted and involve (a) transmissions over various networks; and (b) changes to conform and adapt to technical requirements of connecting networks or devices. Credit card information is always encrypted during transfer over networks.
                        </p>
                    </section>

                    {/* Section 3 */}
                    <section id="sec-3" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 3 - ACCURACY, COMPLETENESS AND TIMELINESS OF INFORMATION</h3>
                        <p className="leading-relaxed">
                            We are not responsible if information made available on this site is not accurate, complete or current. The material on this site is provided for general information only and should not be relied upon or used as the sole basis for making decisions without consulting primary, more accurate, more complete or more timely sources of information. Any reliance on the material on this site is at your own risk.
                        </p>
                    </section>

                    {/* Section 4 */}
                    <section id="sec-4" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 4 - MODIFICATIONS TO THE SERVICE AND PRICES</h3>
                        <p className="leading-relaxed">
                            Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time. We shall not be liable to you or to any third-party for any modification, price change, suspension or discontinuance of the Service.
                        </p>
                    </section>

                    {/* Section 5 */}
                    <section id="sec-5" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 5 - PRODUCTS OR SERVICES</h3>
                        <p className="leading-relaxed">
                            Certain products or services may be available exclusively online through the website. These products or services may have limited quantities and are subject to return or exchange only according to our Return Policy. We have made every effort to display as accurately as possible the colors and images of our products. We cannot guarantee that your computer monitor's display of any color will be accurate.
                        </p>
                    </section>

                    {/* Section 6 */}
                    <section id="sec-6" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 6 - ACCURACY OF BILLING AND ACCOUNT INFORMATION</h3>
                        <p className="leading-relaxed">
                            We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household or per order. You agree to provide current, complete and accurate purchase and account information for all purchases made at our store.
                        </p>
                    </section>

                    {/* Section 7 */}
                    <section id="sec-7" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 7 - OPTIONAL TOOLS</h3>
                        <p className="leading-relaxed">
                            We may provide you with access to third-party tools over which we neither monitor nor have any control nor input. You acknowledge and agree that we provide access to such tools ”as is” and “as available” without any warranties, representations or conditions of any kind. Any use by you of optional tools offered through the site is entirely at your own risk and discretion.
                        </p>
                    </section>

                    {/* Section 8 */}
                    <section id="sec-8" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 8 - THIRD-PARTY LINKS</h3>
                        <p className="leading-relaxed">
                            Certain content, products and services available via our Service may include materials from third-parties. Third-party links on this site may direct you to third-party websites that are not affiliated with us. We are not responsible for examining or evaluating the content or accuracy and we do not warrant and will not have any liability or responsibility for any third-party materials or websites.
                        </p>
                    </section>

                    {/* Section 9 */}
                    <section id="sec-9" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 9 - USER COMMENTS, FEEDBACK AND OTHER SUBMISSIONS</h3>
                        <p className="leading-relaxed">
                            If, at our request, you send certain specific submissions or without a request from us you send creative ideas, suggestions, proposals, plans, or other materials, you agree that we may, at any time, without restriction, edit, copy, publish, distribute, translate and otherwise use in any medium any comments that you forward to us.
                        </p>
                    </section>

                    {/* Section 10 */}
                    <section id="sec-10" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 10 - PERSONAL INFORMATION</h3>
                        <p className="leading-relaxed">
                            Your submission of personal information through the store is governed by our Privacy Policy.
                        </p>
                    </section>

                    {/* Section 11 */}
                    <section id="sec-11" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 11 - ERRORS, INACCURACIES AND OMISSIONS</h3>
                        <p className="leading-relaxed">
                            Occasionally there may be information on our site or in the Service that contains typographical errors, inaccuracies or omissions that may relate to product descriptions, pricing, promotions, offers, product shipping charges, transit times and availability. We reserve the right to correct any errors, inaccuracies or omissions, and to change or update information at any time without prior notice.
                        </p>
                    </section>

                    {/* Section 12 */}
                    <section id="sec-12" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 12 - PROHIBITED USES</h3>
                        <div className="leading-relaxed">
                            In addition to other prohibitions as set forth in the Terms of Service, you are prohibited from using the site or its content:
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                                <li>(a) for any unlawful purpose;</li>
                                <li>(b) to solicit others to perform or participate in any unlawful acts;</li>
                                <li>(c) to violate any international, federal, provincial or state regulations, rules, laws, or local ordinances;</li>
                                <li>(d) to infringe upon or violate our intellectual property rights or the intellectual property rights of others;</li>
                                <li>(e) to harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate;</li>
                                <li>(f) to submit false or misleading information;</li>
                                <li>(g) to upload or transmit viruses or any other type of malicious code;</li>
                                <li>(h) to collect or track the personal information of others;</li>
                                <li>(i) to spam, phish, pharm, pretext, spider, crawl, or scrape.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 13 */}
                    <section id="sec-13" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 13 - DISCLAIMER OF WARRANTIES; LIMITATION OF LIABILITY</h3>
                        <p className="leading-relaxed">
                            We do not guarantee, represent or warrant that your use of our service will be uninterrupted, timely, secure or error-free. The service and all products and services delivered to you through the service are (except as expressly stated by us) provided 'as is' and 'as available' for your use, without any representation, warranties or conditions of any kind. In no case shall WAPPIE TECHNOLOGIES, our directors, officers, employees, affiliates, agents, contractors, interns, suppliers, service providers or licensors be liable for any injury, loss, claim, or any direct, indirect, incidental, punitive, special, or consequential damages.
                        </p>
                    </section>

                    {/* Section 14 */}
                    <section id="sec-14" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 14 - INDEMNIFICATION</h3>
                        <p className="leading-relaxed">
                            You agree to indemnify, defend and hold harmless WAPPIE TECHNOLOGIES and our parent, subsidiaries, affiliates, partners, officers, directors, agents, contractors, licensors, service providers, subcontractors, suppliers, interns and employees, harmless from any claim or demand, including reasonable attorneys’ fees, made by any third-party due to or arising out of your breach of these Terms of Service.
                        </p>
                    </section>

                    {/* Section 15 */}
                    <section id="sec-15" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 15 - SEVERABILITY</h3>
                        <p className="leading-relaxed">
                            In the event that any provision of these Terms of Service is determined to be unlawful, void or unenforceable, such provision shall nonetheless be enforceable to the fullest extent permitted by applicable law, and the unenforceable portion shall be deemed to be severed from these Terms of Service.
                        </p>
                    </section>

                    {/* Section 16 */}
                    <section id="sec-16" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 16 - TERMINATION</h3>
                        <p className="leading-relaxed">
                            The obligations and liabilities of the parties incurred prior to the termination date shall survive the termination of this agreement for all purposes. These Terms of Service are effective unless and until terminated by either you or us. You may terminate these Terms of Service at any time by notifying us that you no longer wish to use our Services.
                        </p>
                    </section>

                    {/* Section 17 */}
                    <section id="sec-17" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 17 - ENTIRE AGREEMENT</h3>
                        <p className="leading-relaxed">
                            The failure of us to exercise or enforce any right or provision of these Terms of Service shall not constitute a waiver of such right or provision. These Terms of Service and any policies or operating rules posted by us on this site or in respect to The Service constitutes the entire agreement and understanding between you and us.
                        </p>
                    </section>

                    {/* Section 18 */}
                    <section id="sec-18" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 18 - GOVERNING LAW</h3>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <p className="leading-relaxed text-blue-900">
                                These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of <strong>India</strong> and jurisdiction of <strong>Jaipur, Rajasthan</strong>.
                            </p>
                        </div>
                    </section>

                    {/* Section 19 */}
                    <section id="sec-19" className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-800">SECTION 19 - CHANGES TO TERMS OF SERVICE</h3>
                        <p className="leading-relaxed">
                            You can review the most current version of the Terms of Service at any time at this page. We reserve the right, at our sole discretion, to update, change or replace any part of these Terms of Service by posting updates and changes to our website. It is your responsibility to check our website periodically for changes.
                        </p>
                    </section>

                    <hr className="border-gray-100" />

                    {/* Section 20 - Contact */}
                    <section id="contact" className="bg-[#0B1221] text-white p-8 rounded-xl shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">SECTION 20 - CONTACT INFORMATION</h2>
                        <p className="mb-4 leading-relaxed text-gray-300">
                            Questions about the Terms of Service should be sent to us.
                        </p>
                        <div className="inline-block bg-white/10 p-4 rounded-lg">
                            <h3 className="font-semibold text-blue-400 uppercase text-xs tracking-wide mb-1">Email Support</h3>
                            <a href="mailto:account@wappieai.shop" className="text-lg hover:text-blue-300 transition-colors font-medium">
                                account@wappieai.shop
                            </a>
                        </div>
                    </section>

                </main>
            </div>
        </div>
    );
};

export default Terms;