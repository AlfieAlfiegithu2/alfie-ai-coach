import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/1000031328.png"
                alt="English AIdol"
                className="h-8 w-auto"
              />
            </div>
            <p className="text-sm text-gray-400">
              AI-powered English learning platform for IELTS, PTE, TOEFL, and more.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">
              {t('footer.quickLinks', { defaultValue: 'Quick Links' })}
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/tests')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('navigation.tests', { defaultValue: 'Tests' })}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/practice')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('navigation.practice', { defaultValue: 'Practice' })}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/pricing')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('navigation.pricing', { defaultValue: 'Pricing' })}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/podcasts')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('navigation.podcasts', { defaultValue: 'Podcasts' })}
                </button>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-white mb-4">
              {t('footer.resources', { defaultValue: 'Resources' })}
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/en/blog')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('navigation.blog', { defaultValue: 'Blog' })}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/grammar')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('navigation.grammar', { defaultValue: 'Grammar' })}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/vocabulary')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('navigation.vocabulary', { defaultValue: 'Vocabulary' })}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/support')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('navigation.support', { defaultValue: 'Support' })}
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-white mb-4">
              {t('footer.legal', { defaultValue: 'Legal' })}
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/privacy-policy')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('footer.privacyPolicy', { defaultValue: 'Privacy Policy' })}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/terms-of-service')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('footer.termsOfService', { defaultValue: 'Terms of Service' })}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/refund-policy')}
                  className="text-sm hover:text-white transition-colors"
                >
                  {t('footer.refundPolicy', { defaultValue: 'Refund Policy' })}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>© {currentYear} English AIdol. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

