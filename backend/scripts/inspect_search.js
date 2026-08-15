const https = require('https');

https.get('https://cooponline.vn/search?query=g%E1%BA%A1o', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const match = data.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    if (match) {
      const json = JSON.parse(match[1]);
      // Let's try to find 'products' anywhere in the object tree
      function findProducts(obj, depth=0) {
        if(depth > 10 || !obj) return;
        if(Array.isArray(obj)) {
          if(obj.length > 0 && obj[0].sku && obj[0].name) {
            console.log("Found products array at depth", depth, "Length:", obj.length);
            console.log("Sample:", obj[0].name, obj[0].price);
            return obj;
          }
        } else if(typeof obj === 'object') {
          for(const key of Object.keys(obj)) {
            const result = findProducts(obj[key], depth+1);
            if (result) return result;
          }
        }
        return null;
      }
      const products = findProducts(json.props);
      if(!products) console.log("Could not find products in JSON.");
    } else {
      console.log("No NEXT_DATA found.");
    }
  });
}).on('error', err => {
  console.log("Error: " + err.message);
});
