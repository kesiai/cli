import { describe, expect, it } from 'vitest';
import { validateRecordData } from './record-guard.js';

describe('validateRecordData number 字段浮点拦截', () => {
  const props = { val: { type: 'number' }, name: { type: 'string' } };

  it('整数通过', () => {
    expect(validateRecordData(props, { val: 2 })).toEqual([]);
  });

  it('小数拒绝（未设 dbType 平台按 int 存储，写 2.5 存 2）', () => {
    const errs = validateRecordData(props, { val: 2.5 });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain('Double');
    expect(errs[0]).toContain('2');
  });

  it('dbType=Double 字段小数放行（平台按 float64 完整保留，2026-09-03 实测）', () => {
    const doubleProps = { val: { type: 'number', dbType: 'Double' }, name: { type: 'string' } };
    expect(validateRecordData(doubleProps, { val: 3.7 })).toEqual([]);
  });

  it('dbType=Float/Decimal/Int64 字段小数仍拒（平台不识别，回落整数静默截断）', () => {
    for (const dbType of ['Float', 'Decimal', 'Int64']) {
      const errs = validateRecordData({ val: { type: 'number', dbType } }, { val: 3.7 });
      expect(errs).toHaveLength(1);
      expect(errs[0]).toContain(dbType);
    }
  });

  it('update 路径：触及的小数键同样拒绝（merged=打补丁后的最终值）', () => {
    expect(validateRecordData(props, { val: 9.9, name: 'x' }, { val: 9.9 })).toHaveLength(1);
  });
});
