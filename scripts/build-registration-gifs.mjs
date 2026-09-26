// One-off script to assemble the Cas ID registration walkthrough GIFs
// embedded in README.md / README.vi.md. Not part of the app build --
// run manually (`node scripts/build-registration-gifs.mjs`) whenever the
// source screenshots in `.gif-src/` need to be re-rendered (e.g. Cas ID
// changes its UI). Requires the `sharp`/`gifenc` devDependencies.
import { readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;

const DELAY_MS = 2800;

// Several source images (760x1280 phone-mockup renders -- 3 of the 11
// individual-flow images from cas.so, and all 12 of the enterprise-flow
// images) render a visible noisy/moiré pattern in their decorative
// drop-shadow once downscaled + quantized to GIF's 256-color palette: the
// shadow's huge, near-uniform pixel count vs. its narrow color range
// confuses both sharp's resize kernel and gifenc's quantizer (tried
// `kernel: 'mitchell'` and `prequantize()` rounding -- neither fully fixed
// it). Cropping the shadow out entirely, keeping just the clean phone body,
// sidesteps the problem rather than fighting it.
const PHONE_BODY_CROP = { left: 110, top: 90, width: 540, height: 1100 };
const INDIVIDUAL_CROPS = {
  '03b.png': PHONE_BODY_CROP,
  '06a.png': PHONE_BODY_CROP,
  '06b.png': PHONE_BODY_CROP,
};

// All 12 enterprise-flow images are the same 760x1280 template family as the
// noisy individual-flow ones above, so they get the same crop applied to
// every file (01.png through 12.png).
const ENTERPRISE_CROPS = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [`${String(i + 1).padStart(2, '0')}.png`, PHONE_BODY_CROP])
);

async function buildGif(srcDir, outFile, frameWidth, crops = {}) {
  const files = readdirSync(srcDir)
    .filter((f) => f.toLowerCase().endsWith('.png'))
    .sort();

  if (files.length === 0) throw new Error(`No source frames found in ${srcDir}`);

  // First pass: resize every frame to the same width, keep proportional
  // height, and find the tallest resulting frame so every frame can share
  // one common canvas size (gifenc needs identical WxH across frames).
  const resized = [];
  let maxHeight = 0;
  for (const file of files) {
    let pipeline = sharp(path.join(srcDir, file));
    if (crops[file]) pipeline = pipeline.extract(crops[file]);
    const buf = await pipeline
      // `kernel: 'mitchell'` -- sharp's default (lanczos3) produces a
      // visible ringing/moiré pattern in the phone mockups' smooth
      // drop-shadow gradient when downscaling this much (760px -> 320px);
      // mitchell's anti-ringing behavior renders the same shadow cleanly.
      .resize({ width: frameWidth, fit: 'contain', background: '#ffffff', kernel: 'mitchell' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    resized.push(buf);
    maxHeight = Math.max(maxHeight, buf.info.height);
  }

  const gif = GIFEncoder();
  for (const { data, info } of resized) {
    // Pad shorter frames to maxHeight (white background) so every frame is
    // exactly FRAME_WIDTH x maxHeight.
    const padded = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .extend({
        top: 0,
        bottom: maxHeight - info.height,
        left: 0,
        right: 0,
        background: '#ffffff',
      })
      .raw()
      .toBuffer();

    const palette = quantize(padded, 256);
    const index = applyPalette(padded, palette);
    gif.writeFrame(index, frameWidth, maxHeight, { palette, delay: DELAY_MS });
  }
  gif.finish();

  await writeFile(outFile, gif.bytes());
  console.log(`Wrote ${outFile} (${files.length} frames, ${frameWidth}x${maxHeight})`);
}

// Both flows are now cropped to plain portrait phone screenshots (~1:2
// aspect ratio), so both render at the same narrow width -- at something
// like 800px wide they'd come out ~1600px tall, dwarfing everything else in
// the README.
await buildGif(
  '.gif-src/individual',
  'public/cas-id-registration-individual.gif',
  320,
  INDIVIDUAL_CROPS
);
await buildGif(
  '.gif-src/enterprise',
  'public/cas-id-registration-enterprise.gif',
  320,
  ENTERPRISE_CROPS
);
