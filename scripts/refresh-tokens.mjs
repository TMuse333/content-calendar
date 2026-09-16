#!/usr/bin/env node
/**
 * Token Refresh Script
 *
 * Usage: node scripts/refresh-tokens.mjs YOUR_SHORT_LIVED_TOKEN
 *
 * This script:
 * 1. Exchanges your short-lived token for a long-lived one (60 days)
 * 2. Gets permanent Page tokens for all your pages
 * 3. Updates MongoDB with the new tokens
 */

import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Load .env.local
dotenv.config({ path: '.env.local' });

const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  const shortToken = process.argv[2];

  if (!shortToken) {
    console.log('\n  Usage: node scripts/refresh-tokens.mjs YOUR_SHORT_LIVED_TOKEN\n');
    console.log('  Get a short-lived token from: https://developers.facebook.com/tools/explorer/\n');
    process.exit(1);
  }

  if (!APP_ID || !APP_SECRET) {
    console.error('Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET in .env.local');
    process.exit(1);
  }

  console.log('\n1. Exchanging for long-lived token...');

  // Exchange for long-lived token
  const exchangeUrl = `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortToken}`;

  const exchangeRes = await fetch(exchangeUrl);
  const exchangeData = await exchangeRes.json();

  if (exchangeData.error) {
    console.error('   Failed:', exchangeData.error.message);
    process.exit(1);
  }

  const longLivedToken = exchangeData.access_token;
  const expiresIn = exchangeData.expires_in;
  console.log(`   Success! Expires in ${Math.round(expiresIn / 86400)} days`);

  // Get page tokens
  console.log('\n2. Fetching Page tokens...');

  const pagesUrl = `https://graph.facebook.com/me/accounts?access_token=${longLivedToken}`;
  const pagesRes = await fetch(pagesUrl);
  const pagesData = await pagesRes.json();

  if (pagesData.error) {
    console.error('   Failed:', pagesData.error.message);
    process.exit(1);
  }

  const pages = pagesData.data || [];
  console.log(`   Found ${pages.length} page(s)`);

  // Get Instagram account for each page
  console.log('\n3. Fetching Instagram accounts...');

  const instagramAccounts = [];

  for (const page of pages) {
    const igUrl = `https://graph.facebook.com/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`;
    const igRes = await fetch(igUrl);
    const igData = await igRes.json();

    if (igData.instagram_business_account) {
      instagramAccounts.push({
        pageName: page.name,
        pageId: page.id,
        pageToken: page.access_token,
        instagramId: igData.instagram_business_account.id,
        username: igData.instagram_business_account.username,
      });
      console.log(`   Found: @${igData.instagram_business_account.username} (${page.name})`);
    }
  }

  if (instagramAccounts.length === 0) {
    console.log('   No Instagram accounts found linked to your pages');
    process.exit(1);
  }

  // Update MongoDB
  console.log('\n4. Updating MongoDB...');

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('strategy');
  const accounts = db.collection('accounts');

  for (const ig of instagramAccounts) {
    // Try to find matching account by Instagram username or ID
    const existing = await accounts.findOne({
      $or: [
        { 'platforms.instagram.userId': ig.instagramId },
        { 'platforms.instagram.username': ig.username },
      ]
    });

    if (existing) {
      await accounts.updateOne(
        { _id: existing._id },
        {
          $set: {
            'platforms.instagram.accessToken': ig.pageToken,
            'platforms.instagram.userId': ig.instagramId,
            'platforms.instagram.username': ig.username,
            'platforms.instagram.connected': true,
            'platforms.instagram.connectedAt': new Date(),
            updatedAt: new Date(),
          }
        }
      );
      console.log(`   Updated: ${existing.id} (@${ig.username})`);
    } else {
      console.log(`   Skipped: @${ig.username} (no matching account in DB)`);
    }
  }

  await client.close();

  console.log('\n   Done! Tokens refreshed.\n');
}

main().catch(console.error);
