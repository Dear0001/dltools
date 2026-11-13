'use client';
import React from 'react';
import { ChevronDown, Gift, ShieldCheck, Zap } from 'lucide-react';
import { TOOLS } from '@/data/tools';
import { useLocale } from '@/i18n/LocaleProvider';

const FAQ_EN = [
  {
    q: 'Is DLTools free to use?',
    a: 'Yes. Every tool is free, and you don’t need to sign up to format, convert, generate or inspect your data. An optional account only syncs your preferences, recent tools and saved data.',
  },
  {
    q: 'Is my data safe?',
    a: 'Yes. Every tool runs in your browser, so the text, JSON, images, documents or tokens you paste stay on your device and are not uploaded. The only exception is the API Request Tester, which sends the request you configure to the URL you enter. Data is stored only if you sign in and choose to save it.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. DLTools works in any modern browser on desktop or mobile. Open a tool, paste your input and copy the result.',
  },
  {
    q: 'What is KHQR, and can I build or check one here?',
    a: 'KHQR is Cambodia’s QR payment standard used with Bakong. Use the KHQR Builder to create a payment QR code, and the KHQR Validator to check the structure and checksum of an existing one.',
  },
];

const FAQ_KH = [
  {
    q: 'តើ DLTools ឥតគិតថ្លៃមែនទេ?',
    a: 'បាទ/ចាស។ ឧបករណ៍ទាំងអស់ឥតគិតថ្លៃ ហើយមិនចាំបាច់ចុះឈ្មោះដើម្បីរៀបចំ បម្លែង បង្កើត ឬពិនិត្យទិន្នន័យទេ។ គណនីស្រេចចិត្តប្រើតែដើម្បីធ្វើសមកាលកម្មការកំណត់ ឧបករណ៍ថ្មីៗ និងទិន្នន័យដែលបានរក្សាទុក។',
  },
  {
    q: 'តើទិន្នន័យរបស់ខ្ញុំមានសុវត្ថិភាពទេ?',
    a: 'មានសុវត្ថិភាព។ ឧបករណ៍ទាំងអស់ដំណើរការក្នុងកម្មវិធីរុករករបស់អ្នក ដូច្នេះអត្ថបទ JSON រូបភាព ឯកសារ ឬ token ដែលអ្នកបិទភ្ជាប់នៅលើឧបករណ៍របស់អ្នក ហើយមិនត្រូវបានផ្ទុកឡើងទេ។ ករណីលើកលែងតែមួយគត់គឺ API Request Tester ដែលផ្ញើសំណើដែលអ្នកកំណត់ទៅ URL ដែលអ្នកបញ្ចូល។ ទិន្នន័យត្រូវបានរក្សាទុកតែនៅពេលអ្នកចូលគណនី ហើយជ្រើសរើសរក្សាទុកប៉ុណ្ណោះ។',
  },
  {
    q: 'តើខ្ញុំត្រូវដំឡើងអ្វីទេ?',
    a: 'មិនចាំបាច់ទេ។ DLTools ដំណើរការលើកម្មវិធីរុករកទំនើបណាមួយ ទាំងកុំព្យូទ័រ និងទូរស័ព្ទ។ បើកឧបករណ៍ បិទភ្ជាប់ទិន្នន័យ ហើយចម្លងលទ្ធផល។',
  },
  {
    q: 'តើ KHQR ជាអ្វី ហើយខ្ញុំអាចបង្កើត ឬពិនិត្យវានៅទីនេះបានទេ?',
    a: 'KHQR គឺជាស្តង់ដារ QR ទូទាត់របស់កម្ពុជា ដែលប្រើជាមួយ Bakong។ ប្រើឧបករណ៍បង្កើត KHQR ដើម្បីបង្កើត QR Code ទូទាត់ និងឧបករណ៍ផ្ទៀងផ្ទាត់ KHQR ដើម្បីពិនិត្យរចនាសម្ព័ន្ធ និង checksum នៃកូដដែលមានស្រាប់។',
  },
];

export default function SeoContent() {
  const { locale } = useLocale();
  const kh = locale === 'kh';
  const faq = kh ? FAQ_KH : FAQ_EN;

  const reasons = kh
    ? [
        { icon: Gift, title: 'ឥតគិតថ្លៃ', text: `ឧបករណ៍ទាំង ${TOOLS.length} ប្រើបានដោយមិនចាំបាច់ចុះឈ្មោះ។` },
        { icon: ShieldCheck, title: 'ឯកជន', text: 'ឧបករណ៍ភាគច្រើនដំណើរការក្នុងកម្មវិធីរុករករបស់អ្នក ទិន្នន័យមិនចាកចេញពីឧបករណ៍។' },
        { icon: Zap, title: 'រហ័ស', text: 'មិនចាំបាច់ដំឡើងអ្វីទេ។ បើក បិទភ្ជាប់ ចម្លង ហើយចប់។' },
      ]
    : [
        { icon: Gift, title: 'Free', text: `All ${TOOLS.length} tools are free to use, with no sign-up.` },
        { icon: ShieldCheck, title: 'Private', text: 'Most tools run in your browser, so your data stays on your device.' },
        { icon: Zap, title: 'Fast', text: 'Nothing to install. Open a tool, paste, copy, done.' },
      ];

  return (
    <section className="mt-16 border-t border-border pt-12" aria-labelledby="why-dltools-heading">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="why-dltools-heading" className="text-2xl font-semibold tracking-tight text-foreground">
          {kh ? 'ហេតុអ្វីបានជាប្រើ DLTools?' : 'Why people use DLTools'}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {kh
            ? 'ឧបករណ៍ប្រចាំថ្ងៃសម្រាប់អ្នកអភិវឌ្ឍន៍ និងអ្នកប្រើកុំព្យូទ័រ នៅកន្លែងតែមួយ។'
            : 'Everyday tools for developers and computer users, all in one place.'}
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {reasons.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-border bg-card p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon size={18} aria-hidden="true" />
            </span>
            <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-3xl">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {kh ? 'សំណួរដែលសួរញឹកញាប់' : 'Frequently asked questions'}
        </h2>
        <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {faq.map((item, index) => (
            <details key={item.q} className="group" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:bg-muted [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
