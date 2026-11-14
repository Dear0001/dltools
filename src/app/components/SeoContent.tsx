'use client';
import React from 'react';
import { ChevronDown, Gift, ShieldCheck, Zap } from 'lucide-react';
import { TOOLS } from '@/data/tools';
import { PRIVACY_COUNTS } from '@/data/toolPrivacy';

const { local, total } = PRIVACY_COUNTS;
import { useLocale } from '@/i18n/LocaleProvider';

const FAQ_EN = [
  {
    q: 'Is DLTools free to use?',
    a: 'Yes. Every tool is free, and you don’t need to sign up to format, convert, generate or inspect your data. An optional account only syncs your preferences, recent tools and saved data.',
  },
  {
    q: 'Is my data uploaded to a server?',
    a: `Not for ${local} of the ${total} tools. They process your text, JSON, images and documents (including PDF and Word conversion) in your browser, and the input is not sent to our server. The exception is the HTTP Request Tester: it sends the request you build from your browser directly to the URL you enter, and that destination receives everything in it, including any headers or tokens. Our server receives tool data only if you sign in and save it with Saved data.`,
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
    q: 'តើទិន្នន័យរបស់ខ្ញុំត្រូវបានផ្ទុកឡើងទៅម៉ាស៊ីនមេទេ?',
    a: `មិនផ្ទុកឡើងទេ សម្រាប់ឧបករណ៍ ${local} ក្នុងចំណោម ${total}។ ឧបករណ៍ទាំងនោះដំណើរការអត្ថបទ JSON រូបភាព និងឯកសាររបស់អ្នក (រួមទាំងការបម្លែង PDF និង Word) ក្នុងកម្មវិធីរុករក ហើយមិនផ្ញើទិន្នន័យទៅម៉ាស៊ីនមេរបស់យើងទេ។ ករណីលើកលែងគឺ «សាកល្បង HTTP Request»៖ វាផ្ញើសំណើដែលអ្នកបង្កើតពីកម្មវិធីរុករកដោយផ្ទាល់ទៅ URL ដែលអ្នកបញ្ចូល ហើយគេហទំព័រគោលដៅនោះទទួលបានអ្វីៗទាំងអស់ក្នុងសំណើ រួមទាំង header ឬ token។ ម៉ាស៊ីនមេរបស់យើងទទួលទិន្នន័យឧបករណ៍ លុះត្រាតែអ្នកចូលគណនី ហើយរក្សាទុកវាក្នុង «ទិន្នន័យដែលបានរក្សាទុក» ប៉ុណ្ណោះ។`,
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
        { icon: ShieldCheck, title: 'ឯកជន', text: `ឧបករណ៍ ${local} ក្នុងចំណោម ${total} ដំណើរការក្នុងកម្មវិធីរុករក។ «សាកល្បង HTTP Request» ផ្ញើសំណើរបស់អ្នកដោយផ្ទាល់ទៅ URL ដែលអ្នកបញ្ចូល ហើយគេហទំព័រនោះទទួលបានសំណើនោះ។` },
        { icon: Zap, title: 'រហ័ស', text: 'មិនចាំបាច់ដំឡើងអ្វីទេ។ បើក បិទភ្ជាប់ ចម្លង ហើយចប់។' },
      ]
    : [
        { icon: Gift, title: 'Free', text: `All ${TOOLS.length} tools are free to use, with no sign-up.` },
        { icon: ShieldCheck, title: 'Private', text: `${local} of ${total} tools process your input in your browser. The HTTP Request Tester sends your request straight to the URL you enter, and that site receives it.` },
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
