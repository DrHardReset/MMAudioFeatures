'use strict';

const { Utils } = require('../../lib/utils');

describe('Utils', () => {
    describe('formatDuration', () => {
        test('should format milliseconds to mm:ss format', () => {
            expect(Utils.formatDuration(125000)).toBe('2:05');
            expect(Utils.formatDuration(65000)).toBe('1:05');
            expect(Utils.formatDuration(5000)).toBe('0:05');
        });

        test('should handle edge cases', () => {
            expect(Utils.formatDuration(0)).toBe('N/A');
            expect(Utils.formatDuration(59999)).toBe('1:00');
            expect(Utils.formatDuration(3600000)).toBe('60:00');
        });
    });

    describe('convertKeyToString', () => {
        test('should format key and mode correctly', () => {
            expect(Utils.convertKeyToString(0)).toBe('C');
            expect(Utils.convertKeyToString(1)).toBe('Db');
            expect(Utils.convertKeyToString(23)).toBe('Bm');
        });

        test('should handle invalid inputs', () => {
            expect(Utils.convertKeyToString(null)).toBe('');
            expect(Utils.convertKeyToString(undefined)).toBe('');
            expect(Utils.convertKeyToString(24)).toBe('');
        });
    });

    afterAll(() => {
        console.log('🏁 Utils Test completed');
    });
});
