const fs = require('fs');
const path = require('path');

const servicesDir = path.join(__dirname, 'backend', 'services');
if (fs.existsSync(servicesDir)) {
    const dirs = fs.readdirSync(servicesDir);
    dirs.forEach(dir => {
        const pkgPath = path.join(servicesDir, dir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            let content = fs.readFileSync(pkgPath, 'utf8');
            if (content.includes('"start:dev": "ts-node src/main.ts"')) {
                content = content.replace('"start:dev": "ts-node src/main.ts"', '"start:dev": "nest start --watch"');
                fs.writeFileSync(pkgPath, content, 'utf8');
                console.log('Updated', pkgPath);
            }
        }
    });
    console.log('Done');
}
