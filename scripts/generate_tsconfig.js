const fs = require('fs');
const os = require('os');
const path = require('path');

const placeholder = '<deno-dir>';

function determineDenoDir() {
  // TODO mac/windows
  return path.join(os.homedir(), '.cache', 'deno');
}

function createTsConfig(denoDir) {
  return {
    "compilerOptions": {
      "target": "esnext",
      "module": "esnext",
      "baseUrl": ".",
      "paths": {
        "deno": ["./types/deno.d.ts"],
        "https://*": [
          `${denoDir}/deps/https/*`
        ],
        "http://*": [
          `${denoDir}/deps/http/*`
        ]
      },
     "plugins": [{ "name": "typescript-deno-plugin" }]
    }
  };
}

const denoDir = determineDenoDir();
const tsconfig = createTsConfig(denoDir);
fs.writeFileSync(path.join(__dirname, '..', 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
