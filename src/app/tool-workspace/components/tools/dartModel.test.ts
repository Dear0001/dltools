import { describe, expect, it } from 'vitest';
import { dartFieldName, generateDartModels } from './dartModel';

describe('generateDartModels', () => {
  const code = generateDartModels(
    { user_id: 42, full_name: 'Dara', score: 9.5, active: true, tags: ['a'], address: { city: 'Phnom Penh' }, orders: [{ id: 1 }], extra: null },
    'RootModel',
  );

  it('emits fromJson and toJson using the original JSON keys', () => {
    expect(code).toContain('factory RootModel.fromJson(Map<String, dynamic> json) => RootModel(');
    expect(code).toContain("userId: (json['user_id'] as num).toInt(),");
    expect(code).toContain("score: (json['score'] as num).toDouble(),");
    expect(code).toContain("tags: (json['tags'] as List<dynamic>).map((e) => e as String).toList(),");
    expect(code).toContain("address: Address.fromJson(json['address'] as Map<String, dynamic>),");
    expect(code).toContain("orders: (json['orders'] as List<dynamic>).map((e) => OrdersItem.fromJson(e as Map<String, dynamic>)).toList(),");
    expect(code).toContain("'address': address.toJson(),");
    expect(code).toContain("'orders': orders.map((e) => e.toJson()).toList(),");
    expect(code).toContain('final dynamic extra;');
  });

  it('declares nested classes before the root class', () => {
    expect(code.indexOf('class Address {')).toBeLessThan(code.indexOf('class RootModel {'));
    expect(code).toContain('class OrdersItem {');
  });

  it('uses lowerCamelCase and avoids Dart keywords', () => {
    expect(dartFieldName('full_name')).toBe('fullName');
    expect(dartFieldName('class')).toBe('classValue');
    expect(dartFieldName('2fa')).toBe('field2fa');
  });

  it('rejects a non-object root', () => {
    expect(() => generateDartModels([1, 2], 'Root')).toThrow('The root JSON value must be an object.');
  });
});
