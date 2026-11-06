'use client';
import React from 'react';
import Link from 'next/link';
import { CATEGORIES, TOOLS, getToolPath } from '@/data/tools';
import { getCategoryName, getToolDescription, getToolName, useLocale } from '@/i18n/LocaleProvider';

const FAQ_EN = [
  {
    q: 'Is DLTools free to use?',
    a: 'Yes. Every tool on DLTools is free, with no sign-up needed to format, convert, generate or inspect your data. An optional account only syncs your preferences, recent tools and saved data.',
  },
  {
    q: 'Is my data safe?',
    a: 'Most tools run entirely in your browser, so the text, JSON, images or tokens you paste are processed on your own device and are not uploaded to a server. Tools that need a server, such as some document conversions, say so on their page.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. DLTools works in any modern browser on desktop or mobile. Open a tool, paste your input and copy the result.',
  },
  {
    q: 'What is KHQR and can I build or validate it here?',
    a: 'KHQR is the Cambodian QR payment standard used with Bakong. DLTools includes a KHQR builder to create payment QR codes and a KHQR validator to check the EMV structure and checksum of an existing code.',
  },
];

const FAQ_KH = [
  {
    q: 'តើ DLTools ឥតគិតថ្លៃមែនទេ?',
    a: 'បាទ/ចាស។ ឧបករណ៍ទាំងអស់នៅលើ DLTools គឺឥតគិតថ្លៃ ហើយមិនតម្រូវឱ្យចុះឈ្មោះដើម្បីរៀបចំ បម្លែង បង្កើត ឬពិនិត្យទិន្នន័យរបស់អ្នកទេ។ គណនីស្រេចចិត្តប្រើតែដើម្បីធ្វើសមកាលកម្មការកំណត់ ឧបករណ៍ថ្មីៗ និងទិន្នន័យដែលបានរក្សាទុក។',
  },
  {
    q: 'តើទិន្នន័យរបស់ខ្ញុំមានសុវត្ថិភាពទេ?',
    a: 'ឧបករណ៍ភាគច្រើនដំណើរការទាំងស្រុងក្នុង browser របស់អ្នក ដូច្នេះអត្ថបទ JSON រូបភាព ឬ token ដែលអ្នកបិទភ្ជាប់ត្រូវបានដំណើរការនៅលើឧបករណ៍របស់អ្នកផ្ទាល់ ហើយមិនត្រូវបានផ្ទុកឡើងទៅម៉ាស៊ីនមេទេ។ ឧបករណ៍ដែលត្រូវការម៉ាស៊ីនមេ ដូចជាការបម្លែងឯកសារមួយចំនួន នឹងប្រាប់ច្បាស់នៅលើទំព័ររបស់វា។',
  },
  {
    q: 'តើខ្ញុំត្រូវដំឡើងអ្វីទេ?',
    a: 'មិនចាំបាច់ទេ។ DLTools ដំណើរការលើ browser ទំនើបណាមួយ ទាំងកុំព្យូទ័រ និងទូរស័ព្ទ។ បើកឧបករណ៍ បិទភ្ជាប់ទិន្នន័យ ហើយចម្លងលទ្ធផល។',
  },
  {
    q: 'តើ KHQR ជាអ្វី ហើយខ្ញុំអាចបង្កើត ឬផ្ទៀងផ្ទាត់វាទីនេះបានទេ?',
    a: 'KHQR គឺជាស្តង់ដារ QR ទូទាត់របស់កម្ពុជា ដែលប្រើជាមួយ Bakong។ DLTools មានឧបករណ៍បង្កើត KHQR ដើម្បីបង្កើត QR Code ទូទាត់ និងឧបករណ៍ផ្ទៀងផ្ទាត់ KHQR ដើម្បីពិនិត្យរចនាសម្ព័ន្ធ EMV និង checksum នៃកូដដែលមានស្រាប់។',
  },
];

export default function SeoContent() {
  const { locale } = useLocale();
  const kh = locale === 'kh';
  const faq = kh ? FAQ_KH : FAQ_EN;

  return (
    <section className="mt-14 border-t border-border pt-9" aria-labelledby="about-dltools-heading">
      <h2 id="about-dltools-heading" className="text-2xl font-semibold tracking-tight text-foreground">
        {kh ? 'ឧបករណ៍អភិវឌ្ឍន៍អនឡាញឥតគិតថ្លៃ នៅកន្លែងតែមួយ' : 'Free online developer tools in one place'}
      </h2>
      <div className="mt-3 max-w-4xl space-y-3 text-sm leading-relaxed text-muted-foreground">
        {kh ? (
          <>
            <p>
              DLTools គឺជាបណ្តុំឧបករណ៍អភិវឌ្ឍន៍ឥតគិតថ្លៃចំនួន {TOOLS.length} ដែលដំណើរការលើ browser សម្រាប់ការងារប្រចាំថ្ងៃ៖ រៀបចំ និងផ្ទៀងផ្ទាត់ JSON, SQL, XML, YAML និង Markdown ប្រៀបធៀបអត្ថបទ និងកូដ បង្កើត និងអាន QR និង KHQR ឌិកូដ JWT បង្កើត UUID និង hash សាកល្បង regular expression បម្លែងទិន្នន័យរវាងទ្រង់ទ្រាយ និងបម្លែងឯកសារ PDF ទៅជា Word។ មិនចាំបាច់ដំឡើងអ្វីទេ ហើយឧបករណ៍ភាគច្រើនដំណើរការក្នុងមូលដ្ឋាន ដូច្នេះទិន្នន័យរបស់អ្នកនៅលើឧបករណ៍របស់អ្នក។
            </p>
            <p>
              ឧបករណ៍នីមួយៗបើកនៅលើទំព័រផ្ទាល់ខ្លួន ដែលមានផ្នែកបញ្ចូល និងលទ្ធផលច្បាស់លាស់ ទិន្នន័យគំរូសម្រាប់សាកល្បង និងការចម្លងតែមួយចុច។ ជ្រើសរើសប្រភេទខាងក្រោមដើម្បីមើលអ្វីដែលមាន ឬប្រើប្រអប់ស្វែងរកនៅផ្នែកខាងលើទំព័រដើម្បីទៅកាន់ឧបករណ៍ដោយផ្ទាល់។
            </p>
          </>
        ) : (
          <>
            <p>
              DLTools is a collection of {TOOLS.length} free, browser-based developer tools for everyday work: formatting and
              validating JSON, SQL, XML, YAML and Markdown, comparing text and code, generating and reading QR and KHQR codes,
              decoding JWTs, creating UUIDs and hashes, testing regular expressions, converting data between formats, and turning
              PDF files into Word documents. There is nothing to install, and most tools run locally so your data stays on your device.
            </p>
            <p>
              Each tool opens on its own page with a clear input and output, sample data to try, and one-click copy. Pick a
              category below to see what is available, or use the search box at the top of the page to jump straight to a tool.
            </p>
          </>
        )}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {CATEGORIES.map((category) => {
          const tools = TOOLS.filter((tool) => tool.category === category.id);
          if (tools.length === 0) return null;
          return (
            <div key={category.id}>
              <h3 className="text-lg font-semibold text-foreground">{getCategoryName(category.id, category.label, locale)}</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {tools.map((tool) => (
                  <li key={tool.id}>
                    <Link href={getToolPath(tool)} className="font-medium text-foreground hover:text-primary">
                      {getToolName(tool.id, tool.name, locale)}
                    </Link>
                    {' — '}
                    {getToolDescription(tool.id, tool.description, locale)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 text-2xl font-semibold tracking-tight text-foreground">{kh ? 'សំណួរដែលសួរញឹកញាប់' : 'Frequently asked questions'}</h2>
      <dl className="mt-3 max-w-4xl space-y-4 text-sm leading-relaxed">
        {faq.map((item) => (
          <div key={item.q}>
            <dt className="font-semibold text-foreground">{item.q}</dt>
            <dd className="mt-1 text-muted-foreground">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
