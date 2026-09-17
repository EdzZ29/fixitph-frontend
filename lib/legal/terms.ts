import { LEGAL_PLACEHOLDERS as P, type LegalDocument } from './types';

/**
 * DEVELOPMENT DRAFT.
 *
 * This wording has not been reviewed by a Philippine lawyer. It exists so the
 * product can be built and tested against a realistic document, and it must be
 * reviewed and replaced before launch. Nothing here is legal advice.
 */
export const termsDocument: LegalDocument = {
  title: 'Terms and Conditions',
  summary:
    'FixItPH is a marketplace that connects customers with independent local service providers. These terms explain what the platform does, what it does not do, and what is expected of everyone using it.',
  lastUpdated: '17 September 2026',
  effectiveDate: '17 September 2026',
  sections: [
    {
      id: 'introduction',
      title: 'Introduction',
      blocks: [
        {
          type: 'paragraph',
          text: `These Terms and Conditions govern your use of FixItPH, operated by ${P.businessName} at ${P.website} (the "Platform"). By creating an account, browsing listings, posting a service request, sending a quotation, or booking a service, you agree to these terms.`,
        },
        {
          type: 'paragraph',
          text: 'If you do not agree with any part of these terms, please do not use the Platform. Where a section refers to "we", "us", or "FixItPH", it refers to the operator of the Platform. "You" refers to anyone using it, whether as a customer or as a service provider.',
        },
        {
          type: 'note',
          text: 'This is a development draft. It has not been reviewed by a Philippine lawyer and should not be treated as final or as legal advice.',
        },
      ],
    },
    {
      id: 'purpose',
      title: 'Purpose of the Platform',
      blocks: [
        {
          type: 'paragraph',
          text: 'FixItPH is a marketplace. Its purpose is to help customers in Northern Mindanao, Caraga, and other areas we serve find independent local service providers such as plumbers, electricians, aircon technicians, computer repair technicians, mechanics, and cleaners.',
        },
        {
          type: 'paragraph',
          text: 'FixItPH is not the provider of the services booked through it. We do not employ service providers, we do not supervise or control how work is carried out, and we do not warrant the outcome of any job. Providers are independent contractors who set their own rates, choose their own service areas, and are responsible for their own work.',
        },
        {
          type: 'list',
          items: [
            'We provide the listings, search, messaging, quotation, and booking tools.',
            'Providers perform the actual services and are solely responsible for them.',
            'The agreement to perform a specific job is between the customer and the provider.',
          ],
        },
      ],
    },
    {
      id: 'eligibility',
      title: 'Eligibility',
      blocks: [
        {
          type: 'paragraph',
          text: 'You must be at least 18 years old and legally capable of entering into a binding contract under Philippine law to use the Platform. By using FixItPH you represent that you meet these requirements.',
        },
        {
          type: 'paragraph',
          text: 'If you register on behalf of a business, you represent that you are authorised to bind that business to these terms. We may refuse, suspend, or remove any account at our discretion where eligibility cannot be established.',
        },
      ],
    },
    {
      id: 'account-registration',
      title: 'Account Registration',
      blocks: [
        {
          type: 'paragraph',
          text: 'You need an account to post a service request, send a quotation, book a service, or leave a review. You agree to provide accurate and current information and to keep it up to date.',
        },
        {
          type: 'list',
          items: [
            'You are responsible for everything that happens under your account.',
            'Keep your password confidential and do not share it. We will never ask you for it.',
            'Tell us immediately at ' + P.supportEmail + ' if you believe your account has been accessed without your permission.',
            'One person or business may not maintain multiple accounts to evade suspension, manipulate ratings, or misrepresent identity.',
          ],
        },
      ],
    },
    {
      id: 'customer-responsibilities',
      title: 'Customer Responsibilities',
      blocks: [
        {
          type: 'paragraph',
          text: 'As a customer, you are responsible for describing the work accurately and for dealing fairly with providers.',
        },
        {
          type: 'list',
          items: [
            'Describe the job honestly, including anything that affects difficulty, access, or safety.',
            'Provide a correct service address and be reachable at the agreed time.',
            'Ensure the provider can safely access the property and any equipment involved.',
            'Pay the agreed amount promptly once the work is completed to the agreed scope.',
            'Raise concerns about workmanship with the provider first, and through the Platform if it cannot be resolved.',
            'Do not ask a provider to perform work that is unsafe, unlicensed where a licence is required, or unlawful.',
          ],
        },
      ],
    },
    {
      id: 'provider-responsibilities',
      title: 'Service Provider Responsibilities',
      blocks: [
        {
          type: 'paragraph',
          text: 'As a service provider, you operate as an independent contractor and are solely responsible for the services you deliver.',
        },
        {
          type: 'list',
          items: [
            'Hold and maintain every licence, permit, certification, and registration your trade requires under Philippine law and local ordinances.',
            'Carry out work competently, safely, and in line with applicable standards.',
            'Quote honestly, and raise a revised quotation for approval before performing work beyond the agreed scope.',
            'Arrive at the agreed time or give the customer reasonable notice if you cannot.',
            'Handle customer property and personal information with care.',
            'Pay your own taxes, contributions, and any business registration obligations that apply to you.',
            'Do not subcontract a booking to someone else without telling the customer.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Nothing in these terms creates an employment, partnership, agency, or joint venture relationship between FixItPH and any provider.',
        },
      ],
    },
    {
      id: 'provider-verification',
      title: 'Provider Verification',
      blocks: [
        {
          type: 'paragraph',
          text: 'Before a provider can publish listings or send quotations, we check identity and the documents their trade requires. This may include a government-issued ID, a business permit, a barangay clearance, a TESDA certificate, or a PRC licence.',
        },
        {
          type: 'paragraph',
          text: 'Verification means we have reviewed the documents submitted to us at a point in time. It is not a guarantee of skill, honesty, insurance, or the quality of any particular job, and it is not an endorsement or a recommendation by FixItPH.',
        },
        {
          type: 'list',
          items: [
            'Providers must keep their documents current and resubmit when one expires.',
            'Submitting forged, altered, or borrowed documents leads to immediate removal.',
            'We may re-verify at any time and may suspend listings while a check is in progress.',
          ],
        },
      ],
    },
    {
      id: 'service-listings',
      title: 'Service Listings',
      blocks: [
        {
          type: 'paragraph',
          text: 'Providers are responsible for the accuracy of their listings, including the description of work, the starting rate, the unit that rate applies to, and the areas they cover.',
        },
        {
          type: 'list',
          items: [
            'A listing must state a starting price unless it is explicitly marked as quote-only.',
            'Listings must not be misleading about scope, price, credentials, or experience.',
            'We may edit, hide, or remove a listing that is inaccurate, unlawful, or unsafe.',
          ],
        },
      ],
    },
    {
      id: 'service-requests',
      title: 'Service Requests',
      blocks: [
        {
          type: 'paragraph',
          text: 'A customer may send a request to a specific provider or post it so that providers covering the area can respond. A request describes the job and the general location.',
        },
        {
          type: 'paragraph',
          text: 'A request is an invitation to quote. It does not create a booking and does not oblige any provider to respond or any customer to accept a response. Requests may expire if they are not acted on.',
        },
      ],
    },
    {
      id: 'quotations',
      title: 'Quotations',
      blocks: [
        {
          type: 'paragraph',
          text: 'A quotation is a provider’s priced offer to perform the work described in a request. It states an amount, what that amount covers, and how long the offer stands.',
        },
        {
          type: 'list',
          items: [
            'A provider may hold only one live quotation per request at a time, and may withdraw it before it is accepted.',
            'Only the customer who posted the request may accept or reject a quotation.',
            'Accepting a quotation creates a booking and automatically declines the other quotations on that request.',
            'If the job turns out to be different from what was described, the provider must send a revised quotation for approval before continuing.',
          ],
        },
      ],
    },
    {
      id: 'bookings',
      title: 'Bookings',
      blocks: [
        {
          type: 'paragraph',
          text: 'A booking records the agreed work, the agreed price, the scheduled time, and the parties. The contract for the work itself is between the customer and the provider. FixItPH is not a party to it.',
        },
        {
          type: 'paragraph',
          text: 'A booking starts as pending until the provider confirms it. Confirmation is the point at which the customer’s exact address and contact number are released to the provider. Before that, the provider sees only the general area.',
        },
        {
          type: 'paragraph',
          text: 'Every change to a booking’s status is recorded and kept, so both sides have the same account of what happened and when.',
        },
      ],
    },
    {
      id: 'cancellation',
      title: 'Cancellation and Rescheduling',
      blocks: [
        {
          type: 'paragraph',
          text: 'Either party may cancel a booking before the work begins. A reason is required, and it is shown to the other party.',
        },
        {
          type: 'list',
          items: [
            'Cancel as early as you reasonably can. Late cancellations waste the other party’s day.',
            'Rescheduling is available while a booking is pending or confirmed and should be agreed by both parties.',
            'Repeated late cancellations or no-shows may lead to suspension.',
            'Where a deposit has been paid, any refund follows the cancellation terms shown at the time of booking.',
          ],
        },
      ],
    },
    {
      id: 'payments',
      title: 'Payments',
      blocks: [
        {
          type: 'paragraph',
          text: 'Unless stated otherwise on the Platform, the customer pays the provider directly for the work. Accepted methods commonly include cash, GCash, Maya, and bank transfer, as agreed between the parties.',
        },
        {
          type: 'list',
          items: [
            'The amount payable is the accepted quotation, plus any revision the customer approved.',
            'Providers must not demand payment materially above the agreed amount without an approved revision.',
            'Customers must not withhold agreed payment for work that was completed as agreed.',
            'Taking a transaction off the Platform to avoid fees, verification, or the booking record is a breach of these terms.',
          ],
        },
      ],
    },
    {
      id: 'platform-fees',
      title: 'Platform Fees',
      blocks: [
        {
          type: 'paragraph',
          text: 'Using FixItPH is free for customers. Searching, requesting quotations, and booking carry no charge.',
        },
        {
          type: 'paragraph',
          text: 'Providers may be charged a fee on completed bookings. Any fee, and any change to it, will be stated clearly in the provider dashboard and communicated in advance. Fees are not charged retroactively on bookings already completed.',
        },
      ],
    },
    {
      id: 'provider-subscriptions',
      title: 'Provider Subscriptions',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may offer optional paid subscriptions giving providers additional features such as greater visibility, richer profiles, or analytics.',
        },
        {
          type: 'list',
          items: [
            'Subscription price, billing period, and inclusions are shown before purchase.',
            'Subscriptions renew automatically unless cancelled before the renewal date.',
            'Cancelling stops future renewals; it does not refund the current period unless stated otherwise.',
            'A subscription never changes verification requirements and never guarantees bookings.',
          ],
        },
      ],
    },
    {
      id: 'reviews',
      title: 'Reviews and Ratings',
      blocks: [
        {
          type: 'paragraph',
          text: 'Reviews exist so the next customer can make an informed choice. They must reflect genuine, first-hand experience.',
        },
        {
          type: 'list',
          items: [
            'Only the customer on a completed booking may review it, and only once.',
            'Ratings run from 1 to 5.',
            'Editing a review keeps the earlier version in its history; the original is not erased.',
            'The provider may publish one response to a review, and may not alter the rating or the customer’s words.',
            'Buying, selling, exchanging, or pressuring anyone for reviews is prohibited.',
            'We may hide a review that breaches these terms, and we record when we do.',
          ],
        },
      ],
    },
    {
      id: 'user-content',
      title: 'User-Generated Content',
      blocks: [
        {
          type: 'paragraph',
          text: 'You keep ownership of the text, photographs, and other content you upload. By posting it you grant FixItPH a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, and display it for the purpose of operating and promoting the Platform.',
        },
        {
          type: 'paragraph',
          text: 'You confirm that you have the right to post what you upload and that it does not infringe anyone else’s rights. Do not upload photographs of a customer’s home or property without their permission.',
        },
      ],
    },
    {
      id: 'prohibited',
      title: 'Prohibited Activities',
      blocks: [
        { type: 'paragraph', text: 'You must not use FixItPH to:' },
        {
          type: 'list',
          items: [
            'Break any Philippine law or local ordinance.',
            'Impersonate another person or misrepresent your identity, credentials, or affiliation.',
            'Post false, misleading, or deceptive listings, quotations, or reviews.',
            'Harass, threaten, abuse, or discriminate against anyone.',
            'Collect other users’ personal information for any purpose outside a booking.',
            'Circumvent verification, fees, safety measures, or a suspension.',
            'Interfere with the Platform, probe it for vulnerabilities without written permission, or use bots to scrape it.',
            'Upload malware or anything designed to damage or disrupt systems.',
            'Advertise unrelated goods or services, or send unsolicited marketing through our messaging.',
          ],
        },
      ],
    },
    {
      id: 'messaging',
      title: 'Messaging and Communications',
      blocks: [
        {
          type: 'paragraph',
          text: 'Messaging exists so customers and providers can settle the details of a job. Keep it relevant to the request or booking it belongs to.',
        },
        {
          type: 'paragraph',
          text: 'Messages are stored and may be reviewed where there is a report, a dispute, a safety concern, or a legal obligation. Do not send payment credentials, government ID numbers, or passwords through messaging.',
        },
        {
          type: 'paragraph',
          text: 'By creating an account you agree to receive service-related messages such as booking confirmations, quotation alerts, security notices, and password reset codes. These are operational and cannot be switched off while your account is active. Marketing messages are separate and optional.',
        },
      ],
    },
    {
      id: 'safety',
      title: 'Safety',
      blocks: [
        {
          type: 'paragraph',
          text: 'Service work happens in people’s homes and businesses, so both sides carry responsibility for keeping it safe.',
        },
        {
          type: 'list',
          items: [
            'Confirm who you are dealing with before letting anyone into your home.',
            'Providers should carry identification and be able to show the credentials on their profile.',
            'Electrical, gas, structural, and similar work must only be done by someone qualified to do it.',
            'Report unsafe conduct through the Platform, and contact local authorities in an emergency.',
          ],
        },
        {
          type: 'paragraph',
          text: 'FixItPH does not supervise work and cannot guarantee anyone’s safety. Use your own judgement.',
        },
      ],
    },
    {
      id: 'disputes',
      title: 'Disputes Between Customers and Providers',
      blocks: [
        {
          type: 'paragraph',
          text: 'Disagreements about workmanship, scope, timing, or price are between the customer and the provider. Try to resolve them directly first.',
        },
        {
          type: 'paragraph',
          text: 'If that fails, either party may raise a dispute on the booking. We may review the booking record, the quotation, the messages, and any evidence provided, and may record an outcome, adjust ratings visibility, or suspend an account.',
        },
        {
          type: 'paragraph',
          text: 'Our role is limited to administering the Platform. We are not an arbitrator, our decisions do not determine legal liability between the parties, and neither party gives up any legal remedy by using this process.',
        },
      ],
    },
    {
      id: 'third-party',
      title: 'Third-Party Services',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Platform relies on third parties for hosting, maps, messaging, email delivery, analytics, and payment processing where applicable. Their own terms and privacy notices apply to their services.',
        },
        {
          type: 'paragraph',
          text: 'Links to third-party sites are provided for convenience. We do not control them and are not responsible for their content or practices.',
        },
      ],
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      blocks: [
        {
          type: 'paragraph',
          text: 'The FixItPH name, logo, interface, design, and software are owned by us or our licensors and are protected by intellectual property law.',
        },
        {
          type: 'paragraph',
          text: 'You may not copy, modify, distribute, sell, or create derivative works from any part of the Platform without our written permission. Nothing in these terms transfers ownership of our intellectual property to you.',
        },
      ],
    },
    {
      id: 'availability',
      title: 'Platform Availability',
      blocks: [
        {
          type: 'paragraph',
          text: 'We aim to keep FixItPH available and working, but we do not promise uninterrupted access. Maintenance, upgrades, outages, connectivity problems, and events outside our control can all interrupt service.',
        },
        {
          type: 'paragraph',
          text: 'We may change, suspend, or discontinue any feature. Where a change materially affects you, we will give reasonable notice when we can.',
        },
      ],
    },
    {
      id: 'no-guarantee',
      title: 'No Guarantee of Service Quality',
      blocks: [
        {
          type: 'paragraph',
          text: 'FixItPH does not perform the services booked through it and does not guarantee the quality, safety, legality, timeliness, or suitability of any provider or any work.',
        },
        {
          type: 'paragraph',
          text: 'Verification badges, ratings, reviews, and completed job counts are information to help you decide. They are not warranties, endorsements, or guarantees. Satisfy yourself that a provider is right for your job before you book.',
        },
      ],
    },
    {
      id: 'limitation-of-liability',
      title: 'Limitation of Liability',
      blocks: [
        {
          type: 'paragraph',
          text: 'To the fullest extent permitted by Philippine law, FixItPH is not liable for indirect, incidental, special, consequential, or exemplary loss, including lost profits, lost data, or loss of goodwill, arising from your use of the Platform.',
        },
        {
          type: 'paragraph',
          text: 'We are not liable for the acts or omissions of any customer or provider, for damage or injury arising from work booked through the Platform, or for disputes between users.',
        },
        {
          type: 'paragraph',
          text: 'Where liability cannot lawfully be excluded, our total aggregate liability is limited to the greater of the fees you paid us in the twelve months before the claim, or one thousand Philippine pesos.',
        },
        {
          type: 'note',
          text: 'Nothing in this section limits liability that cannot be limited under Philippine law, including liability for fraud or for death or personal injury caused by negligence.',
        },
      ],
    },
    {
      id: 'indemnification',
      title: 'Indemnification',
      blocks: [
        {
          type: 'paragraph',
          text: 'You agree to indemnify and hold harmless FixItPH, its operators, officers, employees, and agents from any claim, loss, liability, or expense, including reasonable legal fees, arising from your use of the Platform, your breach of these terms, your violation of any law, or your infringement of anyone else’s rights.',
        },
        {
          type: 'paragraph',
          text: 'For providers, this includes claims arising from the services you perform and from any credential or licensing requirement you failed to meet.',
        },
      ],
    },
    {
      id: 'suspension',
      title: 'Account Suspension and Termination',
      blocks: [
        {
          type: 'paragraph',
          text: 'You may close your account at any time. Some records are retained afterwards where we are required or permitted to keep them; the Privacy Policy explains what and for how long.',
        },
        {
          type: 'paragraph',
          text: 'We may suspend or terminate an account where we reasonably believe these terms have been breached, where documents are fraudulent, where there is a safety risk, where there is repeated no-show or abusive conduct, or where the law requires it.',
        },
        {
          type: 'paragraph',
          text: 'Every suspension is recorded with a reason. Where practical we tell you why and how to respond. Suspension does not relieve either party of obligations already owed on an existing booking.',
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to the Terms',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may update these terms as the Platform changes or as the law requires. The "Last updated" date at the top always reflects the current version.',
        },
        {
          type: 'paragraph',
          text: 'For material changes we will give notice through the Platform or by email before they take effect. Continuing to use FixItPH after that means you accept the updated terms.',
        },
      ],
    },
    {
      id: 'privacy',
      title: 'Privacy',
      blocks: [
        {
          type: 'paragraph',
          text: 'How we collect, use, share, and protect personal information is set out in our Privacy Policy, which forms part of these terms. It explains our obligations under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) and the rights you have as a data subject.',
        },
      ],
    },
    {
      id: 'governing-law',
      title: 'Governing Law',
      blocks: [
        {
          type: 'paragraph',
          text: 'These terms are governed by the laws of the Republic of the Philippines, without regard to conflict of law principles.',
        },
        {
          type: 'paragraph',
          text: 'Any dispute arising from these terms or from your use of the Platform is subject to the exclusive jurisdiction of the appropriate courts of the Philippines, without prejudice to any barangay conciliation or alternative dispute resolution that applies.',
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'Questions about these terms can be sent to us at:',
        },
        {
          type: 'list',
          items: [
            `Business: ${P.businessName}`,
            `Address: ${P.businessAddress}`,
            `Website: ${P.website}`,
            `General support: ${P.supportEmail}`,
            `Privacy matters: ${P.privacyEmail}`,
          ],
        },
      ],
    },
  ],
};
