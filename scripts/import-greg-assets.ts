/**
 * Bulk Import Greg's Assets
 *
 * Run with: npx ts-node scripts/import-greg-assets.ts
 * Or: npx tsx scripts/import-greg-assets.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ASSETS_DIR = '/tmp/greg-caseley-assets';
const API_BASE = 'http://localhost:3000/api/accounts/greg-caseley/assets';

interface AgentData {
  name: string;
  images: {
    headshot: string;
    headshotTrim: string;
    portrait: string;
    logo: string;
    logoRed: string;
    badge: string;
  };
}

interface Listing {
  slug: string;
  street: string;
  city: string;
  photos: string[];
}

async function uploadFile(
  filePath: string,
  type: string,
  name: string,
  tags: string[] = [],
  isPrimary = false
): Promise<void> {
  const fullPath = path.join(ASSETS_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠ File not found: ${filePath}`);
    return;
  }

  const fileBuffer = fs.readFileSync(fullPath);
  const fileName = path.basename(filePath);
  const mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Create a Blob-like object for Node.js
  const blob = new Blob([fileBuffer], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('name', name);
  formData.append('tags', tags.join(','));
  formData.append('isPrimary', isPrimary.toString());

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      console.log(`  ✓ ${name} (${type})`);
    } else {
      const error = await response.json();
      console.log(`  ✗ ${name}: ${error.error || response.status}`);
    }
  } catch (error) {
    console.log(`  ✗ ${name}: ${error}`);
  }
}

async function main() {
  console.log('\n📦 Importing Greg Caseley Assets\n');
  console.log('=' .repeat(50));

  // Load agent data
  const agentData: AgentData = JSON.parse(
    fs.readFileSync(path.join(ASSETS_DIR, 'agent.json'), 'utf-8')
  );

  // Load listings
  const listings: Listing[] = JSON.parse(
    fs.readFileSync(path.join(ASSETS_DIR, 'listings.json'), 'utf-8')
  );

  // 1. Upload brand assets
  console.log('\n🎨 Brand Assets\n');

  // Headshots
  await uploadFile(
    agentData.images.headshotTrim,
    'headshot',
    'Greg Caseley Headshot (Trimmed)',
    ['primary', 'transparent'],
    true // Set as primary
  );

  await uploadFile(
    agentData.images.headshot,
    'headshot',
    'Greg Caseley Headshot',
    ['full']
  );

  await uploadFile(
    agentData.images.portrait,
    'headshot',
    'Greg Caseley Portrait',
    ['portrait']
  );

  // Logos
  await uploadFile(
    agentData.images.logo,
    'logo',
    'RE/MAX Harbourside Logo',
    ['remax', 'harbourside'],
    true // Set as primary
  );

  await uploadFile(
    agentData.images.logoRed,
    'logo',
    'RE/MAX Harbourside Logo (Red)',
    ['remax', 'harbourside', 'red']
  );

  await uploadFile(
    agentData.images.badge,
    'logo',
    'RE/MAX Brokerage Badge',
    ['remax', 'badge']
  );

  // 2. Upload listing photos
  console.log('\n🏠 Listing Photos\n');

  for (const listing of listings) {
    if (!listing.photos || listing.photos.length === 0) continue;

    for (let i = 0; i < listing.photos.length; i++) {
      const photoPath = listing.photos[i];
      const photoName = `${listing.street}${listing.photos.length > 1 ? ` (${i + 1})` : ''}`;
      const tags = [listing.slug, listing.city.toLowerCase().replace(/\s+/g, '-')];

      await uploadFile(
        photoPath,
        'property',
        photoName,
        tags
      );
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ Import complete!\n');
}

main().catch(console.error);
