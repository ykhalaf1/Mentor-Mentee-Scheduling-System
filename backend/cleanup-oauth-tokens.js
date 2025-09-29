const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateOAuthTokens() {
  try {
    console.log('Starting OAuth token migration...');
    
    // Get all OAuth tokens from the old collection
    const oauthTokensSnapshot = await db.collection('oauthTokens').get();
    
    if (oauthTokensSnapshot.empty) {
      console.log('No OAuth tokens found to migrate.');
      return;
    }
    
    console.log(`Found ${oauthTokensSnapshot.size} OAuth tokens to migrate.`);
    
    // Migrate each token to the corresponding user document
    for (const doc of oauthTokensSnapshot.docs) {
      const userId = doc.id;
      const tokenData = doc.data();
      
      try {
        // Check if user exists in mentees
        const userDoc = await db.collection('mentees').doc(userId).get();
        
        if (userDoc.exists) {
          // Update user document with OAuth tokens
          await db.collection('mentees').doc(userId).update({
            googleOAuth: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              scope: tokenData.scope,
              token_type: tokenData.token_type,
              expiry_date: tokenData.expiry_date,
              updatedAt: tokenData.updatedAt || new Date()
            }
          });
          
          console.log(`✅ Migrated OAuth tokens for user: ${userId}`);
          
          // Delete the old token document
          await db.collection('oauthTokens').doc(userId).delete();
          console.log(`🗑️ Deleted old OAuth token for user: ${userId}`);
        } else {
          console.log(`⚠️ User ${userId} not found in mentees, skipping migration`);
        }
      } catch (error) {
        console.error(`❌ Error migrating tokens for user ${userId}:`, error);
      }
    }
    
    console.log('OAuth token migration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateOAuthTokens().then(() => {
  console.log('Migration script finished.');
  process.exit(0);
}).catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});
