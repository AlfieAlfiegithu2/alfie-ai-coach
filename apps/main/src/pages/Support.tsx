import { Mail, MessageCircle, Clock, HelpCircle, BookOpen, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const Support = () => {
  return (
    <div className="min-h-screen bg-[#f5f2e8] font-sans text-[#3c3c3c]">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-[#e6e0d4]">
          <h1 className="text-4xl md:text-5xl font-bold text-[#2d2d2d] mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>Support Center</h1>
          <p className="text-[#666666] font-sans mb-8 text-lg">
            We're here to help you succeed in your English learning journey.
          </p>

          <div className="space-y-8">
            {/* Contact Card */}
            <div className="bg-[#faf8f6] border border-[#e6e0d4] rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#d97757]/10 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-[#d97757]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#2d2d2d]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Contact Us</h2>
                  <p className="text-[#666666] text-sm">Get in touch with our support team</p>
                </div>
              </div>
              <p className="text-[#666666] leading-relaxed mb-4">
                For any questions, concerns, or assistance, please reach out to us via email. Our team is dedicated to providing you with the best support experience.
              </p>
              <a 
                href="mailto:hello@englishaidol.com" 
                className="inline-flex items-center gap-2 bg-[#d97757] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#c56a4b] transition-colors"
              >
                <Mail className="w-5 h-5" />
                hello@englishaidol.com
              </a>
            </div>

            {/* Response Time */}
            <div className="flex items-start gap-4 p-6 border border-[#e6e0d4] rounded-2xl">
              <div className="w-10 h-10 bg-[#d97757]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-[#d97757]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#2d2d2d] mb-1">Response Time</h3>
                <p className="text-[#666666] leading-relaxed">
                  We aim to respond to all inquiries within 24-48 business hours. For urgent matters, please include "URGENT" in your email subject line.
                </p>
              </div>
            </div>

            {/* FAQ Section */}
            <section>
              <h2 className="text-2xl font-bold text-[#2d2d2d] mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>Frequently Asked Questions</h2>
              
              <div className="space-y-4">
                <div className="border border-[#e6e0d4] rounded-xl p-5">
                  <h3 className="font-semibold text-[#2d2d2d] mb-2 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#d97757]" />
                    How do I reset my password?
                  </h3>
                  <p className="text-[#666666] leading-relaxed">
                    Click on "Forgot Password" on the login page and enter your registered email address. You'll receive a password reset link within a few minutes.
                  </p>
                </div>

                <div className="border border-[#e6e0d4] rounded-xl p-5">
                  <h3 className="font-semibold text-[#2d2d2d] mb-2 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#d97757]" />
                    How accurate is the AI scoring?
                  </h3>
                  <p className="text-[#666666] leading-relaxed">
                    Our AI scoring system is trained on thousands of official exam samples and shows 98% correlation with real exam results. However, AI feedback is for practice purposes only and does not guarantee actual exam scores.
                  </p>
                </div>

                <div className="border border-[#e6e0d4] rounded-xl p-5">
                  <h3 className="font-semibold text-[#2d2d2d] mb-2 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#d97757]" />
                    Can I cancel my subscription?
                  </h3>
                  <p className="text-[#666666] leading-relaxed">
                    Yes, you can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period. Please note that all sales are final and no refunds are provided.
                  </p>
                </div>

                <div className="border border-[#e6e0d4] rounded-xl p-5">
                  <h3 className="font-semibold text-[#2d2d2d] mb-2 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#d97757]" />
                    Which exams do you support?
                  </h3>
                  <p className="text-[#666666] leading-relaxed">
                    We provide comprehensive practice and AI feedback for IELTS, TOEFL, PTE, TOEIC, and General English. Our AI is specifically trained on each exam's unique scoring criteria and rubrics.
                  </p>
                </div>

                <div className="border border-[#e6e0d4] rounded-xl p-5">
                  <h3 className="font-semibold text-[#2d2d2d] mb-2 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-[#d97757]" />
                    How do I upgrade my plan?
                  </h3>
                  <p className="text-[#666666] leading-relaxed">
                    You can upgrade your plan at any time from your account settings or by visiting our pricing page. The new plan will take effect immediately, and you'll be charged the prorated difference.
                  </p>
                </div>
              </div>
            </section>

            {/* Quick Links */}
            <section>
              <h2 className="text-2xl font-bold text-[#2d2d2d] mb-6" style={{ fontFamily: "'Montserrat', sans-serif" }}>Quick Links</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link 
                  to="/privacy-policy" 
                  className="flex items-center gap-3 p-4 border border-[#e6e0d4] rounded-xl hover:border-[#d97757] hover:bg-[#faf8f6] transition-all"
                >
                  <FileText className="w-5 h-5 text-[#d97757]" />
                  <span className="font-medium text-[#2d2d2d]">Privacy Policy</span>
                </Link>
                <Link 
                  to="/terms-of-service" 
                  className="flex items-center gap-3 p-4 border border-[#e6e0d4] rounded-xl hover:border-[#d97757] hover:bg-[#faf8f6] transition-all"
                >
                  <BookOpen className="w-5 h-5 text-[#d97757]" />
                  <span className="font-medium text-[#2d2d2d]">Terms of Service</span>
                </Link>
                <Link 
                  to="/refund-policy" 
                  className="flex items-center gap-3 p-4 border border-[#e6e0d4] rounded-xl hover:border-[#d97757] hover:bg-[#faf8f6] transition-all"
                >
                  <MessageCircle className="w-5 h-5 text-[#d97757]" />
                  <span className="font-medium text-[#2d2d2d]">Refund Policy</span>
                </Link>
              </div>
            </section>

            {/* Additional Info */}
            <div className="border-t border-[#e6e0d4] pt-8 mt-8">
              <h2 className="text-2xl font-bold text-[#2d2d2d] mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>Before You Contact Us</h2>
              <p className="text-[#666666] leading-relaxed mb-4">
                To help us assist you more efficiently, please include the following information in your email:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#666666]">
                <li>Your registered email address</li>
                <li>A clear description of your issue or question</li>
                <li>Screenshots or error messages (if applicable)</li>
                <li>Your device type and browser (for technical issues)</li>
                <li>Any steps you've already taken to resolve the issue</li>
              </ul>
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

export default Support;

