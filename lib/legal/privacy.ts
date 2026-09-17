import { LEGAL_PLACEHOLDERS as P, type LegalDocument } from './types';

/**
 * DEVELOPMENT DRAFT.
 *
 * This wording has not been reviewed by a Philippine lawyer or a certified
 * privacy professional. It exists so the product can be built and tested
 * against a realistic document, and it must be reviewed and replaced before
 * launch. Nothing here is legal advice.
 */
export const privacyDocument: LegalDocument = {
  title: 'Privacy Policy',
  summary:
    'How FixItPH collects, uses, shares, and protects personal information, and the rights you have over it under the Philippine Data Privacy Act of 2012.',
  lastUpdated: '17 September 2026',
  effectiveDate: '17 September 2026',
  sections: [
    {
      id: 'introduction',
      title: 'Introduction',
      blocks: [
        {
          type: 'paragraph',
          text: `${P.businessName} operates FixItPH at ${P.website}, a marketplace connecting customers with independent local service providers. This policy explains what personal information we collect, why, who we share it with, and what you can do about it.`,
        },
        {
          type: 'paragraph',
          text: 'We process personal information in accordance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), its Implementing Rules and Regulations, and the issuances of the National Privacy Commission.',
        },
        {
          type: 'note',
          text: 'This is a development draft. It has not been reviewed by a Philippine lawyer or a certified privacy professional and should not be treated as final.',
        },
      ],
    },
    {
      id: 'information-we-collect',
      title: 'Information We Collect',
      blocks: [
        {
          type: 'paragraph',
          text: 'We collect information you give us directly, information generated as you use the Platform, and a small amount of technical information from your device. The sections that follow set out each category.',
        },
        {
          type: 'paragraph',
          text: 'We aim to collect only what a booking marketplace genuinely needs. Where a field is optional, leaving it blank does not stop you using the Platform.',
        },
      ],
    },
    {
      id: 'account-information',
      title: 'Account Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'When you register we collect your email address, your password, your first and last name, and optionally your mobile number, city, and barangay.',
        },
        {
          type: 'paragraph',
          text: 'Your password is never stored as you typed it. We store only an Argon2id hash, which cannot be reversed, and staff cannot read your password at any time.',
        },
        {
          type: 'paragraph',
          text: 'We keep your credentials separate from your profile details in our database, so that screens which only need your display name never load your full record.',
        },
      ],
    },
    {
      id: 'provider-information',
      title: 'Provider Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'If you register as a service provider we additionally collect your business name, headline and description, years of experience, base city and barangay, service radius, the areas you cover, your availability, your payment methods, and any portfolio items you upload.',
        },
        {
          type: 'paragraph',
          text: 'Much of this is published on your public profile, because customers need it to choose a provider. Section 17 sets out exactly which fields are publicly visible.',
        },
      ],
    },
    {
      id: 'location-information',
      title: 'Location Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'We collect the city and barangay you give us, and optionally coordinates, so that requests reach providers who actually cover your area.',
        },
        {
          type: 'paragraph',
          text: 'We do not track your device location in the background. Any coordinates we hold come from what you entered or from a location you explicitly chose to share.',
        },
        {
          type: 'note',
          text: 'Your exact street address is treated as sensitive. Before a booking is confirmed a provider sees only your city and barangay. The full address and your contact number are released only at the point the provider confirms the booking, and only to that provider.',
        },
      ],
    },
    {
      id: 'request-booking-information',
      title: 'Service Requests and Booking Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'When you post a request we collect the job title and description, the category, urgency, preferred date, budget range, the location, and any photographs you attach.',
        },
        {
          type: 'paragraph',
          text: 'When a booking is created we record the quotation accepted, the scheduled time, the agreed amount, the payment method, and the status of the job from confirmation through to completion or cancellation.',
        },
        {
          type: 'paragraph',
          text: 'The history of a booking’s status changes is kept as an append-only record. It cannot be edited or deleted afterwards, so both parties keep the same account of what happened, and so disputes can be assessed fairly.',
        },
      ],
    },
    {
      id: 'messages',
      title: 'Messages and Communications',
      blocks: [
        {
          type: 'paragraph',
          text: 'Messages you send through the Platform are stored and are readable by you and the person you are messaging.',
        },
        {
          type: 'paragraph',
          text: 'Staff do not routinely read messages. We access them only where there is a report, a dispute, a safety concern, a suspected breach of our terms, or a lawful request, and access is logged.',
        },
        {
          type: 'paragraph',
          text: 'We also keep records of operational emails we send you, such as booking confirmations and password reset codes, so we can confirm whether a message was sent.',
        },
      ],
    },
    {
      id: 'reviews',
      title: 'Reviews and Ratings',
      blocks: [
        {
          type: 'paragraph',
          text: 'A review you write is published with your display name and the date, alongside the provider’s profile. Reviews can only be written on a booking you completed.',
        },
        {
          type: 'paragraph',
          text: 'If you edit a review, the earlier version is retained in the review’s history. This keeps the record honest and prevents a rating from being quietly rewritten later. The earlier text is not shown publicly.',
        },
      ],
    },
    {
      id: 'payment-information',
      title: 'Payment Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'Payment for services generally happens directly between customer and provider. We record the payment method chosen and whether the booking was marked paid, but not card numbers or e-wallet credentials.',
        },
        {
          type: 'paragraph',
          text: 'Where an online payment is introduced, it is handled by a regulated payment provider. Card and wallet details go to that provider and are not stored on our servers.',
        },
      ],
    },
    {
      id: 'device-information',
      title: 'Device and Technical Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'Our servers automatically record technical information needed to run and secure the service:',
        },
        {
          type: 'list',
          items: [
            'IP address, used for rate limiting, fraud prevention, and security investigation.',
            'Browser and device type, from the user agent string.',
            'Dates and times of requests, and which pages or endpoints were called.',
            'Sign-in events, including failed attempts, so we can lock an account under attack.',
          ],
        },
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies and Similar Technologies',
      blocks: [
        {
          type: 'paragraph',
          text: 'We use a small number of cookies, and only where they are needed:',
        },
        {
          type: 'list',
          items: [
            'A strictly necessary session cookie holding your refresh token. It is httpOnly, so page scripts cannot read it, and it is what keeps you signed in.',
            'Preference storage in your browser for things like your light or dark theme choice.',
            'Analytics cookies, where used, are described in section 30 and are not required to use the Platform.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Blocking strictly necessary cookies will stop you from staying signed in. Most browsers let you manage cookies in their settings.',
        },
      ],
    },
    {
      id: 'how-we-use',
      title: 'How We Use Personal Information',
      blocks: [
        { type: 'paragraph', text: 'We use personal information to:' },
        {
          type: 'list',
          items: [
            'Create and maintain your account and authenticate you.',
            'Match requests to providers who cover the relevant area and category.',
            'Deliver quotations, bookings, messages, and notifications.',
            'Verify provider identity and credentials.',
            'Publish reviews and maintain provider ratings.',
            'Detect and prevent fraud, abuse, spam, and unauthorised access.',
            'Investigate reports and administer disputes.',
            'Provide support when you contact us.',
            'Understand which features are used, so the Platform can be improved.',
            'Meet legal, regulatory, tax, and law enforcement obligations.',
          ],
        },
        {
          type: 'paragraph',
          text: 'We do not sell personal information, and we do not share it with third parties for their own marketing.',
        },
      ],
    },
    {
      id: 'legal-bases',
      title: 'Legal Bases for Processing',
      blocks: [
        {
          type: 'paragraph',
          text: 'Under the Data Privacy Act we rely on the following bases:',
        },
        {
          type: 'list',
          items: [
            'Contract: processing needed to give you the service you signed up for, such as running a booking.',
            'Consent: where you opt in, for example to marketing or to sharing precise coordinates. Consent can be withdrawn at any time.',
            'Legal obligation: where a law, regulation, or lawful order requires us to process or retain information.',
            'Legitimate interests: security, fraud prevention, and service improvement, weighed against your rights and freedoms.',
          ],
        },
      ],
    },
    {
      id: 'sharing',
      title: 'Sharing of Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'We share personal information only where it is needed:',
        },
        {
          type: 'list',
          items: [
            'Between customer and provider, to the extent a booking requires it.',
            'With technology partners who process data on our instructions, under contract.',
            'With payment providers, where an online payment is made.',
            'With authorities and regulators, where the law requires it.',
            'With professional advisers, under a duty of confidentiality.',
            'With an acquirer, in the event of a merger or sale, subject to this policy continuing to apply.',
          ],
        },
      ],
    },
    {
      id: 'processors',
      title: 'Service Providers and Technology Partners',
      blocks: [
        {
          type: 'paragraph',
          text: 'We use third parties for hosting and databases, email delivery, object storage for uploaded files, map tiles, and error monitoring.',
        },
        {
          type: 'paragraph',
          text: 'Each is engaged under a written agreement requiring them to process personal information only on our instructions, to keep it secure, and to delete or return it when the engagement ends, as the Data Privacy Act requires of personal information controllers and their processors.',
        },
      ],
    },
    {
      id: 'payment-providers',
      title: 'Payment Providers',
      blocks: [
        {
          type: 'paragraph',
          text: 'Where an online payment method is offered, the payment is processed by a regulated provider that collects your payment details directly. We receive only the result of the transaction and a reference, never the full instrument details.',
        },
        {
          type: 'paragraph',
          text: 'Those providers handle your payment information under their own privacy notices, which you should read before paying.',
        },
      ],
    },
    {
      id: 'public-provider-information',
      title: 'Publicly Visible Provider Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'If you register as a provider, the following is visible to anyone, including people who are not signed in:',
        },
        {
          type: 'list',
          items: [
            'Business name, profile URL, headline, and description.',
            'Base city and barangay, and the areas you cover.',
            'Services, starting rates, and availability.',
            'Average rating, number of ratings, and completed job count.',
            'Verification status and the types of document approved, but never the documents themselves.',
            'Portfolio items you chose to publish.',
            'Reviews written about you, and any response you published.',
          ],
        },
        {
          type: 'note',
          text: 'Your email address, mobile number, home address, and verification documents are never published. A customer receives your contact details only through a booking.',
        },
      ],
    },
    {
      id: 'legal-disclosures',
      title: 'Legal and Regulatory Disclosures',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may disclose personal information where we are required to by law, by a court order, or by a lawful request from a government or regulatory body, including the National Privacy Commission.',
        },
        {
          type: 'paragraph',
          text: 'We may also disclose it where necessary to establish, exercise, or defend a legal claim, or to protect the rights, property, or safety of a person. Where we are permitted to tell you about such a request, we will.',
        },
      ],
    },
    {
      id: 'retention',
      title: 'Data Retention',
      blocks: [
        {
          type: 'paragraph',
          text: 'We keep personal information only as long as there is a reason to:',
        },
        {
          type: 'list',
          items: [
            'Account and profile information: while your account is active.',
            'Bookings, quotations, and their status history: retained after completion for dispute resolution, tax, and audit purposes.',
            'Messages: retained for the life of the related request or booking, then for a limited period afterwards.',
            'Verification documents: retained while a provider is active and for a limited period afterwards, then deleted.',
            'Security logs: retained for a limited period for investigation.',
            'Password reset codes: deleted or invalidated within minutes; only their hashes are ever stored.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Certain records are soft-deleted rather than erased, so that the other party to a completed booking keeps an accurate record. Those records are removed from public view and access is restricted.',
        },
      ],
    },
    {
      id: 'security',
      title: 'Data Security',
      blocks: [
        {
          type: 'paragraph',
          text: 'We apply organisational, physical, and technical measures proportionate to the risk, as the Data Privacy Act requires:',
        },
        {
          type: 'list',
          items: [
            'Passwords hashed with Argon2id. Reset codes are hashed, never stored in readable form.',
            'Encryption in transit, and access controls enforced in the database itself so a user can only ever read their own records.',
            'Short-lived access tokens and rotating refresh tokens, with reuse detection that revokes a whole session family.',
            'Account lockout after repeated failed sign-in attempts, and a separate attempt limit on password reset codes.',
            'Rate limiting on authentication, request creation, and messaging.',
            'Uploaded files kept in private storage and served only through short-lived links.',
            'An append-only audit log of administrative actions.',
          ],
        },
        {
          type: 'paragraph',
          text: 'No system is perfectly secure. We cannot guarantee absolute security, and you should use a strong, unique password.',
        },
      ],
    },
    {
      id: 'verification-documents',
      title: 'Provider Verification Documents',
      blocks: [
        {
          type: 'paragraph',
          text: 'Verification documents, such as a government ID, business permit, barangay clearance, TESDA certificate, or PRC licence, are especially sensitive and are handled separately from the rest of your profile.',
        },
        {
          type: 'list',
          items: [
            'They are stored in private storage, never in a public bucket and never on a public URL.',
            'They are accessible only to the provider who uploaded them and to authorised reviewers.',
            'They are never shown to customers. A customer sees only that a document type was approved.',
            'Access is only ever through a link that expires within minutes.',
            'Every approval or rejection is recorded in the audit log with the reviewer’s identity.',
          ],
        },
      ],
    },
    {
      id: 'children',
      title: "Children's Privacy",
      blocks: [
        {
          type: 'paragraph',
          text: 'FixItPH is not intended for anyone under 18 and we do not knowingly collect personal information from children.',
        },
        {
          type: 'paragraph',
          text: `If you believe a child has given us personal information, contact ${P.privacyEmail} and we will delete it promptly.`,
        },
      ],
    },
    {
      id: 'your-rights',
      title: 'User Privacy Rights',
      blocks: [
        {
          type: 'paragraph',
          text: 'As a data subject under the Data Privacy Act you have the right to:',
        },
        {
          type: 'list',
          items: [
            'Be informed about how your personal information is processed.',
            'Access the personal information we hold about you.',
            'Object to processing, including for marketing or automated processing.',
            'Rectify inaccurate or incomplete information.',
            'Erasure or blocking, where the grounds in the Act are met.',
            'Damages, where you suffer because of inaccurate, unlawfully obtained, or unauthorised use of your information.',
            'Data portability, receiving your information in a commonly used, machine-readable form.',
            'Lodge a complaint with the National Privacy Commission.',
          ],
        },
        {
          type: 'paragraph',
          text: `To exercise any of these, write to ${P.privacyEmail}. We respond within the period set by the Act and may ask you to verify your identity first, so that we do not disclose your information to someone else.`,
        },
      ],
    },
    {
      id: 'updating-information',
      title: 'Updating Personal Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'You can update most of your information yourself in your account settings, including your name, contact details, address, and provider profile.',
        },
        {
          type: 'paragraph',
          text: `If something cannot be changed in the interface, contact ${P.privacyEmail} and we will correct it.`,
        },
      ],
    },
    {
      id: 'deletion',
      title: 'Account and Data Deletion',
      blocks: [
        {
          type: 'paragraph',
          text: 'You may ask us to delete your account at any time. On deletion we remove your profile from public view, deactivate your listings, and stop sending you notifications.',
        },
        {
          type: 'paragraph',
          text: 'Some information is retained after deletion where we are legally required to keep it, where it is needed for an unresolved dispute or an open booking, or where it forms part of another person’s record, such as a review you wrote about a provider or a booking they completed. Retained records are restricted and are deleted once the reason for keeping them ends.',
        },
      ],
    },
    {
      id: 'third-party-sites',
      title: 'Third-Party Websites and Services',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Platform may link to sites we do not control, including provider social media pages and payment portals.',
        },
        {
          type: 'paragraph',
          text: 'This policy does not cover those sites. Read their privacy notices before giving them personal information.',
        },
      ],
    },
    {
      id: 'international-transfers',
      title: 'International Data Transfers',
      blocks: [
        {
          type: 'paragraph',
          text: 'Some of our technology partners store or process data outside the Philippines.',
        },
        {
          type: 'paragraph',
          text: 'Where information is transferred abroad we remain accountable for it under the Data Privacy Act, and we use contractual safeguards requiring a comparable level of protection to that required in the Philippines.',
        },
      ],
    },
    {
      id: 'breach-response',
      title: 'Data Breach Response',
      blocks: [
        {
          type: 'paragraph',
          text: 'We maintain a procedure for security incidents involving personal information: contain, assess, notify, and remediate.',
        },
        {
          type: 'paragraph',
          text: 'Where a breach is likely to give rise to a real risk of serious harm, we notify the National Privacy Commission and the affected data subjects within the period required by the Act and its Implementing Rules, describing what happened, what information was involved, and what to do about it.',
        },
      ],
    },
    {
      id: 'marketing',
      title: 'Marketing Communications',
      blocks: [
        {
          type: 'paragraph',
          text: 'We send marketing messages only where you have opted in. You can withdraw at any time using the unsubscribe link or your notification settings.',
        },
        {
          type: 'paragraph',
          text: 'Opting out of marketing does not stop operational messages such as booking confirmations, quotation alerts, security notices, and password reset codes. Those are part of the service.',
        },
      ],
    },
    {
      id: 'analytics',
      title: 'Analytics',
      blocks: [
        {
          type: 'paragraph',
          text: 'We use analytics to understand which features are used and where people get stuck, so the Platform can be improved.',
        },
        {
          type: 'paragraph',
          text: 'Analytics data is aggregated wherever possible and is not used to build advertising profiles or sold to anyone.',
        },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to the Privacy Policy',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may update this policy as the Platform changes or as the law develops. The "Last updated" date at the top always reflects the current version.',
        },
        {
          type: 'paragraph',
          text: 'For material changes we give notice through the Platform or by email before they take effect, and we obtain fresh consent where the Act requires it.',
        },
      ],
    },
    {
      id: 'dpo',
      title: 'Data Protection Officer',
      blocks: [
        {
          type: 'paragraph',
          text: 'As required by the Data Privacy Act, we have designated a Data Protection Officer responsible for overseeing compliance and for handling data subject requests.',
        },
        {
          type: 'list',
          items: [
            `Data Protection Officer: ${P.dpoName}`,
            `Email: ${P.privacyEmail}`,
            `Postal address: ${P.businessAddress}`,
          ],
        },
      ],
    },
    {
      id: 'complaints',
      title: 'Complaints and Privacy Concerns',
      blocks: [
        {
          type: 'paragraph',
          text: `If you are concerned about how we handle your personal information, write to ${P.privacyEmail}. We acknowledge complaints promptly and aim to resolve them within the period set by the Act.`,
        },
        {
          type: 'paragraph',
          text: 'If you are not satisfied with our response, you may lodge a complaint with the National Privacy Commission of the Philippines.',
        },
      ],
    },
    {
      id: 'dpa-compliance',
      title: 'Philippine Data Privacy Act Compliance',
      blocks: [
        {
          type: 'paragraph',
          text: 'FixItPH acts as a personal information controller under Republic Act No. 10173, the Data Privacy Act of 2012.',
        },
        {
          type: 'paragraph',
          text: 'We apply the Act’s principles of transparency, legitimate purpose, and proportionality: we tell you what we do with your information, we process it only for declared and lawful purposes, and we collect only what those purposes actually need.',
        },
        {
          type: 'paragraph',
          text: 'We maintain records of processing activities, engage processors under written contracts, apply security measures proportionate to the risk, and follow the Act’s breach notification requirements.',
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact Information',
      blocks: [
        {
          type: 'paragraph',
          text: 'For any question about this policy or about your personal information:',
        },
        {
          type: 'list',
          items: [
            `Business: ${P.businessName}`,
            `Address: ${P.businessAddress}`,
            `Website: ${P.website}`,
            `Privacy and data subject requests: ${P.privacyEmail}`,
            `General support: ${P.supportEmail}`,
          ],
        },
      ],
    },
  ],
};
