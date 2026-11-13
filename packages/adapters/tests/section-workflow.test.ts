/**
 * T0501: section brief + design contract — briefs must share the page's
 * token contract (G1); order references must resolve to briefs.
 */
import { describe, expect, it } from 'vitest';
import {
  DesignContract,
  SectionBrief,
  type DesignContractData,
  type SectionBriefData,
} from '@sus/schemas';

const brief = (id: string): SectionBriefData => ({
  id,
  surface: 'marketing',
  component: id,
  contentRequirements: [`${id} content per brief`],
  constraints: ['token-only styling (G1)'],
  tokensRef: '.sus/tokens.json',
  behaviorIds: [],
  rubricSubject: `fixtures/marketing#${id}`,
});

const contract: DesignContractData = {
  version: 1,
  pageId: 'meridian-home',
  tokensRef: '.sus/tokens.json',
  order: { pageId: 'meridian-home', sections: ['hero', 'features'] },
  briefs: [brief('hero'), brief('features')],
};

describe('design contract (T0501)', () => {
  it('validates a complete two-section contract', () => {
    expect(DesignContract.safeParse(contract).success).toBe(true);
    expect(SectionBrief.safeParse(contract.briefs[0]).success).toBe(true);
  });

  it('order referencing a section without a brief is rejected', () => {
    const bad = {
      ...contract,
      order: { pageId: 'meridian-home', sections: ['hero', 'features', 'ghost-section'] },
    };
    expect(DesignContract.safeParse(bad).success).toBe(false);
  });

  it('a brief styling through a different token contract is rejected (G1)', () => {
    const bad = JSON.parse(JSON.stringify(contract)) as DesignContractData;
    bad.briefs[1]!.tokensRef = 'other-tokens.json';
    expect(DesignContract.safeParse(bad).success).toBe(false);
  });
});
