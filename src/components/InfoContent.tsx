'use client';
import React from 'react';
import InfoPage from '@/components/InfoPage';
import Link from 'next/link';
import { CATEGORIES, CATEGORY_COUNTS, TOOLS } from '@/data/tools';
import { fill, getCategoryName, useLocale } from '@/i18n/LocaleProvider';

/** The live category list, so the About page always matches the homepage, footer and filters. */
function CategoryList() {
  const { locale, t } = useLocale();
  return (
    <>
      <p>{fill(t('aboutCategoriesIntro'), { n: CATEGORIES.length })}</p>
      <ul>
        {CATEGORIES.map((category) => (
          <li key={category.id}>
            <Link href={`/tools?cat=${category.id}`}>{getCategoryName(category.id, category.label, locale)}</Link>{' '}
            <span className="tabular-nums">({CATEGORY_COUNTS[category.id]})</span>
          </li>
        ))}
      </ul>
    </>
  );
}

const GITHUB = 'https://github.com/Dear0001';

function GithubLink({ children }: { children: React.ReactNode }) {
  return (
    <a href={GITHUB} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function AboutContent() {
  const kh = useLocale().locale === 'kh';
  return kh ? (
    <InfoPage title="អំពី DLTools">
      <p>DLTools គឺជាប្រអប់ឧបករណ៍ឥតគិតថ្លៃដែលដំណើរការក្នុងកម្មវិធីរុករក សម្រាប់អ្នកអភិវឌ្ឍន៍ សិស្ស និស្សិត និងអ្នកប្រើប្រាស់កុំព្យូទ័រទូទៅ។ វាប្រមូលផ្តុំឧបករណ៍ចំនួន {TOOLS.length} មកក្នុងកន្លែងធ្វើការតែមួយ ដែលមានរបៀបប្រើដូចគ្នា។</p>
      <CategoryList />
      <h2>របៀបដំណើរការ</h2>
      <p>ឧបករណ៍ភាគច្រើនដំណើរការទាំងស្រុងក្នុងកម្មវិធីរុករករបស់អ្នក ដូច្នេះអត្ថបទ ឯកសារ និង token ដែលអ្នកបិទភ្ជាប់ត្រូវបានដំណើរការនៅលើឧបករណ៍របស់អ្នកផ្ទាល់។ ឧបករណ៍ដែលត្រូវការម៉ាស៊ីនមេនឹងប្រាប់ច្បាស់នៅលើទំព័ររបស់វា។</p>
      <h2>គណនី</h2>
      <p>មិនចាំបាច់មានគណនីដើម្បីប្រើឧបករណ៍ណាមួយទេ។ ការចូលដោយប្រើ Google គ្រាន់តែធ្វើសមកាលកម្មការកំណត់ ឧបករណ៍ដែលបានប្រើថ្មីៗ និងទិន្នន័យដែលបានរក្សាទុករបស់អ្នកនៅលើឧបករណ៍ផ្សេងៗប៉ុណ្ណោះ។</p>
    </InfoPage>
  ) : (
    <InfoPage title="About DLTools">
      <p>DLTools is a free, browser-based toolbox for developers, students and everyday computer users. It brings {TOOLS.length} tools together in one consistent workspace.</p>
      <CategoryList />
      <h2>How it works</h2>
      <p>Most tools run entirely in your browser, so the text, files and tokens you paste are processed on your own device. Tools that need a server say so on their page.</p>
      <h2>Accounts</h2>
      <p>No account is needed to use any tool. Signing in with Google only syncs your preferences, recently used tools and saved data across devices.</p>
    </InfoPage>
  );
}

export function PrivacyContent() {
  const kh = useLocale().locale === 'kh';
  return kh ? (
    <InfoPage title="គោលការណ៍ឯកជនភាព">
      <p>ទំព័រនេះសង្ខេបពីរបៀបដែល DLTools គ្រប់គ្រងព័ត៌មាន។ វាគឺជាសេចក្តីសង្ខេបជាភាសាងាយយល់ មិនមែនជាប្រឹក្សាផ្លូវច្បាប់ទេ។</p>
      <h2>ទិន្នន័យបញ្ចូលក្នុងឧបករណ៍របស់អ្នក</h2>
      <p>ឧបករណ៍ភាគច្រើនដំណើរការទិន្នន័យបញ្ចូលក្នុងមូលដ្ឋានក្នុងកម្មវិធីរុករករបស់អ្នក ហើយមិនផ្ញើវាទៅម៉ាស៊ីនមេរបស់យើងទេ។ ការបម្លែងឯកសារដែលប្រើម៉ាស៊ីនមេត្រូវបានដាក់ស្លាកឱ្យឃើញច្បាស់នៅលើទំព័រឧបករណ៍។</p>
      <h2>ទុកនៅលើឧបករណ៍របស់អ្នក</h2>
      <ul>
        <li>ធីម និងភាសាដែលអ្នកជ្រើសរើស ឧបករណ៍ដែលបានប្រើថ្មីៗ និងចំណូលចិត្ត (ទំហំផ្ទុកក្នុងមូលដ្ឋានរបស់ កម្មវិធីរុករក)។</li>
      </ul>
      <h2>ប្រសិនបើអ្នកចូលគណនី</h2>
      <p>ជាមួយការចូលដោយ Google យើងរក្សាទុកព័ត៌មានគណនីមូលដ្ឋានរបស់អ្នក (ឈ្មោះ អ៊ីមែល រូបតំណាង) រួមជាមួយការកំណត់ ឧបករណ៍ដែលបានប្រើថ្មីៗ និងទិន្នន័យណាមួយដែលអ្នកជ្រើសរើសរក្សាទុក ដើម្បីឱ្យវាតាមអ្នកទៅរវាងឧបករណ៍។</p>
      <h2>ការវិភាគ</h2>
      <p>យើងប្រើការវិភាគដែលគោរពឯកជនភាព ដើម្បីរាប់ការចូលមើលទំព័រ និងឧបករណ៍ ដើម្បីឱ្យយើងអាចកែលម្អគេហទំព័រ។</p>
    </InfoPage>
  ) : (
    <InfoPage title="Privacy Policy">
      <p>This page summarises how DLTools handles information. It is a plain-language summary, not legal advice.</p>
      <h2>Your tool input</h2>
      <p>Most tools process input locally in your browser and do not send it to our servers. Document conversions that use a server are labelled as such on the tool page.</p>
      <h2>Stored on your device</h2>
      <ul>
        <li>Your theme and language choice, recently used tools and favourites (browser local storage).</li>
      </ul>
      <h2>If you sign in</h2>
      <p>With Google sign-in we store your basic profile (name, email, avatar) plus your preferences, recent tools and any data you choose to save, so they follow you between devices.</p>
      <h2>Analytics</h2>
      <p>We use privacy-conscious analytics to count page and tool visits so we can improve the site.</p>
    </InfoPage>
  );
}

export function TermsContent() {
  const kh = useLocale().locale === 'kh';
  return kh ? (
    <InfoPage title="លក្ខខណ្ឌសេវា">
      <p>ដោយប្រើ DLTools អ្នកយល់ព្រមតាមលក្ខខណ្ឌទាំងនេះ។</p>
      <h2>ការប្រើប្រាស់ឧបករណ៍</h2>
      <p>ឧបករណ៍ត្រូវបានផ្តល់ជូនដោយឥតគិតថ្លៃ និង “តាមស្ថានភាពដែលមាន” ដោយគ្មានការធានា។ សូមពិនិត្យលទ្ធផលមុនពេលពឹងផ្អែកលើវា ជាពិសេសសម្រាប់កូដទូទាត់ វិញ្ញាបនបត្រ ការបម្លែង និងអ្វីៗដែលទាក់ទងនឹងសុវត្ថិភាព។</p>
      <h2>មាតិការបស់អ្នក</h2>
      <p>អ្នកទទួលខុសត្រូវចំពោះមាតិកាដែលអ្នកដំណើរការ។ កុំប្រើ DLTools សម្រាប់គោលបំណងខុសច្បាប់ ឬដើម្បីដំណើរការទិន្នន័យដែលអ្នកគ្មានសិទ្ធិគ្រប់គ្រង។</p>
      <h2>ការផ្លាស់ប្តូរ</h2>
      <p>ឧបករណ៍ និងលក្ខខណ្ឌទាំងនេះអាចផ្លាស់ប្តូរតាមពេលវេលា។ ការបន្តប្រើប្រាស់មានន័យថាអ្នកទទួលយកលក្ខខណ្ឌដែលបានធ្វើបច្ចុប្បន្នភាព។</p>
    </InfoPage>
  ) : (
    <InfoPage title="Terms of Service">
      <p>By using DLTools you agree to these terms.</p>
      <h2>Use of the tools</h2>
      <p>The tools are provided free of charge and “as is”, without warranty. Check results before relying on them, especially for payment codes, certificates, conversions and anything security-related.</p>
      <h2>Your content</h2>
      <p>You are responsible for the content you process. Do not use DLTools for unlawful purposes or to process data you have no right to handle.</p>
      <h2>Changes</h2>
      <p>Tools and these terms may change over time. Continued use means you accept the updated terms.</p>
    </InfoPage>
  );
}

export function FeedbackContent() {
  const kh = useLocale().locale === 'kh';
  return kh ? (
    <InfoPage title="មតិកែលម្អ">
      <p>រកឃើញកំហុស ចង់បានឧបករណ៍ថ្មី ឬមានគំនិតដើម្បីធ្វើឱ្យឧបករណ៍ដែលមានស្រាប់ប្រសើរជាងមុន? យើងចង់ស្តាប់អ្នក។</p>
      <p>សូមបើក issue នៅលើ <GithubLink>GitHub</GithubLink> ហើយបញ្ចូលឈ្មោះឧបករណ៍ អ្វីដែលអ្នករំពឹងទុក និងអ្វីដែលបានកើតឡើង។</p>
    </InfoPage>
  ) : (
    <InfoPage title="Feedback">
      <p>Found a bug, want a new tool, or have an idea to make an existing one better? We would like to hear it.</p>
      <p>Please open an issue on <GithubLink>GitHub</GithubLink> and include the tool name, what you expected, and what happened.</p>
    </InfoPage>
  );
}

export function ContactContent() {
  const kh = useLocale().locale === 'kh';
  return kh ? (
    <InfoPage title="ទំនាក់ទំនង">
      <p>សម្រាប់សំណួរ ភាពជាដៃគូ ឬការគាំទ្រ សូមទាក់ទងអ្នកថែទាំតាមរយៈ <GithubLink>GitHub</GithubLink>។</p>
      <p>ដើម្បីគាំទ្រគម្រោងនេះ សូមប្រើប៊ូតុង “ជួយគាំទ្រ” នៅរបារខាងលើ។</p>
    </InfoPage>
  ) : (
    <InfoPage title="Contact">
      <p>For questions, partnerships or support, reach the maintainer through <GithubLink>GitHub</GithubLink>.</p>
      <p>To support the project, use the Support button in the top navigation.</p>
    </InfoPage>
  );
}
