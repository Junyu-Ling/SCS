import { useLanguage } from '../contexts/LanguageContext';
import { LegalPageShell } from './LegalPageShell';

export default function TermsOfUsePage() {
  const { t } = useLanguage();

  return (
    <LegalPageShell
      title={t('Terms of Use', '使用条款')}
      metaLines={[
        t('Last Updated: 2024/09/25', '最后更新：2024/09/25'),
        t('Person(s) in Charge: Qixin Zhu', '负责人：Qixin Zhu'),
      ]}
      notice={t(
        'Notice: This website may be available in multiple languages; however, the English version is the authoritative reference. In case of any discrepancies between language versions, the English version shall prevail.',
        '注意：本网站可能提供多种语言版本；但是，英文版本为权威参考。如果语言版本之间存在任何差异，以英文版本为准。'
      )}
    >
      <div className="mb-8 sm:mb-12 text-sm sm:text-base leading-relaxed text-gray-300">
        <p className="break-words">
          {t(
            'Welcome to the SCLS Campus Shop! By accessing or using our website, you agree to comply with and be bound by the following Terms of Use. Please read them carefully.',
            '欢迎来到 SCLS Campus Shop！访问或使用我们的网站即表示您同意遵守并受以下使用条款的约束。请仔细阅读。'
          )}
        </p>
      </div>

      <div className="space-y-8 sm:space-y-10">
        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('1. Acceptance of Terms', '1. 条款的接受')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'By using this website, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use and our Privacy Policy.',
              '使用本网站即表示您承认已阅读、理解并同意受这些使用条款和我们的隐私政策的约束。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('2. User Accounts', '2. 用户账户')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'To reserve commodities on our website, you must create an account. You are responsible for maintaining the confidentiality of your account information, including your password. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.',
              '要在我们的网站上预订商品，您必须创建一个账户。您有责任对您的账户信息（包括密码）保密。您同意在发现账户被未经授权使用或任何其他安全漏洞时立即通知我们。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('3. User Responsibilities', '3. 用户责任')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 mb-3 sm:mb-4 break-words">
            {t(
              'Users are expected to use the website in compliance with all applicable laws and regulations, particularly the laws of the People\'s Republic of China. You agree not to engage in any prohibited activities, including but not limited to:',
              '用户在使用本网站时应遵守所有适用的法律法规，特别是中华人民共和国的法律。您同意不从事任何被禁止的活动，包括但不限于：'
            )}
          </p>
          <ul className="list-none space-y-2 sm:space-y-3 ml-2 sm:ml-4 text-sm sm:text-base leading-relaxed text-gray-300">
            <li className="before:content-['-'] before:mr-2 break-words">
              {t(
                'Using any content from this website (including images and text) without prior written permission.',
                '未经事先书面许可，使用本网站的任何内容（包括图片和文字）。'
              )}
            </li>
            <li className="before:content-['-'] before:mr-2 break-words">
              {t(
                'Engaging in fraudulent activities or misrepresenting your identity.',
                '从事欺诈活动或虚假陈述您的身份。'
              )}
            </li>
            <li className="before:content-['-'] before:mr-2 break-words">
              {t(
                'Engaging in any activities that compromise computer networks, including but not limited to exploiting system vulnerabilities, unauthorized access, data theft, network attacks, spreading malicious software, or any destructive behavior. Under no circumstances shall users attempt to disrupt, interfere with, or otherwise affect the operation of our systems, or cause distress to other users.',
                '从事任何危害计算机网络的活动，包括但不限于利用系统漏洞、未经授权的访问、数据盗窃、网络攻击、传播恶意软件或任何破坏性行为。在任何情况下，用户均不得试图破坏、干扰或以其他方式影响我们系统的运行，或对其他用户造成困扰。'
              )}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('4. Product Reservations and Payments', '4. 商品预订和付款')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'Users can reserve commodities through our website and are required to pay for these commodities offline at the school. Prices and product information are subject to change without notice.',
              '用户可以通过我们的网站预订商品，并需要在学校线下支付这些商品。价格和产品信息如有更改，恕不另行通知。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('5. Intellectual Property', '5. 知识产权')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'All content on this website, including text, graphics, logos, and images, is the property of SCLS Campus Shop or its content suppliers and is protected by applicable intellectual property laws. Users may not reproduce, distribute, or create derivative works from any content on this website without express permission.',
              '本网站上的所有内容，包括文字、图形、徽标和图片，均为 SCLS Campus Shop 或其内容供应商的财产，受适用的知识产权法保护。未经明确许可，用户不得复制、分发或创建本网站任何内容的衍生作品。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('6. Limitation of Liability', '6. 责任限制')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'SCLS Campus Shop shall not be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with your use of the website or the products purchased.',
              'SCLS Campus Shop 对因您使用网站或购买的产品而产生的或与之相关的任何直接、间接、附带、特殊或后果性损害概不负责。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('7. Modifications to Terms', '7. 条款修改')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'We reserve the right to modify these Terms of Use at any time. If we make changes, we will notify users via email (if you have an account) and will also post a notice on our website.',
              '我们保留随时修改这些使用条款的权利。如果我们进行更改，我们将通过电子邮件（如果您有账户）通知用户，并在我们的网站上发布通知。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('8. Governing Law', '8. 适用法律')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'These Terms of Use shall be governed by and construed in accordance with the laws of the People\'s Republic of China.',
              '这些使用条款应受中华人民共和国法律管辖并根据其解释。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('9. Contact Information', '9. 联系信息')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'For any questions regarding these Terms of Use, please contact us at: help@sclscampus.shop',
              '如对这些使用条款有任何疑问,请通过以下方式联系我们：help@sclscampus.shop'
            )}
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
