if (!process.argv.includes('--apply')) process.argv.push('--apply');
require('./seed-recurring-flash-sale.cjs');
