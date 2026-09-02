import { describe, expect, it } from 'vitest';
import { validateRecordData } from './record-guard.js';

describe('validateRecordData number 字段浮点拦截', () => {
  const props = { val: { type: 'number' }, name: { type: 'string' } };

  it('整数通过', () => {
    expect(validateRecordData(props, { val: 2 })).toEqual([]);
  });

  it('小数拒绝（平台截断为整数存储，写 2.5 存 2）', () => {
    const errs = validateRecordData(props, { val: 2.5 });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('截断');
    expect(errs[0]).toContain('2');
  });

  it('update 路径：触及的小数键同样拒绝（merged=打补丁后的最终值）', () => {
    expect(validateRecordData(props, { val: 9.9, name: 'x' }, { val: 9.9 })).toHaveLength(1);
  });
});
