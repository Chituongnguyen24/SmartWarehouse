const https = require('https');

https.get('https://cooponline.vn/search?query=g%E1%BA%A1o', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Just find "Gạo" in HTML and print some lines around it
    const lines = data.split('\n');
    let found = false;
    for(let i = 0; i < lines.length; i++) {
      if(lines[i].includes('Gạo')) {
        console.log(`Match at line ${i}:`);
        console.log(lines[i].substring(0, 500) + '...');
        found = true;
        break;
      }
    }
    if (!found) console.log("Not found in HTML.");
  });
}).on('error', err => {
  console.log("Error: " + err.message);
});
