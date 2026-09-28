import fs from 'fs';

const rawCode = fs.readFileSync('script_data.js', 'utf8');
const target = `\\"shortcode\\":\\"DdwF-JpHD8F\\"`;
const pos = rawCode.indexOf(target);
const chunk = rawCode.substring(pos, pos + 35000);

const capIdx = chunk.indexOf('edge_media_to_caption');
console.log('capIdx for DdwF-JpHD8F:', capIdx);
if (capIdx !== -1) {
  console.log(chunk.substring(capIdx, capIdx + 500));
}
