import fs from 'fs';

const rawCode = fs.readFileSync('script_data.js', 'utf8');

// Find all shortcode_media blocks using regex
const regex = /\{\\"__typename\\":\\"(?:GraphImage|GraphSidecar|GraphVideo)\\",\\"id\\":\\"(\d+)\\",\\"shortcode\\":\\"([A-Za-z0-9_-]+)\\"[\s\S]*?(?=\{\\"__typename\\":|\])/g;

// Let's test a more direct approach: finding shortcodes, display_urls, captions
const shortcodeMatches = [...rawCode.matchAll(/\\"shortcode\\":\\"([A-Za-z0-9_-]+)\\"/g)].map(m => m[1]);
console.log('All shortcodes in order:', shortcodeMatches);

// Find each post block
// In Instagram embed, shortcode_media objects are in an array
const posts = [];
const uniqueShortcodes = [];

for (const sc of shortcodeMatches) {
  if (uniqueShortcodes.includes(sc)) continue;
  uniqueShortcodes.push(sc);
  
  // Find where this shortcode appears
  const pos = rawCode.indexOf(`\\"shortcode\\":\\"${sc}\\"`);
  // Look back to the start of this shortcode_media
  const blockStart = rawCode.lastIndexOf('{\\"shortcode_media\\"', pos);
  if (blockStart === -1) continue;
  
  // Look forward for display_url
  const displayUrlMatch = rawCode.substring(blockStart, blockStart + 4000).match(/\\"display_url\\":\\"([^\\"]+)\\"/);
  const displayUrl = displayUrlMatch ? displayUrlMatch[1].replace(/\\\\\//g, '/').replace(/\\u0026/g, '&') : '';
  
  // Look for caption
  const captionMatch = rawCode.substring(blockStart, blockStart + 6000).match(/\\"text\\":\\"([^\\"]+)\\"/);
  let caption = captionMatch ? captionMatch[1] : '';
  // Unescape unicode and newlines
  try {
    caption = JSON.parse(`"${caption}"`);
  } catch (e) {}

  posts.push({
    id: sc,
    shortcode: sc,
    link: `https://www.instagram.com/p/${sc}/`,
    image: displayUrl,
    caption: caption || 'Publicação no Instagram @mepbrasilnet'
  });
}

console.log('Extracted posts count:', posts.length);
posts.slice(0, 5).forEach((p, idx) => {
  console.log(`\nPost ${idx + 1}:`);
  console.log('Shortcode:', p.shortcode);
  console.log('Link:', p.link);
  console.log('Image:', p.image.substring(0, 80) + '...');
  console.log('Caption:', p.caption.substring(0, 120));
});

fs.writeFileSync('extracted_posts.json', JSON.stringify(posts, null, 2));
