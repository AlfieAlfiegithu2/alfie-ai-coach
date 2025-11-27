const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#f5f2e8] font-sans text-[#3c3c3c]">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[#e6e0d4]">
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#2d2d2d] mb-8">Privacy Policy</h1>
          <p className="text-[#666666] font-sans mb-8 text-sm">Last updated: November 22, 2025</p>

          <div className="space-y-8">
            <p className="text-[#666666] leading-relaxed">
              This Privacy Policy describes how English Aidol ("we", "us", or "our") collects, uses, and protects your information when you use our English learning platform.
            </p>

            <section>
              <h2 className="text-2xl font-serif font-medium text-[#2d2d2d] mb-4">Information We Collect</h2>
              <p className="text-[#666666] leading-relaxed">
                We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include your name, email address, and usage data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-[#2d2d2d] mb-4">How We Use Your Information</h2>
              <p className="text-[#666666] leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#666666]">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Develop new features and services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-[#2d2d2d] mb-4">Information Sharing</h2>
              <p className="text-[#666666] leading-relaxed">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy. We may share information in aggregated or anonymized form for analytical purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-[#2d2d2d] mb-4">Data Security</h2>
              <p className="text-[#666666] leading-relaxed">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-[#2d2d2d] mb-4">Third-Party Services</h2>
              <p className="text-[#666666] leading-relaxed">
                Our service may contain links to third-party websites or services that are not owned or controlled by us. We are not responsible for the privacy practices of these third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-[#2d2d2d] mb-4">Children's Privacy</h2>
              <p className="text-[#666666] leading-relaxed">
                Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-[#2d2d2d] mb-4">Changes to This Policy</h2>
              <p className="text-[#666666] leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-medium text-[#2d2d2d] mb-4">Contact Us</h2>
              <p className="text-[#666666] leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at
                <a href="mailto:hello@englishaidol.com" className="text-[#d97757] hover:underline ml-1">hello@englishaidol.com</a>.
              </p>
            </section>

            <div className="border-t border-[#e6e0d4] pt-6 mt-8">
              <p className="text-[#666666] leading-relaxed italic">
                <em>This service is provided "as is" for educational and improvement purposes. We reserve the right to modify or discontinue the service at any time without liability.</em>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-[#666666]">
          <p>© {new Date().getFullYear()} English AIdol. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
