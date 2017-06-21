rm -rf dist
mkdir dist
babel index.js --out-file ./dist/index.js
babel mobile.js --out-file ./dist/mobile.js
babel lib --out-dir ./dist/src
babel fetch --out-dir ./dist/fetch
cp package.json dist/
cp README.md dist/
cp -r router dist/

echo 'pamler\na021651212\npamler@126.com' | npm login
npm publish dist/

rm -rf dist
