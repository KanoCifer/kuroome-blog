import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TRANSITION_NAME,
  TRANSITION_SPECS,
  isRouteTransitionName,
  resolveTransitionSpec,
} from '../routeTransitionPolicy';

// ── TRANSITION_SPECS ──────────────────────────────────────────────────────

describe('TRANSITION_SPECS', () => {
  it('每个 spec 都带齐 duration（>0）和 easing（非空字符串）', () => {
    const specs = Object.values(TRANSITION_SPECS);
    expect(specs).toHaveLength(2);
    for (const spec of specs) {
      expect(spec.duration).toBeGreaterThan(0);
      expect(typeof spec.easing).toBe('string');
      expect(spec.easing.length).toBeGreaterThan(0);
    }
  });

  it('fade 比 slide-up 更短（淡入淡出比位移更快）', () => {
    expect(TRANSITION_SPECS.fade.duration).toBeLessThan(
      TRANSITION_SPECS['slide-up'].duration,
    );
  });
});

// ── isRouteTransitionName ────────────────────────────────────────────────

describe('isRouteTransitionName', () => {
  it.each(['fade', 'slide-up'] as const)('接受合法值 %s', (name) => {
    expect(isRouteTransitionName(name)).toBe(true);
  });

  it.each([undefined, null, '', 'none', 'SLIDE-UP', 0, {}, []])(
    '拒绝非法值 %p',
    (value) => {
      expect(isRouteTransitionName(value)).toBe(false);
    },
  );
});

// ── resolveTransitionSpec ────────────────────────────────────────────────

describe('resolveTransitionSpec', () => {
  it('缺失 meta → 使用默认 slide-up', () => {
    expect(resolveTransitionSpec(undefined).name).toBe(DEFAULT_TRANSITION_NAME);
    expect(resolveTransitionSpec(undefined)).toEqual(TRANSITION_SPECS['slide-up']);
  });

  it.each(['fade', 'slide-up'] as const)('合法值 %s → 对应 spec', (name) => {
    expect(resolveTransitionSpec(name)).toEqual(TRANSITION_SPECS[name]);
  });

  it.each(['', 'none', 'SLIDE-UP', 0, null, {}])(
    '未知 / 非字符串值 %p → 降级到默认',
    (value) => {
      expect(resolveTransitionSpec(value)).toEqual(
        TRANSITION_SPECS[DEFAULT_TRANSITION_NAME],
      );
    },
  );

  it('返回值始终带齐 name / duration / easing', () => {
    const spec = resolveTransitionSpec('fade');
    expect(spec.name).toBe('fade');
    expect(typeof spec.duration).toBe('number');
    expect(spec.duration).toBeGreaterThan(0);
    expect(typeof spec.easing).toBe('string');
    expect(spec.easing.length).toBeGreaterThan(0);
  });
});