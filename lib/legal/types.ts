/**
 * Legal documents are data, not JSX.
 *
 * Keeping the wording in plain structures means a lawyer or privacy officer
 * can review and rewrite it without reading a single React component, and the
 * rendering, table of contents, anchors and metadata all stay consistent
 * between documents.
 */

export interface LegalBlock {
  /** A paragraph of prose. */
  type: 'paragraph' | 'list' | 'note';
  text?: string;
  items?: string[];
}

export interface LegalSection {
  /** Stable anchor. Changing one breaks any link already shared. */
  id: string;
  title: string;
  blocks: LegalBlock[];
  subsections?: { id: string; title: string; blocks: LegalBlock[] }[];
}

export interface LegalDocument {
  title: string;
  /** One sentence, used for the page description and the lead paragraph. */
  summary: string;
  lastUpdated: string;
  effectiveDate: string;
  sections: LegalSection[];
}

/**
 * Placeholders, deliberately obvious, so nothing invented reads as real
 * company information. Replace these in one place before launch.
 */
export const LEGAL_PLACEHOLDERS = {
  website: '[Your FixItPH Website]',
  businessName: '[Your Registered Business Name]',
  businessAddress: '[Your Business Address]',
  supportEmail: 'support@fixitph.example',
  privacyEmail: 'privacy@fixitph.example',
  dpoName: '[Your Data Protection Officer]',
} as const;
