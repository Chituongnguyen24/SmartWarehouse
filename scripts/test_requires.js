const path = require('path');
const base = path.resolve(__dirname, '../backend/services/product-service/dist');

console.log('Testing requires:');
console.log('Product entity...');
require(path.join(base, 'product/product.entity'));
console.log('Product entity OK');

console.log('Category entity...');
require(path.join(base, 'category/category.entity'));
console.log('Category entity OK');

console.log('Voucher entity...');
require(path.join(base, 'voucher/voucher.entity'));
console.log('Voucher entity OK');

console.log('Product controller...');
require(path.join(base, 'product/product.controller'));
console.log('Product controller OK');

console.log('Category controller...');
require(path.join(base, 'category/category.controller'));
console.log('Category controller OK');

console.log('Product service...');
require(path.join(base, 'product/product.service'));
console.log('Product service OK');

console.log('Category service...');
require(path.join(base, 'category/category.service'));
console.log('Category service OK');

console.log('All individual files required OK!');

