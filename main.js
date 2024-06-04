const csv = require('csv-parser');
const pako = require('pako');
const fs = require('fs');
const results = [];

const fs.createReadStream('user-filtered-updated.csv.gz');

fs.createReadStream('user-filtered-updated.csv.gz')
    .pipe(csv({}))
    .on('data', (data) => results.push(data))
    .on('end', () => {
    console.log(results);
});