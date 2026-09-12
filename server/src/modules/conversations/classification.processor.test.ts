import { opportunityStatusForIntent } from './classification.processor';

describe('reply opportunity routing', () => {
  it('does not create a sales opportunity for out-of-office replies', () => {
    expect(opportunityStatusForIntent('OUT_OF_OFFICE')).toBeUndefined();
  });

  it('routes uncertain AI classifications to explicit human review', () => {
    expect(opportunityStatusForIntent('REVIEW')).toBe('NEEDS_REVIEW');
  });
});
