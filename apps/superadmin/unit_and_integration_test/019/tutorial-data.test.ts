/**
 * Unit tests for tutorial-data model (Row 019 — 公司產品教學)
 *
 * These tests run in the superadmin Jest environment and verify:
 * - Data integrity of the tutorial content structure
 * - getTotalSteps utility
 * - All required fields are present and valid
 *
 * Note: The tutorial feature lives in apps/web; these tests import the
 * shared lib directly to validate architectural constraints without a
 * browser environment.
 */

import {
  TUTORIAL_DATA,
  TUTORIAL_ROLES,
  ROLE_LABELS,
  getTotalSteps,
  type TutorialRole,
} from '../../../../apps/web/lib/tutorial-data';

// ---------------------------------------------------------------------------
// Data integrity
// ---------------------------------------------------------------------------

describe('TUTORIAL_DATA — data integrity', () => {
  test('應包含三個角色：landlord, tenant, buyer', () => {
    expect(TUTORIAL_ROLES).toEqual(['landlord', 'tenant', 'buyer']);
  });

  test.each(TUTORIAL_ROLES)('角色 %s 應有 label、icon、description', (role) => {
    const config = TUTORIAL_DATA[role as TutorialRole];
    expect(typeof config.label).toBe('string');
    expect(config.label.length).toBeGreaterThan(0);
    expect(typeof config.icon).toBe('string');
    expect(config.icon.length).toBeGreaterThan(0);
    expect(typeof config.description).toBe('string');
    expect(config.description.length).toBeGreaterThan(0);
  });

  test.each(TUTORIAL_ROLES)('角色 %s 每個步驟必須有唯一 id', (role) => {
    const steps = TUTORIAL_DATA[role as TutorialRole].steps;
    const ids = steps.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test.each(TUTORIAL_ROLES)('角色 %s 每個步驟必須有 title 與 description', (role) => {
    const steps = TUTORIAL_DATA[role as TutorialRole].steps;
    steps.forEach((step) => {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    });
  });

  test.each(TUTORIAL_ROLES)('角色 %s 每個步驟的 id 以角色前綴開頭', (role) => {
    const steps = TUTORIAL_DATA[role as TutorialRole].steps;
    steps.forEach((step) => {
      expect(step.id.startsWith(role)).toBe(true);
    });
  });

  test('landlord 應有 4 個步驟', () => {
    expect(TUTORIAL_DATA.landlord.steps).toHaveLength(4);
  });

  test('tenant 應有 3 個步驟', () => {
    expect(TUTORIAL_DATA.tenant.steps).toHaveLength(3);
  });

  test('buyer 應有 4 個步驟', () => {
    expect(TUTORIAL_DATA.buyer.steps).toHaveLength(4);
  });

  test('有 featureLink 的步驟必須同時提供 featureLinkLabel', () => {
    TUTORIAL_ROLES.forEach((role) => {
      TUTORIAL_DATA[role as TutorialRole].steps.forEach((step) => {
        if (step.featureLink !== undefined) {
          expect(typeof step.featureLinkLabel).toBe('string');
          expect((step.featureLinkLabel ?? '').length).toBeGreaterThan(0);
        }
      });
    });
  });

  test('video 步驟必須設定 videoDurationSec 且不超過 120 秒', () => {
    TUTORIAL_ROLES.forEach((role) => {
      TUTORIAL_DATA[role as TutorialRole].steps.forEach((step) => {
        if (step.mediaType === 'video') {
          expect(typeof step.videoDurationSec).toBe('number');
          expect(step.videoDurationSec!).toBeLessThanOrEqual(120);
        }
      });
    });
  });
});

// ---------------------------------------------------------------------------
// getTotalSteps
// ---------------------------------------------------------------------------

describe('getTotalSteps', () => {
  test('landlord 回傳 4', () => {
    expect(getTotalSteps('landlord')).toBe(4);
  });

  test('tenant 回傳 3', () => {
    expect(getTotalSteps('tenant')).toBe(3);
  });

  test('buyer 回傳 4', () => {
    expect(getTotalSteps('buyer')).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// ROLE_LABELS
// ---------------------------------------------------------------------------

describe('ROLE_LABELS', () => {
  test('應包含三個角色的繁體中文標籤', () => {
    expect(ROLE_LABELS.landlord).toBe('房東');
    expect(ROLE_LABELS.tenant).toBe('租客');
    expect(ROLE_LABELS.buyer).toBe('買家');
  });
});
