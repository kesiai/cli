import { describe, it, expect } from 'vitest';
import { deepMerge } from './utils.js';

describe('deepMerge', () => {
  it('应该合并两个简单对象', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('应该递归合并嵌套对象', () => {
    const target = { a: { x: 1, y: 2 }, b: 3 };
    const source = { a: { y: 10, z: 4 } };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: { x: 1, y: 10, z: 4 }, b: 3 });
  });

  it('应该直接替换数组（不合并）', () => {
    const target = { items: [1, 2, 3] };
    const source = { items: [4, 5] };
    const result = deepMerge(target, source);
    expect(result).toEqual({ items: [4, 5] });
  });

  it('应该忽略 undefined 值，保留原始值', () => {
    const target = { a: 1, b: 2, c: 3 };
    const source = { b: undefined, c: 10 };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 1, b: 2, c: 10 });
  });

  it('应该支持 null 值覆盖', () => {
    const target = { a: 1, b: 2 };
    const source = { a: null };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: null, b: 2 });
  });

  it('应该支持 0 值覆盖', () => {
    const target = { a: 1, b: 2 };
    const source = { a: 0 };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: 0, b: 2 });
  });

  it('应该支持空字符串覆盖', () => {
    const target = { a: 'hello', b: 'world' };
    const source = { a: '' };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: '', b: 'world' });
  });

  it('应该支持 false 值覆盖', () => {
    const target = { a: true, b: true };
    const source = { a: false };
    const result = deepMerge(target, source);
    expect(result).toEqual({ a: false, b: true });
  });

  it('应该在 source 为空时返回 target 副本', () => {
    const target = { a: 1, b: 2 };
    const result = deepMerge(target, {});
    expect(result).toEqual({ a: 1, b: 2 });
    // 确保是副本，不是同一个引用
    expect(result).not.toBe(target);
  });

  it('应该合并复杂嵌套结构（模拟表结构）', () => {
    const target = {
      id: 'table1',
      title: '设备表',
      properties: {
        deviceId: { title: '设备ID', type: 'string' },
        temperature: { title: '温度', type: 'number' },
      },
      tags: [],
    };

    const source = {
      properties: {
        temperature: { title: '温度（修改）', unit: '℃' },
        humidity: { title: '湿度', type: 'number' },
      },
    };

    const result = deepMerge(target, source);
    expect(result).toEqual({
      id: 'table1',
      title: '设备表',
      properties: {
        deviceId: { title: '设备ID', type: 'string' },
        temperature: { title: '温度（修改）', type: 'number', unit: '℃' }, // 递归合并：保留原始 type
        humidity: { title: '湿度', type: 'number' },
      },
      tags: [],
    });
  });

  it('应该处理多级嵌套对象', () => {
    const target = {
      level1: {
        level2: {
          level3: { a: 1, b: 2 },
          other: 'value',
        },
      },
    };

    const source = {
      level1: {
        level2: {
          level3: { b: 20, c: 3 },
        },
      },
    };

    const result = deepMerge(target, source);
    expect(result).toEqual({
      level1: {
        level2: {
          level3: { a: 1, b: 20, c: 3 },
          other: 'value',
        },
      },
    });
  });
});
