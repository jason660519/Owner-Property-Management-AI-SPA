const assert = require('assert');
const { SortLogic } = require('./table-sort.js');

console.log('Running SortLogic Tests...');

// 1. Version Parsing
console.log('Test: Version Parsing');
assert.deepStrictEqual(SortLogic.parseVersion('1.2.3'), [1, 2, 3]);
assert.deepStrictEqual(SortLogic.parseVersion('^1.2.3'), [1, 2, 3]);
assert.deepStrictEqual(SortLogic.parseVersion('~1.2.0'), [1, 2, 0]);
assert.deepStrictEqual(SortLogic.parseVersion('10.0.1'), [10, 0, 1]);
assert.deepStrictEqual(SortLogic.parseVersion('invalid'), [0]); // Fallback check
console.log('✓ Version Parsing Passed');

// 2. Version Comparison
console.log('Test: Version Comparison');
assert.strictEqual(SortLogic.compare('1.0.0', '2.0.0', 'version', 'asc'), -1);
assert.strictEqual(SortLogic.compare('2.0.0', '1.0.0', 'version', 'asc'), 1);
assert.strictEqual(SortLogic.compare('1.2.3', '1.2.3', 'version', 'asc'), 0);
assert.strictEqual(SortLogic.compare('1.2.3', '1.2.10', 'version', 'asc'), -1); // 3 < 10
assert.strictEqual(SortLogic.compare('^1.2.3', '1.3.0', 'version', 'asc'), -1); // 1.2.3 < 1.3.0
console.log('✓ Version Comparison Passed');

// 3. String Comparison
console.log('Test: String Comparison');
assert.strictEqual(SortLogic.compare('Apple', 'Banana', 'string', 'asc'), -1);
assert.strictEqual(SortLogic.compare('Banana', 'Apple', 'string', 'asc'), 1);
assert.strictEqual(SortLogic.compare('Apple', 'Banana', 'string', 'desc'), 1);
console.log('✓ String Comparison Passed');

// 4. Performance Test
console.log('Test: Performance (10,000 items)');
const data = [];
for (let i = 0; i < 10000; i++) {
    data.push({
        v: `${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
    });
}

const start = performance.now();
data.sort((a, b) => SortLogic.compare(a.v, b.v, 'version', 'asc'));
const end = performance.now();
const duration = end - start;
console.log(`Sorted 10,000 versions in ${duration.toFixed(2)}ms`);

assert.ok(duration < 300, 'Sorting should be under 300ms'); // Logic itself is usually < 10ms for 10k items
console.log('✓ Performance Test Passed');

console.log('All tests passed!');
