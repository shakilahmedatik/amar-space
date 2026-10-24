export type Locale = "en" | "bn";

export const defaultTranslations: Record<Locale, Record<string, string>> = {
  en: {
    // Top Banner & Common
    "banner.offer":
      "Royal Heritage Launch • 180 Days Full Complimentary Access • 0% Commission Direct Booking Engine",
    "banner.inaugural": "Inaugural Access",
    "banner.calc": "Calculate Savings →",
    "banner.gateway": "Direct bKash Merchant & Bank Wire Gateway Active",

    // Navbar
    "nav.overview": "Overview",
    "nav.liveConsole": "Live Console",
    "nav.modules": "Platform Modules",
    "nav.calculator": "ROI & OTA Savings",
    "nav.sovereignty": "Sovereign Cloud",
    "nav.guarantee": "180-Day Guarantee",
    "nav.advisory": "Advisory FAQ",
    "nav.tour": "Tour",
    "nav.concierge": "Concierge",
    "nav.signIn": "Manager Sign In",
    "nav.trialBtn": "Begin 180-Day Trial",

    // Hero Section
    "hero.badge": "Multi-Tenant Hospitality & Real Estate OS | 180 Days Complimentary",
    "hero.title": "The Operating System for Prestigious Hotels, Resorts & Residential Towers",
    "hero.subtitle":
      "Curated boutique website builder, bespoke subdomains, 0% commission direct booking engine, and native mobile apps for luxury hoteliers. Automated monthly utility ledgers, tenant portals, and certified security audits for estate owners.",
    "hero.ctaPrimary": "Provision Your Property (6 Months Free)",
    "hero.ctaTour": "Interactive Guided Tour",
    "hero.ctaConcierge": "Concierge Desk",
    "hero.trustNoCard": "Zero credit card needed",
    "hero.trustBkash": "Paystation & bKash native integration",
    "hero.trustStaff": "Unlimited staff governance & roles",
    "hero.trustPrivacy": "Self-hosted sovereign privacy",

    // Cockpit
    "cockpit.liveConsole": "Live Console v4.8",
    "cockpit.tabHotel": "Hotel Front Desk",
    "cockpit.tabResidential": "Residential Ledger",
    "cockpit.tabGuest": "Guest Engine & QR",
    "cockpit.shift": "Shift: Butler Master Rafiq",
    "cockpit.suiteMatrix": "Live Suite & Villa Matrix",
    "cockpit.toggleHint": "Click row to toggle state",
    "cockpit.occupied": "Occupied",
    "cockpit.turnover": "Turnover",
    "cockpit.available": "Available",
    "cockpit.revpar": "Daily Estate RevPAR",
    "cockpit.revparGrowth": "+14.8% vs Last Cycle",
    "cockpit.directRatio": "Direct booking ratio: 92.4% (Saved ৳126,375 in OTA commissions today).",
    "cockpit.liveVoucher": "Live Guest Booking Voucher",
    "cockpit.voucherRef": "Voucher Ref:",
    "cockpit.downloadVoucher": "Simulate Voucher Download",
    "cockpit.downloading": "Generating Cryptographic Voucher...",
    "cockpit.downloaded": "PDF Voucher Generated!",
    "cockpit.sommelierAudit": "Progressive Disclosure: View Sommelier & Butler Audit Log",
    "cockpit.monthlyLedger": "1st-of-Month Automated Folio Ledger",
    "cockpit.reconciled": "94.6% Auto-Reconciled",
    "cockpit.utilityRecovery": "Monthly Utility Recovery",
    "cockpit.dispatchBills": "Simulate 1st-of-Month Bill Dispatch",
    "cockpit.dispatching": "Dispatching bKash Payment Links...",
    "cockpit.dispatched": "Folios Auto-Dispatched & Cleared!",
    "cockpit.meterTelemetry": "Progressive Disclosure: View WASA & DESCO Meter Telemetry",
    "cockpit.simulateSkeleton": "Simulate Skeleton",
    "cockpit.subdomainCopied": "grand-sanctuary.omniheaven.com",
    "cockpit.generateQr": "Generate Live Test QR Key",
    "cockpit.revokeQr": "Revoke QR Key",
    "cockpit.contactlessKey": "Cryptographic Contactless QR Key",

    // Bento Features
    "bento.tag": "Unprecedented Architecture",
    "bento.title": "Engineered for Opulent Hospitality & High-Yield Residences",
    "bento.subtitle":
      "Switch seamlessly between commercial guest booking workflows and residential monthly tenancy collections. Everything is unified in one sovereign operating system.",
    "bento.hotelTab": "Hotel & Resort Edition",
    "bento.resTab": "Building & Residential Edition",
    "bento.card1Title": "Bespoke Direct Booking Engine",
    "bento.card1Desc":
      "Eliminate 18–25% intermediary commissions from Agoda or Booking.com. Guests book directly on your branded domain with zero friction.",
    "bento.card1Badge": "0% OTA Commission",
    "bento.card2Title": "Boutique Website Builder",
    "bento.card2Desc":
      "Launch high-converting, editorially styled websites for your estate in minutes. Choose from Royal Champagne, Emerald Coast, or Alabaster Noir palettes.",
    "bento.openLightbox": "Open Lightbox",
    "bento.card3Title": "Manager Mobile Concierge",
    "bento.card3Desc":
      "Native iOS & Android companion app for front-desk teams. Receive instant push notifications on guest arrivals and biometric verification.",
    "bento.card4Title": "Housekeeping Turnover Matrix",
    "bento.card4Desc":
      "Real-time room status switches (Vacant Clean, Maintenance, Turnaround) with photo evidence upload and sommelier bar restocking logs.",
    "bento.card5Title": "Bespoke Edge Subdomains",
    "bento.card5Desc":
      "Automatic provisioning of [slug].omniheaven.com or your own custom domain with wildcard SSL certificates.",
    "bento.resCard1Title": "Automated Monthly Ledger & Utility Invoicing",
    "bento.resCard1Desc":
      "Generate itemized monthly rent folios (Base Rent, Water, Gas, Service Charge, Electricity) on the 1st of every month with zero manual bookkeeping.",
    "bento.resCard1Badge": "Auto-Dispatched on 1st",
    "bento.resCard2Title": "Dedicated Resident Portal",
    "bento.resCard2Desc":
      "Tenants log in using their secure flat access code to review statement archives, download official tax clearance receipts, and message caretakers.",
    "bento.resCard3Title": "Maintenance Dispatch Desk",
    "bento.resCard3Desc":
      "Tenants report facility issues with photo attachments. Dispatch technicians and log repair expenses directly into the building ledger.",
    "bento.resCard4Title": "bKash Tokenized Merchant",
    "bento.resCard4Desc":
      "Native webhooks automatically map payments to tenant flats instantly with zero manual matching of bKash TrxID strings.",
    "bento.resCard5Title": "Multi-Building Portfolio HQ",
    "bento.resCard5Desc":
      "Manage residential towers in Gulshan, Dhanmondi, and Banani simultaneously under one master executive account.",

    // ROI Calculator
    "calc.tag": "Interactive ROI & OTA Savings Engine",
    "calc.title": "Calculate How Much Capital You Retain",
    "calc.subtitle":
      "Eliminate foreign OTA booking taxes and automated manual utility leakage. Test your estate dimensions below.",
    "calc.hotelMode": "Hotels & Luxury Resorts",
    "calc.resMode": "Residential Towers & Flats",
    "calc.unitsHotel": "Total Rooms & Suites",
    "calc.unitsRes": "Total Flats & Commercial Units",
    "calc.rateHotel": "Average Daily Room Rate (ADR)",
    "calc.rateRes": "Average Monthly Rent Per Flat",
    "calc.occupancyLabel": "Estimated Average Occupancy",
    "calc.freeTier": "180 Days Included Free",
    "calc.annualSavedHotel": "Estimated Annual OTA Fees Saved",
    "calc.annualSavedRes": "Annual Cash Flow Managed",
    "calc.postTrialTier": "Post-Trial Transparent Tier",
    "calc.monthFlat": "/ month flat",
    "calc.claimPass": "Claim 180-Day Complimentary Pass",
    "calc.infoHotel":
      "Based on a conservative 20% aggregate OTA commission benchmark (Booking.com, Agoda, Expedia) versus omniHeaven's 0% Direct Engine.",
    "calc.infoRes":
      "Eliminates utility collection leakage, bounced cheques, and physical paper accounting overhead.",

    // Sovereignty Grid
    "infra.tag": "Zero Cloud Vendor Lock-In",
    "infra.title": "Sovereign Enterprise Infrastructure",
    "infra.subtitle":
      "High-net-worth guests and premier real estate assets demand complete digital sovereignty. omniHeaven isolates your property's databases, images, and keys under your sovereign jurisdiction.",
    "infra.c1Tag": "Core Data Sovereignty",
    "infra.c1Title": "Self-Hosted PostgreSQL",
    "infra.c1Desc":
      "Dedicated schemas and tenant encryption keys. Your resident folios and guest profiles are strictly isolated and never co-mingled in shared multi-tenant black boxes.",
    "infra.c1Meta": "Point-in-Time Recovery Active",
    "infra.c2Tag": "Asset Sovereignty",
    "infra.c2Title": "SeaweedFS S3 Storage",
    "infra.c2Desc":
      "High-performance distributed blob store for high-resolution villa galleries, signed tenant lease deeds, and utility receipts without external cloud egress surcharges.",
    "infra.c2Meta": "S3 API & Local NVMe Disks",
    "infra.c3Tag": "Edge DNS & Routing",
    "infra.c3Title": "Cloudflare Wildcard Routing",
    "infra.c3Desc":
      "Sub-second SSL certificate resolution for dynamic custom subdomains (*.omniheaven.com) or custom estate domains with enterprise DDoS protection.",
    "infra.c3Meta": "Sub-50ms Global Edge Latency",
    "infra.c4Tag": "Financial Settlement",
    "infra.c4Title": "Multi-Gateway Settlement",
    "infra.c4Desc":
      "Direct tokenized reconciliation with bKash Merchant, Nagad, Paystation, and Stripe for international foreign credit cards with automated TrxID mapping.",
    "infra.c4Meta": "Auto TrxID Reconciliation",

    // Trial Roadmap
    "roadmap.tag": "Zero-Risk Sovereign Guarantee",
    "roadmap.title": "Why We Provide 6 Months 100% Free",
    "roadmap.subtitle":
      "We understand property owners and hoteliers hesitate to adopt new software because of cumbersome onboarding and upfront lock-ins. We are confident omniHeaven will streamline your operations and maximize your occupancy that you pay nothing for 180 days.",
    "roadmap.s1Phase": "Provisioning",
    "roadmap.s1Title": "Instant 3-Minute Setup",
    "roadmap.s1Desc":
      "Name your property, reserve your custom subdomain, and immediately unlock your administrative dashboard. Zero credit card or paperwork required.",
    "roadmap.s1Highlight": "Zero Upfront Cost",
    "roadmap.s2Phase": "Operation",
    "roadmap.s2Title": "180 Days Full Pro Access",
    "roadmap.s2Desc":
      "Every module is active: Boutique Web Builder, Renter Portal, direct bookings, multi-staff governance, and automated bKash reconciliation.",
    "roadmap.s2Highlight": "Unlimited Transactions",
    "roadmap.s3Phase": "Evaluation",
    "roadmap.s3Title": "Decide with Zero Lock-In",
    "roadmap.s3Desc":
      "After 6 months, seamlessly continue on our transparent monthly subscription or export your complete forensic SQL database anytime.",
    "roadmap.s3Highlight": "Full Data Portability",

    // FAQ
    "faq.tag": "Executive Advisory & Clarifications",
    "faq.title": "Frequently Asked Questions",
    "faq.subtitle": "Everything hoteliers, developers, and residential estate owners need to know.",
    "faq.q1": "How does the 0% commission direct booking engine work?",
    "faq.a1":
      "omniHeaven equips your hotel or resort with a bespoke booking engine hosted on your own subdomain or domain. When guests reserve suites directly, payments flow through your merchant account (bKash, Paystation, Stripe). omniHeaven takes zero percentage markup or commission, allowing you to retain 100% of guest revenue.",
    "faq.q2": "Can we continue using Booking.com, Agoda, and Airbnb alongside omniHeaven?",
    "faq.a2":
      "Yes. omniHeaven operates harmoniously alongside existing OTA channels. You can use omniHeaven as your central property management system (PMS) while channeling high-yield repeat guests and direct traffic to your 0% commission engine to gradually eliminate OTA dependency.",
    "faq.q3": "How does automated bKash reconciliation work for residential buildings?",
    "faq.a3":
      "When utility bills and rent statements are auto-generated on the 1st of the month, tenants receive an SMS/email with a direct tokenized bKash payment link. Once cleared, our webhook automatically updates the tenant's ledger in real time, marks the month as paid, and issues an official tax invoice without any manual TrxID verification.",
    "faq.q4": "Is our data hosted locally with sovereign privacy?",
    "faq.a4":
      "Yes. omniHeaven utilizes self-hosted PostgreSQL with organization-level tenant schema isolation and SeaweedFS distributed storage. Your financial folios, guest passports, and contracts remain under your direct sovereign control, backed up with daily automated point-in-time recovery snapshots.",
    "faq.q5": "What happens after our 180-day complimentary period ends?",
    "faq.a5":
      "You will receive an advisory notification on day 150. You can choose to continue seamlessly on our transparent monthly subscription (starting from ৳2,500/month flat), or export your complete forensic database and guest lists with one click. There are zero penalties, zero setup fees, and zero lock-ins.",
    "faq.q6": "Can non-technical front-desk staff and building caretakers learn it easily?",
    "faq.a6":
      "omniHeaven was designed with Swiss hospitality ergonomic principles: clean room cards, high contrast, large touch targets (minimum 48px), and full support for English and Bengali. Most estate managers master the front-desk matrix in under 15 minutes.",

    // Bottom CTA & Footer
    "cta.badge": "Inaugural Royal Heritage Pass • 180 Days Complimentary",
    "cta.title": "Ready to Elevate Your Estate to 5-Star Digital Precision?",
    "cta.subtitle":
      "Join visionary hoteliers, luxury resorts, and high-yield residential estates across Bangladesh. Provision your sovereign administrative workspace in 3 minutes.",
    "cta.inputPlaceholder": "Enter hotel or property name...",
    "cta.submit": "Claim 6 Months Free",
    "cta.trustNoCard": "No credit card required",
    "cta.trustNoFees": "Zero transaction fees",
    "cta.trustPortability": "Full data portability",
    "footer.desc":
      "The unified operating system for 5-star hotels, boutique resorts, and premium residential towers. Combining Swiss operational precision with Aman-inspired hospitality serenity.",
    "footer.cloudStatus": "Sovereign Cloud Core: All Systems Operational",
    "footer.colWorkspaces": "Monorepo Workspaces",
    "footer.colModules": "Specialized Modules",
    "footer.colTrust": "Compliance & Trust",
    "footer.rights": "omniHeaven OS. All rights reserved. Sovereign Real Estate Operating Systems.",

    // Concierge & Coach Marks & Affix
    "concierge.title": "Concierge Desk",
    "concierge.status": "Live • 24/7 Priority Support",
    "concierge.jumpTitle": "Jump to Monorepo Portals",
    "concierge.inquiryTitle": "Priority Executive Advisory",
    "concierge.inquiryDesc":
      "Request an architect walkthrough or bespoke enterprise SLA migration.",
    "concierge.namePlaceholder": "Your Name / Title",
    "concierge.phonePlaceholder": "Direct Mobile / WhatsApp",
    "concierge.sendInquiry": "Send Priority Request",
    "concierge.sending": "Transmitting to Concierge...",
    "affix.tour": "Start Interactive Tour",
    "affix.concierge": "Concierge Desk",
    "coach.step1Title": "Live Suite & Villa Matrix",
    "coach.step1Desc":
      "This is your real-time front desk sandbox. Click any room row to toggle its live state between Occupied, Turnover, and Available.",
    "coach.step1Pill": "Step 1 of 4 • Front Desk Cockpit",
    "coach.step2Title": "Direct RevPAR Telemetry",
    "coach.step2Desc":
      "Track daily RevPAR metrics, direct booking percentages, and click 'Simulate Voucher Download' to generate a cryptographic guest voucher.",
    "coach.step2Pill": "Step 2 of 4 • Revenue Telemetry",
    "coach.step3Title": "Dual-Industry Architecture & Palette Engine",
    "coach.step3Desc":
      "Switch between Hotel & Resort Edition and Residential Building Edition. Test the live theme palette engine by clicking Champagne, Emerald, or Obsidian.",
    "coach.step3Pill": "Step 3 of 4 • Interactive Bento Grid",
    "coach.step4Title": "Interactive OTA Commission Calculator",
    "coach.step4Desc":
      "Drag the room count and ADR sliders to calculate exact cash retained by bypassing 20% foreign OTA middleman commissions.",
    "coach.step4Pill": "Step 4 of 4 • ROI Engine",
    "coach.next": "Next Step",
    "coach.prev": "Previous",
    "coach.finish": "Complete Tour",
  },

  bn: {
    // Top Banner & Common
    "banner.offer": "রয়্যাল হেরিটেজ লঞ্চ • ১৮০ দিন সম্পূর্ণ ফ্রি অ্যাক্সেস • ০% কমিশন ডিরেক্ট বুকিং ইঞ্জিন",
    "banner.inaugural": "উদ্বোধনী অফার",
    "banner.calc": "সঞ্চয় হিসাব করুন →",
    "banner.gateway": "সরাসরি বিকাশ মার্চেন্ট ও ব্যাংক ওয়্যার গেটওয়ে সক্রিয়",

    // Navbar
    "nav.overview": "পরিচিতি",
    "nav.liveConsole": "লাইভ কনসোল",
    "nav.modules": "প্ল্যাটফর্ম মডিউল",
    "nav.calculator": "আরওআই ও সঞ্চয়",
    "nav.sovereignty": "সার্বভৌম ক্লাউড",
    "nav.guarantee": "১৮০ দিনের নিশ্চয়তা",
    "nav.advisory": "পরামর্শ ও প্রশ্নোত্তর",
    "nav.tour": "ট্যুর",
    "nav.concierge": "কনসিয়ার্জ",
    "nav.signIn": "ম্যানেজার লগইন",
    "nav.trialBtn": "১৮০ দিনের ট্রায়াল শুরু করুন",

    // Hero Section
    "hero.badge": "মাল্টি-টেন্যান্ট হসপিটালিটি ও রিয়েল এস্টেট ওএস | ১৮০ দিন সম্পূর্ণ ফ্রি",
    "hero.title": "মর্যাদাপূর্ণ হোটেল, রিসোর্ট ও রেসিডেন্সিয়াল টাওয়ারের অপারেটিং সিস্টেম",
    "hero.subtitle":
      "বিলাসবহুল হোটেলিয়ারদের জন্য কিউরেটেড ওয়েবসাইট বিল্ডার, নিজস্ব সাবডোমেন, ০% কমিশন ডিরেক্ট বুকিং ইঞ্জিন ও মোবাইল অ্যাপস। এস্টেট মালিকদের জন্য স্বয়ংক্রিয় ইউটিলিটি লেজার, রেন্টার পোর্টাল ও সার্বভৌম অডিট।",
    "hero.ctaPrimary": "আপনার প্রপার্টি চালু করুন (৬ মাস ফ্রি)",
    "hero.ctaTour": "ইন্টারেক্টিভ ট্যুর দেখুন",
    "hero.ctaConcierge": "কনসিয়ার্জ ডেস্ক",
    "hero.trustNoCard": "কোন ক্রেডিট কার্ড প্রয়োজন নেই",
    "hero.trustBkash": "পে-স্টেশন ও বিকাশ নেটিভ পেমেন্ট",
    "hero.trustStaff": "আনলিমিটেড স্টাফ ও ভূমিকা নিয়ন্ত্রণ",
    "hero.trustPrivacy": "সেলফ-হোস্টেড সার্বভৌম গোপনীয়তা",

    // Cockpit
    "cockpit.liveConsole": "লাইভ কনসোল v৪.৮",
    "cockpit.tabHotel": "হোটেল ফ্রন্ট ডেস্ক",
    "cockpit.tabResidential": "রেসিডেন্সিয়াল লেজার",
    "cockpit.tabGuest": "গেস্ট ইঞ্জিন ও কিউআর",
    "cockpit.shift": "শিফট: হেড বাটলার রফিক",
    "cockpit.suiteMatrix": "লাইভ সুইট ও ভিলা ম্যাট্রিক্স",
    "cockpit.toggleHint": "স্ট্যাটাস পরিবর্তন করতে ক্লিক করুন",
    "cockpit.occupied": "বুকড / পূর্ণ",
    "cockpit.turnover": "পরিচ্ছন্নতা চলছে",
    "cockpit.available": "খালি / প্রস্তুত",
    "cockpit.revpar": "দৈনিক এস্টেট রেভপার",
    "cockpit.revparGrowth": "+১৪.৮% পূর্ববর্তী চক্রের তুলনায়",
    "cockpit.directRatio": "ডিরেক্ট বুকিং অনুপাত: ৯২.৪% (আজকে ওটিএ কমিশনে ৳১২৬,৩৭৫ সঞ্চিত)।",
    "cockpit.liveVoucher": "লাইভ গেস্ট বুকিং ভাউচার",
    "cockpit.voucherRef": "ভাউচার রেফারেন্স:",
    "cockpit.downloadVoucher": "ভাউচার ডাউনলোড সিমুলেট করুন",
    "cockpit.downloading": "ক্রিপ্টোগ্রাফিক ভাউচার তৈরি হচ্ছে...",
    "cockpit.downloaded": "পিডিএফ ভাউচার সফলভাবে তৈরি হয়েছে!",
    "cockpit.sommelierAudit": "প্রগ্রেসিভ ডিসক্লোজার: বাটলার ও সেলিজ অডিট লগ দেখুন",
    "cockpit.monthlyLedger": "১লা তারিখের স্বয়ংক্রিয় ইউটিলিটি লেজার",
    "cockpit.reconciled": "৯৪.৬% স্বয়ংক্রিয় রিকনসাইল্ড",
    "cockpit.utilityRecovery": "মাসিক ইউটিলিটি আদায়",
    "cockpit.dispatchBills": "১লা তারিখের বিল পাঠানো সিমুলেট করুন",
    "cockpit.dispatching": "বিকাশ পেমেন্ট লিংক পাঠানো হচ্ছে...",
    "cockpit.dispatched": "বিল সফলভাবে পাঠানো ও ক্লিয়ার হয়েছে!",
    "cockpit.meterTelemetry": "প্রগ্রেসিভ ডিসক্লোজার: ওয়াসা ও ডেসকো মিটার তথ্য দেখুন",
    "cockpit.simulateSkeleton": "স্কেলিটন লোড সিমুলেট করুন",
    "cockpit.subdomainCopied": "grand-sanctuary.omniheaven.com",
    "cockpit.generateQr": "লাইভ টেস্ট কিউআর কি তৈরি করুন",
    "cockpit.revokeQr": "কিউআর কি বাতিল করুন",
    "cockpit.contactlessKey": "কনট্যাক্টলেস বায়োমেট্রিক কিউআর কি",

    // Bento Features
    "bento.tag": "অদ্বিতীয় আর্কিটেকচার",
    "bento.title": "আভিজাত্যময় আতিথেয়তা ও উচ্চ-মুনাফাযুক্ত রিয়েল এস্টেটের জন্য নিখুঁত",
    "bento.subtitle":
      "হোটেল বুকিং ওয়ার্কফ্লো ও আবাসিক ভাড়ার হিসাবের মধ্যে সহজে সুইচ করুন। সবকিছু একটিমাত্র সার্বভৌম অপারেটিং সিস্টেমে সমন্বিত।",
    "bento.hotelTab": "হোটেল ও রিসোর্ট এডিশন",
    "bento.resTab": "বিল্ডিং ও রেসিডেন্সিয়াল এডিশন",
    "bento.card1Title": "স্বতন্ত্র ০% ডিরেক্ট বুকিং ইঞ্জিন",
    "bento.card1Desc":
      "Agoda বা Booking.com-এর ১৮-২৫% মধ্যস্বত্বভোগী কমিশন বন্ধ করুন। অতিথিরা আপনার নিজস্ব ব্র্যান্ডেড ওয়েবসাইটে সরাসরি বুকিং করবেন।",
    "bento.card1Badge": "০% ওটিএ কমিশন",
    "bento.card2Title": "বুটিক ওয়েবসাইট বিল্ডার",
    "bento.card2Desc":
      "আপনার এস্টেটের জন্য মিনিটের মধ্যে রাজকীয় ডিজাইনের ওয়েবসাইট তৈরি করুন। রয়্যাল শ্যাম্পেন, এমারেল্ড কোস্ট অথবা অবসিডিয়ান নোয়ার থিম বেছে নিন।",
    "bento.openLightbox": "লাইটবক্স প্রিভিউ দেখুন",
    "bento.card3Title": "ম্যানেজার মোবাইল কনসিয়ার্জ",
    "bento.card3Desc":
      "ফ্রন্ট-ডেস্ক টিমের জন্য নেটিভ আইওএস এবং অ্যান্ড্রয়েড অ্যাপ। গেস্ট আগমন এবং কিউআর ভেরিফিকেশনের তাৎক্ষণিক পুশ নোটিফিকেশন পান।",
    "bento.card4Title": "হাউসকিপিং টার্নওভার ম্যাট্রিক্স",
    "bento.card4Desc":
      "রিয়েল-টাইমে রুম স্ট্যাটাস সুইচ করুন (খালি, পরিষ্কার হচ্ছে, রক্ষণাবেক্ষণ) সাথে ছবি ও পরিচ্ছন্নতা অডিট লগ যুক্ত করুন।",
    "bento.card5Title": "কাস্টম এজ সাবডোমেন",
    "bento.card5Desc":
      "স্বয়ংক্রিয় [slug].omniheaven.com সাবডোমেন অথবা নিজস্ব কাস্টম ডোমেনের সাথে ওয়াইল্ডকার্ড এসএসএল সার্টিফিকেট।",
    "bento.resCard1Title": "স্বয়ংক্রিয় মাসিক লেজার ও ইউটিলিটি ইনভয়েসিং",
    "bento.resCard1Desc":
      "প্রতি মাসের ১লা তারিখে বিস্তারিত মাসিক ভাড়ার রসিদ (ভাড়া, পানি, গ্যাস, সার্ভিস চার্জ, বিদ্যুৎ) স্বয়ংক্রিয়ভাবে তৈরি করুন।",
    "bento.resCard1Badge": "১লা তারিখে স্বয়ংক্রিয় প্রেরণ",
    "bento.resCard2Title": "নিবেদিত রেসিডেন্ট পোর্টাল",
    "bento.resCard2Desc":
      "নিরাপদ ফ্ল্যাট অ্যাক্সেস কোড ব্যবহার করে ভাড়াটিয়ারা স্টেটমেন্ট ও এনবিআর কর সনদ ডাউনলোড করতে পারেন।",
    "bento.resCard3Title": "মেইনটেন্যান্স ডিসপ্যাচ ডেস্ক",
    "bento.resCard3Desc": "ছবিসহ ফ্ল্যাটের যে কোন মেরামত বা রক্ষণাবেক্ষণের সমস্যা রিপোর্ট ও কারিগর প্রেরণ করুন।",
    "bento.resCard4Title": "বিকাশ টোকেনাইজড মার্চেন্ট",
    "bento.resCard4Desc": "কোন ম্যানুয়াল TrxID মেলানো ছাড়াই স্বয়ংক্রিয়ভাবে ভাড়াটিয়ার ফ্ল্যাটে টাকা জমা হয়।",
    "bento.resCard5Title": "মাল্টি-বিল্ডিং পোর্টফোলিও সদরদপ্তর",
    "bento.resCard5Desc": "একই মাস্টার অ্যাকাউন্ট থেকে গুলশান, ধানমন্ডি বা বনানীর একাধিক ভবন একযোগে পরিচালনা করুন।",

    // ROI Calculator
    "calc.tag": "ইন্টারেক্টিভ আরওআই ও সঞ্চয় ইঞ্জিন",
    "calc.title": "হিসাব করুন কত টাকা আপনি নিজের কাছে ধরে রাখতে পারবেন",
    "calc.subtitle":
      "বিদেশি ওটিএ মধ্যস্বত্বভোগী ফি এবং মাসিক ইউটিলিটি অপচয় বন্ধ করুন। নিচে আপনার এস্টেটের তথ্য যাচাই করুন।",
    "calc.hotelMode": "হোটেল ও লাক্সারি রিসোর্ট",
    "calc.resMode": "রেসিডেন্সিয়াল টাওয়ার ও ফ্ল্যাট",
    "calc.unitsHotel": "মোট রুম ও সুইট সংখ্যা",
    "calc.unitsRes": "মোট ফ্ল্যাট ও বাণিজ্যিক ইউনিট",
    "calc.rateHotel": "গড় দৈনিক রুম ভাড়া (ADR)",
    "calc.rateRes": "প্রতি ফ্ল্যাটের মাসিক গড় ভাড়া",
    "calc.occupancyLabel": "আনুমানিক গড় অকুপেন্সি হার",
    "calc.freeTier": "প্রথম ১৮০ দিন সম্পূর্ণ ফ্রি",
    "calc.annualSavedHotel": "আনুমানিক বার্ষিক ওটিএ কমিশন সঞ্চয়",
    "calc.annualSavedRes": "বার্ষিক পরিচালিত ক্যাশ ফ্লো",
    "calc.postTrialTier": "ট্রায়াল পরবর্তী স্বচ্ছ মাসিক ফি",
    "calc.monthFlat": "/ মাসিক নির্দিষ্ট",
    "calc.claimPass": "১৮০ দিনের ফ্রি পাস গ্রহণ করুন",
    "calc.infoHotel":
      "Booking.com ও Agoda-র ২০% গড় কমিশনের তুলনায় omniHeaven-এর ০% ডিরেক্ট বুকিং ইঞ্জিনের সংরক্ষিত হিসাব।",
    "calc.infoRes": "ইউটিলিটি আদায়ের ঘাটতি, চেক বাউন্স এবং পেপার অ্যাকাউন্টিংয়ের ঝামেলা দূর করে।",

    // Sovereignty Grid
    "infra.tag": "কোন ক্লাউড ভেন্ডর লক-ইন নেই",
    "infra.title": "সার্বভৌম এন্টারপ্রাইজ ক্লাউড",
    "infra.subtitle":
      "অভিজাত অতিথি এবং প্রিমিয়াম এস্টেটের জন্য প্রয়োজন পূর্ণ ডিজিটাল সার্বভৌমত্ব। omniHeaven আপনার ডাটাবেস ও নথিপত্র আপনার সরাসরি নিয়ন্ত্রণে সুরক্ষিত রাখে।",
    "infra.c1Tag": "মূল ডাটা সার্বভৌমত্ব",
    "infra.c1Title": "সেলফ-হোস্টেড পোস্টগ্রেসকিউএল",
    "infra.c1Desc":
      "ডেডিকেটেড স্কিমা এবং টেন্যান্ট এনক্রিপশন কী। আপনার আবাসিক এবং অতিথি প্রোফাইল সম্পূর্ণ আলাদা ও সুরক্ষিত থাকে।",
    "infra.c1Meta": "পয়েন্ট-ইন-টাইম রিকভারি সক্রিয়",
    "infra.c2Tag": "অ্যাসেট সার্বভৌমত্ব",
    "infra.c2Title": "SeaweedFS S3 স্টোরেজ",
    "infra.c2Desc":
      "উচ্চ রেজোলিউশন ভিলা গ্যালারি ও আইনি চুক্তির জন্য উচ্চগতির ডিস্ট্রিবিউটেড স্টোরেজ, কোন ক্লাউড ইগ্রেস চার্জ নেই।",
    "infra.c2Meta": "S3 এপিআই ও লোকাল NVMe ডিস্ক",
    "infra.c3Tag": "এজ ডিএনএস ও রাউটিং",
    "infra.c3Title": "ক্লাউডফ্লেয়ার ওয়াইল্ডকার্ড রাউটিং",
    "infra.c3Desc":
      "কাস্টম সাবডোমেন বা এস্টেট ডোমেনের জন্য সাব-সেকেন্ড এসএসএল রেজোলিউশন এবং এন্টারপ্রাইজ DDoS সুরক্ষা।",
    "infra.c3Meta": "৫০ মিলি-সেকেন্ডের কম গ্লোবাল লেটেন্সি",
    "infra.c4Tag": "আর্থিক লেনদেন নিষ্পত্তি",
    "infra.c4Title": "মাল্টি-গেটওয়ে সেটেলমেন্ট",
    "infra.c4Desc":
      "বিকাশ মার্চেন্ট, নগদ, পে-স্টেশন এবং আন্তর্জাতিক স্ট্রাইপ পেমেন্টের সাথে স্বয়ংক্রিয় TrxID ম্যাপিং।",
    "infra.c4Meta": "স্বয়ংক্রিয় TrxID রিকনসিলিয়েশন",

    // Trial Roadmap
    "roadmap.tag": "ঝুঁকিহীন সার্বভৌম নিশ্চয়তা",
    "roadmap.title": "কেন আমরা প্রথম ৬ মাস ১০০% ফ্রি দিচ্ছি",
    "roadmap.subtitle":
      "আমরা বুঝি নতুন সফটওয়্যারে স্থানান্তরিত হতে প্রপার্টি মালিকরা দ্বিধাবোধ করেন। আমরা নিশ্চিত omniHeaven আপনার কার্যক্রম সহজ এবং আয় বৃদ্ধি করবে, তাই ১৮০ দিন কোন ফি দিতে হবে না।",
    "roadmap.s1Phase": "প্রভিশনিং",
    "roadmap.s1Title": "৩ মিনিটের সহজ সেটআপ",
    "roadmap.s1Desc":
      "প্রপার্টির নাম দিন, কাস্টম সাবডোমেন বেছে নিন এবং তাৎক্ষণিকভাবে প্রশাসনিক ড্যাশবোর্ড চালু করুন। কোন ক্রেডিট কার্ড লাগে না।",
    "roadmap.s1Highlight": "কোন অগ্রিম খরচ নেই",
    "roadmap.s2Phase": "অপারেশন",
    "roadmap.s2Title": "১৮০ দিন পূর্ণ প্রো অ্যাক্সেস",
    "roadmap.s2Desc":
      "সব মডিউল সক্রিয়: ওয়েবসাইট বিল্ডার, রেন্টার পোর্টাল, ডিরেক্ট বুকিং ও স্বয়ংক্রিয় বিকাশ রিকনসিলিয়েশন।",
    "roadmap.s2Highlight": "আনলিমিটেড ট্রানজ্যাকশন",
    "roadmap.s3Phase": "মূল্যায়ন",
    "roadmap.s3Title": "কোন বাধ্যবাধকতা নেই",
    "roadmap.s3Desc":
      "৬ মাস পর মাসিক স্বচ্ছ সাবস্ক্রিপশনে চালিয়ে যান অথবা যে কোন সময় আপনার সম্পূর্ণ এসকিউএল ডাটাবেস এক্সপোর্ট করুন।",
    "roadmap.s3Highlight": "সম্পূর্ণ ডাটা পোর্টেবিলিটি",

    // FAQ
    "faq.tag": "নির্বাহী পরামর্শ ও প্রশ্নোত্তর",
    "faq.title": "সাধারণ জিজ্ঞাসা ও উত্তর",
    "faq.subtitle": "হোটেলিয়ার, প্রপার্টি ডেভেলপার এবং এস্টেট মালিকদের যা জানা দরকার।",
    "faq.q1": "০% কমিশন ডিরেক্ট বুকিং ইঞ্জিন কীভাবে কাজ করে?",
    "faq.a1":
      "omniHeaven আপনার হোটেলের জন্য নিজস্ব সাবডোমেনে একটি স্বতন্ত্র বুকিং ইঞ্জিন প্রদান করে। বুকিংয়ের অর্থ সরাসরি আপনার মার্চেন্ট অ্যাকাউন্টে (বিকাশ, পে-স্টেশন) জমা হয়। আমরা কোন কমিশন নেই না।",
    "faq.q2": "আমরা কি omniHeaven-এর পাশাপাশি Booking.com ও Agoda ব্যবহার করতে পারব?",
    "faq.a2":
      "হ্যাঁ, omniHeaven আপনার কেন্দ্রীয় পিএমএস হিসেবে কাজ করবে এবং পাশাপাশি ওটিএ চ্যানেলগুলোর সাথে সমন্বয় বজায় রাখবে।",
    "faq.q3": "আবাসিক ভবনে বিকাশ স্বয়ংক্রিয় রিকনসিলিয়েশন কীভাবে হয়?",
    "faq.a3":
      "১লা তারিখে স্বয়ংক্রিয়ভাবে ভাড়ার লিংক চলে যায় এবং পেমেন্ট সম্পন্ন হলে তাৎক্ষণিক লেজার আপডেট ও কর চালান ইস্যু হয়ে যায়।",
    "faq.q4": "আমাদের তথ্য কি স্থানীয়ভাবে সুরক্ষিত থাকে?",
    "faq.a4":
      "হ্যাঁ, সেলফ-হোস্টেড পোস্টগ্রেসকিউএল এবং SeaweedFS ডিস্ট্রিবিউটেড স্টোরেজের মাধ্যমে আপনার তথ্য আপনার পূর্ণ নিয়ন্ত্রণে থাকে।",
    "faq.q5": "১৮০ দিনের ফ্রি ট্রায়াল শেষ হলে কী হবে?",
    "faq.a5":
      "১৫০তম দিনে একটি নোটিফিকেশন পাবেন। আপনি চাইলে মাসিক সাবস্ক্রিপশন চালিয়ে যেতে পারেন অথবা এক ক্লিকে সম্পূর্ণ ডাটা ডাউনলোড করে নিতে পারেন।",
    "faq.q6": "নন-টেকনিক্যাল কর্মীরা কি সহজে এটি ব্যবহার করতে পারবেন?",
    "faq.a6":
      "সুইস আতিথেয়তার মান এবং সহজ বাংলা ইন্টারফেসের কারণে যে কেউ ১৫ মিনিটের মধ্যে ড্যাশবোর্ড ব্যবহারে দক্ষ হতে পারেন।",

    // Bottom CTA & Footer
    "cta.badge": "উদ্বোধনী রয়্যাল হেরিটেজ পাস • ১৮০ দিন সম্পূর্ণ ফ্রি",
    "cta.title": "আপনার এস্টেটকে ৫-স্টার ডিজিটাল নিখুঁততায় রূপান্তর করতে প্রস্তুত?",
    "cta.subtitle":
      "বাংলাদেশের শীর্ষ হোটেলিয়ার, রিসোর্ট ও রেসিডেন্সিয়াল এস্টেট মালিকদের সাথে যোগ দিন। মাত্র ৩ মিনিটে আপনার প্রশাসনিক ওয়ার্কস্পেস চালু করুন।",
    "cta.inputPlaceholder": "হোটেল বা প্রপার্টির নাম লিখুন...",
    "cta.submit": "৬ মাস ফ্রি উপভোগ করুন",
    "cta.trustNoCard": "কোন ক্রেডিট কার্ড প্রয়োজন নেই",
    "cta.trustNoFees": "কোন লেনদেন কমিশন নেই",
    "cta.trustPortability": "সম্পূর্ণ ডাটা পোর্টেবিলিটি",
    "footer.desc":
      "৫-স্টার হোটেল, বুটিক রিসোর্ট এবং প্রিমিয়াম আবাসিক ভবনের সমন্বিত অপারেটিং সিস্টেম। সুইস নিখুঁততা ও আন্তর্জাতিক আতিথেয়তা মান।",
    "footer.cloudStatus": "সার্বভৌম ক্লাউড কোর: সব সিস্টেম সক্রিয়",
    "footer.colWorkspaces": "মনোরিপো পোর্টালসমূহ",
    "footer.colModules": "বিশেষায়িত মডিউল",
    "footer.colTrust": "নিরাপত্তা ও ট্রাস্ট",
    "footer.rights": "omniHeaven OS. সর্বস্বত্ব সংরক্ষিত। সার্বভৌম রিয়েল এস্টেট অপারেটিং সিস্টেম।",

    // Concierge & Coach Marks & Affix
    "concierge.title": "কনসিয়ার্জ ডেস্ক",
    "concierge.status": "লাইভ • ২৪/৭ অগ্রাধিকার সহায়তা",
    "concierge.jumpTitle": "মনোরিপো পোর্টালসমূহ",
    "concierge.inquiryTitle": "নির্বাহী পরামর্শ ও অনুরোধ",
    "concierge.inquiryDesc": "আর্কিটেক্ট ওয়াকথ্রু অথবা কাস্টম এন্টারপ্রাইজ মাইগ্রেশনের জন্য যোগাযোগ করুন।",
    "concierge.namePlaceholder": "আপনার নাম / পদবি",
    "concierge.phonePlaceholder": "মোবাইল / হোয়াটসঅ্যাপ নম্বর",
    "concierge.sendInquiry": "অনুরোধ পাঠান",
    "concierge.sending": "পাঠানো হচ্ছে...",
    "affix.tour": "ইন্টারেক্টিভ ট্যুর শুরু করুন",
    "affix.concierge": "কনসিয়ার্জ ডেস্ক",
    "coach.step1Title": "লাইভ সুইট ও ভিলা ম্যাট্রিক্স",
    "coach.step1Desc":
      "এটি আপনার রিয়েল-টাইম ফ্রন্ট ডেস্ক স্যান্ডবক্স। যে কোন রুম রো ক্লিক করে স্ট্যাটাস পরিবর্তন করুন।",
    "coach.step1Pill": "ধাপ ১ / ৪ • ফ্রন্ট ডেস্ক ককপিট",
    "coach.step2Title": "ডিরেক্ট রেভপার টেলিমেট্রি",
    "coach.step2Desc": "দৈনিক রেভপার মেট্রিক্স ট্র্যাক করুন এবং ক্রিপ্টোগ্রাফিক ভাউচার ডাউনলোড সিমুলেট করুন।",
    "coach.step2Pill": "ধাপ ২ / ৪ • রেভিনিউ টেলিমেট্রি",
    "coach.step3Title": "দ্বৈত শিল্প আর্কিটেকচার ও থিম প্যালেট",
    "coach.step3Desc":
      "হোটেল ও রেসিডেন্সিয়াল এডিশনের মাঝে স্যুইচ করুন এবং রয়্যাল শ্যাম্পেন, এমারেল্ড বা অবসিডিয়ান থিম পরীক্ষা করুন।",
    "coach.step3Pill": "ধাপ ৩ / ৪ • ইন্টারেক্টিভ বেন্তো গ্রিড",
    "coach.step4Title": "ইন্টারেক্টিভ ওটিএ কমিশন ক্যালকুলেটর",
    "coach.step4Desc": "রুম সংখ্যা ও এডিআর স্লাইডার পরিবর্তন করে ওটিএ কমিশন বাদে মোট সঞ্চিত অর্থ হিসাব করুন।",
    "coach.step4Pill": "ধাপ ৪ / ৪ • আরওআই ইঞ্জিন",
    "coach.next": "পরবর্তী ধাপ",
    "coach.prev": "পূর্ববর্তী",
    "coach.finish": "ট্যুর সমাপ্ত",
  },
};
