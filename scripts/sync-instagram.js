/**
 * Sync Instagram posts and insights for an account
 *
 * Usage: node scripts/sync-instagram.js [accountId]
 * Default: thomas-musial
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const accountId = process.argv[2] || 'thomas-musial';

async function sync() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('strategy');

  const account = await db.collection('accounts').findOne({ id: accountId });
  const ig = account?.platforms?.instagram;

  if (!ig?.accessToken || !ig?.userId) {
    console.log('❌ Missing Instagram credentials for', accountId);
    await client.close();
    return;
  }

  console.log('Testing Instagram API connection...');

  // Test connection
  const testRes = await fetch(
    `https://graph.facebook.com/${ig.userId}?fields=id,username&access_token=${ig.accessToken}`
  );
  const testData = await testRes.json();

  if (testData.error) {
    console.log('❌ Connection failed:', testData.error.message);
    await client.close();
    return;
  }

  console.log('✓ Connected as @' + testData.username);
  console.log('');
  console.log('Fetching latest posts with insights...');

  // Fetch posts
  const postsRes = await fetch(
    `https://graph.facebook.com/${ig.userId}/media?fields=id,caption,media_type,media_product_type,thumbnail_url,media_url,timestamp,like_count,comments_count&access_token=${ig.accessToken}&limit=25`
  );
  const postsData = await postsRes.json();

  if (postsData.error) {
    console.log('❌ Failed to fetch posts:', postsData.error.message);
    await client.close();
    return;
  }

  const posts = postsData.data || [];
  console.log(`Found ${posts.length} posts`);

  // Fetch insights for each post
  let updated = 0;
  for (const post of posts) {
    const isReel = post.media_product_type === 'REELS';
    const metrics = isReel
      ? 'reach,plays,likes,comments,shares,saved'
      : 'impressions,reach,saved';

    try {
      const insightsRes = await fetch(
        `https://graph.facebook.com/${post.id}/insights?metric=${metrics}&access_token=${ig.accessToken}`
      );
      const insightsData = await insightsRes.json();

      const metricsMap = {};
      if (Array.isArray(insightsData.data)) {
        insightsData.data.forEach(m => {
          metricsMap[m.name] = m.values?.[0]?.value ?? 0;
        });
      }

      const likes = isReel ? (metricsMap.likes ?? 0) : (post.like_count ?? 0);
      const comments = isReel ? (metricsMap.comments ?? 0) : (post.comments_count ?? 0);
      const shares = metricsMap.shares ?? 0;
      const saves = metricsMap.saved ?? 0;
      const reach = metricsMap.reach ?? 0;
      const impressions = metricsMap.impressions ?? metricsMap.plays ?? 0;
      const videoViews = metricsMap.plays ?? 0;

      // Upsert post
      await db.collection('posts').updateOne(
        { instagramId: post.id, accountId },
        {
          $set: {
            instagramId: post.id,
            accountId,
            caption: post.caption || '',
            mediaType: post.media_type,
            mediaUrl: post.media_url,
            thumbnailUrl: post.thumbnail_url || post.media_url,
            permalink: `https://www.instagram.com/p/${post.id}/`,
            postedAt: new Date(post.timestamp),
            metrics: {
              likes,
              comments,
              shares,
              saves,
              reach,
              impressions,
              engagement: likes + comments + shares,
              videoViews,
            },
            syncedAt: new Date(),
            updatedAt: new Date(),
          }
        },
        { upsert: true }
      );

      updated++;
      const caption = post.caption?.slice(0, 40) || 'No caption';
      console.log(`  ✓ ${caption}... (reach: ${reach})`);
    } catch (e) {
      console.log(`  ✗ Failed: ${post.id} - ${e.message}`);
    }
  }

  console.log('');
  console.log(`Synced ${updated} posts with fresh insights`);

  // Calculate new totals
  const allPosts = await db.collection('posts').find({ accountId }).toArray();
  const totalReach = allPosts.reduce((sum, p) => sum + (p.metrics?.reach || 0), 0);
  const totalViews = allPosts.reduce((sum, p) => sum + (p.metrics?.videoViews || 0), 0);
  const totalEngagement = allPosts.reduce((sum, p) => sum + (p.metrics?.engagement || 0), 0);

  console.log('');
  console.log('=== Updated Totals ===');
  console.log(`Posts: ${allPosts.length}`);
  console.log(`Total Reach: ${totalReach.toLocaleString()}`);
  console.log(`Total Video Views: ${totalViews.toLocaleString()}`);
  console.log(`Total Engagement: ${totalEngagement.toLocaleString()}`);

  await client.close();
}

sync().catch(console.error);
