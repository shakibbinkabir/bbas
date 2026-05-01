import { describe, it, expect } from 'vitest';
import {
  buildCompliancePrompt,
  estimateTokens,
  type PromptInput,
} from '../prompt-builder';

const baseApp = {
  buildingType: 'residential',
  numFloors: 5,
  totalAreaSqft: 1500,
  landAreaKatha: 5,
  landAddressEn: 'Dhaka, Bangladesh',
  authorityCode: 'RAJUK',
};

describe('estimateTokens', () => {
  it('estimates ~1 token per 4 chars', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(40))).toBe(10);
  });
});

describe('buildCompliancePrompt', () => {
  it('includes all application fields', () => {
    const prompt = buildCompliancePrompt({
      application: baseApp,
      documents: [],
    });
    expect(prompt).toContain('residential');
    expect(prompt).toContain('5');
    expect(prompt).toContain('Dhaka, Bangladesh');
    expect(prompt).toContain('RAJUK');
  });

  it('asks for the JSON output format', () => {
    const prompt = buildCompliancePrompt({
      application: baseApp,
      documents: [],
    });
    expect(prompt).toContain('overall_score');
    expect(prompt).toContain('categories');
    expect(prompt).toContain('summary');
    expect(prompt).toContain('recommendation');
  });

  it('marks documents without text as "(no text extracted)"', () => {
    const prompt = buildCompliancePrompt({
      application: baseApp,
      documents: [{ type: 'land_deed', fileName: 'deed.pdf' }],
    });
    expect(prompt).toContain('no text extracted');
  });

  it('embeds an excerpt when textContent is provided', () => {
    const prompt = buildCompliancePrompt({
      application: baseApp,
      documents: [
        { type: 'land_deed', fileName: 'deed.pdf', textContent: 'Owner: Mr. X' },
      ],
    });
    expect(prompt).toContain('Owner: Mr. X');
  });

  it('truncates very long excerpts to fit within token budget', () => {
    const huge = 'A'.repeat(200_000);
    const input: PromptInput = {
      application: baseApp,
      documents: [
        { type: 'land_deed', fileName: 'deed.pdf', textContent: huge },
      ],
    };
    const prompt = buildCompliancePrompt(input);
    expect(estimateTokens(prompt)).toBeLessThanOrEqual(25_000);
  });

  it('drops excerpts entirely when even minimum sizes overflow', () => {
    const huge = 'A'.repeat(200_000);
    const input: PromptInput = {
      application: baseApp,
      documents: Array.from({ length: 50 }, (_, i) => ({
        type: 'land_deed',
        fileName: `deed-${i}.pdf`,
        textContent: huge,
      })),
    };
    const prompt = buildCompliancePrompt(input);
    expect(estimateTokens(prompt)).toBeLessThanOrEqual(25_000);
  });
});
