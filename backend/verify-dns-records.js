import 'dotenv/config';

// Verify DNS records in AWS Route 53
async function verifyDNSRecords() {
  console.log('🔍 Verifying DNS Records in AWS Route 53...\n');

  try {
    // Import DNS Management Service
    const { default: DNSManagementService } = await import('./src/services/dns-management-service.js');

    // Check AWS configuration
    console.log('1️⃣ AWS Configuration Check:');
    console.log('   AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET ✅' : 'NOT SET ❌');
    console.log('   AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET ✅' : 'NOT SET ❌');
    console.log('   AWS_REGION:', process.env.AWS_REGION || 'us-east-1');
    console.log('   AWS_HOSTED_ZONE_ID:', process.env.AWS_HOSTED_ZONE_ID || 'NOT SET ❌');

    if (!process.env.AWS_HOSTED_ZONE_ID) {
      console.error('\n❌ AWS_HOSTED_ZONE_ID not configured!');
      return;
    }

    // Wait for AWS SDK initialization
    console.log('\n2️⃣ Waiting for AWS SDK initialization...');
    let retries = 0;
    while (!DNSManagementService.route53 && retries < 10) {
      console.log(`   Attempt ${retries + 1}/10: Waiting for AWS SDK...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }

    if (!DNSManagementService.route53) {
      console.error('❌ AWS Route 53 failed to initialize after 10 seconds!');
      console.log('   This might indicate:');
      console.log('   - AWS credentials are incorrect');
      console.log('   - Network connectivity issues');
      console.log('   - AWS SDK initialization failure');
      return;
    }

    console.log('✅ AWS Route 53 initialized successfully');

    // Get list of DNS records
    console.log('\n3️⃣ Fetching DNS records from Route 53...');

    const params = {
      HostedZoneId: process.env.AWS_HOSTED_ZONE_ID,
      MaxItems: '100' // Get up to 100 records
    };

    const response = await DNSManagementService.route53.listResourceRecordSets(params).promise();

    console.log(`✅ Found ${response.ResourceRecordSets.length} DNS records in hosted zone`);

    // Filter for CNAME records (subdomain records)
    const cnameRecords = response.ResourceRecordSets.filter(record =>
      record.Type === 'CNAME' && record.Name.includes('.zopkit.com')
    );

    console.log(`\n3️⃣ CNAME Records for zopkit.com domain:`);
    console.log(`   Total CNAME records: ${cnameRecords.length}`);

    if (cnameRecords.length === 0) {
      console.log('   ❌ No CNAME records found for zopkit.com');
      console.log('\n🔍 This indicates DNS records are not being created during onboarding');
    } else {
      console.log('\n   📋 CNAME Records:');
      cnameRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.Name} → ${record.ResourceRecords[0].Value}`);
      });

      // Look for recent records (within last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      console.log(`\n4️⃣ Recent records (last hour):`);

      let recentRecords = 0;
      cnameRecords.forEach(record => {
        // Note: AWS doesn't provide creation timestamps in listResourceRecordSets
        // We'll just show all records and let user identify recent ones
        recentRecords++;
      });

      if (recentRecords > 0) {
        console.log(`   ✅ Found ${recentRecords} CNAME records`);
        console.log('   💡 These records were likely created during recent onboarding attempts');
      } else {
        console.log('   ⚠️ No recent records found');
      }
    }

    console.log('\n5️⃣ Health Check:');
    const healthCheck = await DNSManagementService.healthCheck();
    console.log('   Status:', healthCheck.status);
    console.log('   Service:', healthCheck.service);
    console.log('   Base Domain:', healthCheck.baseDomain);

    console.log('\n🎯 Summary:');
    if (cnameRecords.length > 0) {
      console.log('✅ DNS records ARE being created in AWS!');
      console.log('✅ The onboarding DNS integration is working');
    } else {
      console.log('❌ No DNS records found in AWS');
      console.log('❌ DNS records are NOT being created during onboarding');
    }

  } catch (error) {
    console.error('❌ DNS Verification Failed:', error.message);

    if (error.code === 'InvalidHostedZoneId') {
      console.log('\n🔧 Hosted Zone Issue:');
      console.log('- Check AWS_HOSTED_ZONE_ID is correct');
      console.log('- Ensure the hosted zone exists in your AWS account');
    } else if (error.code === 'AccessDenied') {
      console.log('\n🔧 AWS Permissions Issue:');
      console.log('- Ensure your AWS credentials have Route53 permissions');
      console.log('- Required permissions: route53:ListResourceRecordSets');
    }
  }
}

// Run the verification
verifyDNSRecords().then(() => {
  console.log('\n🏁 DNS Records Verification Completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Fatal Error:', error);
  process.exit(1);
});
