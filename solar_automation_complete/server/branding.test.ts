import { describe, it, expect } from 'vitest';
import { BRANDING } from '../shared/branding';
import { getSolarProposalEmail, getQualificationConfirmationEmail } from './emailTemplates';

describe('Yield Bureau Branding', () => {
  describe('Branding Constants', () => {
    it('should have Yield Bureau as agency name', () => {
      expect(BRANDING.agencyName).toBe('Yield Bureau');
      console.log(`[Branding] ✓ Agency name: ${BRANDING.agencyName}`);
    });

    it('should have valid PDF footer text', () => {
      expect(BRANDING.pdfFooterText).toContain('Yield Bureau');
      expect(BRANDING.pdfFooterText).toContain('2026');
      console.log(`[Branding] ✓ PDF footer: ${BRANDING.pdfFooterText}`);
    });

    it('should have valid PDF company name', () => {
      expect(BRANDING.pdfCompanyName).toBe('Yield Bureau');
      console.log(`[Branding] ✓ PDF company name: ${BRANDING.pdfCompanyName}`);
    });

    it('should have valid service provider description', () => {
      expect(BRANDING.serviceProviderDescription).toContain('solar');
      console.log(`[Branding] ✓ Service provider: ${BRANDING.serviceProviderDescription}`);
    });

    it('should have brand colors defined', () => {
      expect(BRANDING.colors.primary).toBeDefined();
      expect(BRANDING.colors.secondary).toBeDefined();
      expect(BRANDING.colors.accent).toBeDefined();
      console.log(`[Branding] ✓ Brand colors configured`);
    });
  });

  describe('Email Templates', () => {
    it('should include Yield Bureau in solar proposal email (English)', () => {
      const email = getSolarProposalEmail('John Doe', 'TechCorp', 'https://example.com/proposal', 'en');
      
      expect(email.subject).toContain('Solar Investment Proposal');
      expect(email.html).toContain('Yield Bureau');
      expect(email.text).toContain('Yield Bureau');
      console.log(`[Branding] ✓ Solar proposal email (EN) branded`);
    });

    it('should include Yield Bureau in solar proposal email (Romanian)', () => {
      const email = getSolarProposalEmail('John Doe', 'TechCorp', 'https://example.com/proposal', 'ro');
      
      expect(email.subject).toContain('Analiză Investiție Solară');
      expect(email.html).toContain('Yield Bureau');
      expect(email.text).toContain('Yield Bureau');
      console.log(`[Branding] ✓ Solar proposal email (RO) branded`);
    });

    it('should include Yield Bureau in qualification confirmation email (English)', () => {
      const email = getQualificationConfirmationEmail('John Doe', 'TechCorp', 'en');
      
      expect(email.subject).toContain('Solar Qualification Confirmation');
      expect(email.html).toContain('Yield Bureau');
      expect(email.text).toContain('Yield Bureau');
      console.log(`[Branding] ✓ Qualification confirmation email (EN) branded`);
    });

    it('should include Yield Bureau in qualification confirmation email (Romanian)', () => {
      const email = getQualificationConfirmationEmail('John Doe', 'TechCorp', 'ro');
      
      expect(email.subject).toContain('Confirmarea Calificării Solare');
      expect(email.html).toContain('Yield Bureau');
      expect(email.text).toContain('Yield Bureau');
      console.log(`[Branding] ✓ Qualification confirmation email (RO) branded`);
    });

    it('should include email signature in templates', () => {
      const email = getSolarProposalEmail('John Doe', 'TechCorp', 'https://example.com/proposal', 'en');
      
      expect(email.text).toContain('Yield Bureau');
      expect(email.text).toContain('All rights reserved');
      console.log(`[Branding] ✓ Email signature included`);
    });
  });

  describe('PDF Branding', () => {
    it('should have PDF footer with Yield Bureau', () => {
      expect(BRANDING.pdfFooterText).toContain('Yield Bureau');
      expect(BRANDING.pdfFooterText).toContain('©');
      console.log(`[Branding] ✓ PDF footer branded`);
    });

    it('should have PDF tagline', () => {
      expect(BRANDING.pdfTagline).toBeDefined();
      expect(BRANDING.pdfTagline.length).toBeGreaterThan(0);
      console.log(`[Branding] ✓ PDF tagline: ${BRANDING.pdfTagline}`);
    });
  });
});
