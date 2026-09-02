import { useLanguage } from '../contexts/LanguageContext';
import { LegalPageShell } from './LegalPageShell';

export default function PrivacyPolicyPage() {
  const { t } = useLanguage();

  return (
    <LegalPageShell
      title={t('Privacy Policy', '隐私政策')}
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
            'This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you visit our website and use our services. By using this website, you consent to the practices described in this policy.',
            '本隐私政策说明了当您访问我们的网站并使用我们的服务时，我们如何收集、使用、披露和保护您的个人信息。使用本网站即表示您同意本政策中描述的做法。'
          )}
        </p>
      </div>

      <div className="space-y-8 sm:space-y-10">
        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('1. Information We Collect', '1. 我们收集的信息')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 mb-3 sm:mb-4 break-words">
            {t('We collect the following types of information:', '我们收集以下类型的信息：')}
          </p>
          <ul className="list-none space-y-2 sm:space-y-3 ml-2 sm:ml-4 text-sm sm:text-base leading-relaxed text-gray-300">
            <li className="before:content-['-'] before:mr-2 break-words">
              {t(
                'Personal Information: Name, email address, gender, grade & class, division (domestic or international), and identity (student or teacher).',
                '个人信息：姓名、电子邮件地址、性别、年级和班级、部门（国内或国际）以及身份（学生或教师）。'
              )}
            </li>
            <li className="before:content-['-'] before:mr-2 break-words">
              {t(
                'Transaction Information: Details regarding your purchases and shopping preferences.',
                '交易信息：有关您的购买和购物偏好的详细信息。'
              )}
            </li>
            <li className="before:content-['-'] before:mr-2 break-words">
              {t(
                'Cookies: We use Cookies to store login state information, and they are encrypted to ensure security. We may also use Cookies to store your consent to our use of Cookies.',
                'Cookies：我们使用Cookies存储登录状态信息，并对其进行加密以确保安全。我们还可能使用Cookies存储您对我们使用Cookies的同意。'
              )}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('2. How We Use Your Information', '2. 我们如何使用您的信息')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 mb-3 sm:mb-4 break-words">
            {t('We use your personal information for the following purposes:', '我们将您的个人信息用于以下目的：')}
          </p>
          <ul className="list-none space-y-2 sm:space-y-3 ml-2 sm:ml-4 text-sm sm:text-base leading-relaxed text-gray-300">
            <li className="before:content-['-'] before:mr-2 break-words">
              {t('To send you order confirmation and updates via email.', '通过电子邮件向您发送订单确认和更新。')}
            </li>
            <li className="before:content-['-'] before:mr-2 break-words">
              {t(
                'To verify your identity for processing orders and granting access to your shopping account.',
                '验证您的身份以处理订单并授予您访问购物账户的权限。'
              )}
            </li>
            <li className="before:content-['-'] before:mr-2 break-words">
              {t('To provide the commodities you have purchased or reserved.', '提供您已购买或预订的商品。')}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('3. Sharing of Information', '3. 信息共享')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'We do not share your personal information with third parties, except where required by law or for our internal operational purposes.',
              '我们不会与第三方共享您的个人信息，除非法律要求或用于我们的内部运营目的。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('4. Data Security', '4. 数据安全')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'We take reasonable precautions to protect your data and have a security plan in place to safeguard your personal information from unauthorized access or disclosure.',
              '我们采取合理的预防措施来保护您的数据，并制定了安全计划，以保护您的个人信息免受未经授权的访问或披露。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('5. Your Rights', '5. 您的权利')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 mb-3 sm:mb-4 break-words">
            {t('You have the right to:', '您有权：')}
          </p>
          <ul className="list-none space-y-2 sm:space-y-3 ml-2 sm:ml-4 text-sm sm:text-base leading-relaxed text-gray-300">
            <li className="before:content-['-'] before:mr-2 break-words">
              {t('Access your personal information.', '访问您的个人信息。')}
            </li>
            <li className="before:content-['-'] before:mr-2 break-words">
              {t(
                'Request the deletion of your account and associated personal information.',
                '请求删除您的账户和相关的个人信息。'
              )}
            </li>
            <li className="before:content-['-'] before:mr-2 break-words">
              {t(
                'To update or correct your personal information, you will need to delete the account and re-register.',
                '要更新或更正您的个人信息，您需要删除账户并重新注册。'
              )}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('6. Children\'s Privacy', '6. 儿童隐私')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'This website is not intended for children under 13, and we do not knowingly collect information from children under this age without parental consent. If you believe we have inadvertently collected such data, please contact us to remove the information.',
              '本网站不适用于13岁以下的儿童，未经父母同意，我们不会故意收集这个年龄段儿童的信息。如果您认为我们无意中收集了此类数据，请联系我们删除该信息。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('7. Changes to this Privacy Policy', '7. 本隐私政策的变更')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'We reserve the right to update this Privacy Policy at any time. If changes are made, we will notify users via email (if you have an account) and by posting a notice on the website.',
              '我们保留随时更新本隐私政策的权利。如果进行更改，我们将通过电子邮件（如果您有账户）和在网站上发布通知来通知用户。'
            )}
          </p>
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-normal mb-3 sm:mb-4 inline-block border-2 border-white rounded-full px-3 sm:px-4 py-1 break-words">
            {t('8. Contact Information', '8. 联系信息')}
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-gray-300 break-words">
            {t(
              'If you have any questions or concerns regarding this Privacy Policy, please contact us at: help@sclscampus.shop',
              '如果您对本隐私政策有任何疑问或顾虑，请通过以下方式联系我们：help@sclscampus.shop'
            )}
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
