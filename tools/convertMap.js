const MapConverter = require('../modules/AMR/converter');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node tools/convertMap.js <input.smap> <output.js> [--no-validate] [--no-backup]');
  console.log('Example: node tools/convertMap.js modules/AMR/mapAMR.v3.smap modules/AMR/nodes.config.js');
  process.exit(1);
}

const [inputPath, outputPath] = args;
const validate = !args.includes('--no-validate');

async function convert() {
  try {
    const absoluteInput = path.resolve(inputPath);
    const absoluteOutput = path.resolve(outputPath);

    console.log(`Converting: ${absoluteInput}`);
    console.log(`Output: ${absoluteOutput}\n`);

    const result = await MapConverter.convert(absoluteInput, absoluteOutput, {
      validate
    });

    console.log('\n✅ Conversion successful!');
    console.log('Stats:', result.stats);
  } catch (error) {
    console.error('\n❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

convert();
