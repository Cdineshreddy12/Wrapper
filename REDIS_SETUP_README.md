# 🚀 Redis Setup for Application-Specific Sync System

## Overview

Your application-specific sync system uses Redis for real-time pub/sub messaging between your wrapper and client applications. This guide will help you set up Redis and see your data flowing in real-time.

## Prerequisites

You need a Redis instance. Choose one of the following options:

### Option 1: Redis Cloud (Recommended)
- **RedisLabs (Redis Cloud)**: Free tier available
- **AWS ElastiCache**: Managed Redis service
- **Google Cloud Memorystore**: Managed Redis service
- **Azure Cache for Redis**: Managed Redis service

### Option 2: Local Redis (For Testing)
```bash
# macOS
brew install redis
redis-server

# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server
```

## Configuration

### Step 1: Set Redis URL

You need to set the `REDIS_URL` environment variable with your Redis connection details.

#### For Redis Cloud:
```bash
export REDIS_URL="redis://username:password@your-redis-host:port"
```

#### For AWS ElastiCache:
```bash
export REDIS_URL="redis://username:password@your-cluster.region.cache.amazonaws.com:6379"
```

#### For Local Redis:
```bash
export REDIS_URL="redis://localhost:6379"
```

### Step 2: Create .env file

Create a `.env` file in the `backend` directory:

```bash
cd backend
echo "REDIS_URL=redis://username:password@your-redis-host:port" > .env
```

### Step 3: Test Connection

Run the connection test script:

```bash
cd backend
node src/scripts/test-redis-connection.js
```

You should see:
```
🔌 Testing Redis Connection...
🔴 Health Check: {
  "status": "healthy",
  "message": "Redis is reachable"
}
✅ Redis connection successful!
✅ SET/GET operations working
✅ INCR operations working
✅ Publishing test completed
✅ Subscribed successfully
```

## Using Redis Insight

### Step 4: Install Redis Insight

1. Download from: https://redis.com/redis-enterprise/redis-insight/
2. Install and open Redis Insight
3. Click "Add Redis Database"
4. Enter your Redis connection details

### Step 5: View Your Data

In Redis Insight, you should see data flowing in these channels:

```
📡 Application-Specific Channels:
   • crm:b0a6e370-c1e5-43d1-94e0-55ed792274c4:credit-configs
   • crm:b0a6e370-c1e5-43d1-94e0-55ed792274c4:roles
   • crm:b0a6e370-c1e5-43d1-94e0-55ed792274c4:users
   • crm:b0a6e370-c1e5-43d1-94e0-55ed792274c4:hierarchy
   • hrms:b0a6e370-c1e5-43d1-94e0-55ed792274c4:roles
   • hrms:b0a6e370-c1e5-43d1-94e0-55ed792274c4:users
   • finance:b0a6e370-c1e5-43d1-94e0-55ed792274c4:roles
```

## Running the Demo

### Step 6: Run the Live Demo

```bash
cd backend

# Option 1: Test connection and publish data
node src/scripts/test-redis-connection.js

# Option 2: Publish your real tenant data to Redis
node src/scripts/publish-real-data-to-redis.js

# Option 3: Listen for real-time messages
node src/scripts/redis-consumer-listener.js

# Option 4: Full live demo
node src/scripts/live-sync-demo.js
```

### Step 7: See Data in Redis Insight

1. In Redis Insight, select your database
2. Click on "Browser" tab
3. Look for the channels listed above
4. Click on a channel to see the messages
5. You should see JSON data flowing in real-time!

## Troubleshooting

### "Redis connection failed"

1. Check your `REDIS_URL` environment variable
2. Verify your cloud Redis allows connections from your IP
3. Make sure your Redis instance is running
4. Check firewall settings

### "No data in Redis Insight"

1. Run the publisher script: `node src/scripts/publish-real-data-to-redis.js`
2. Check that messages are being published
3. Verify the channel names match
4. Make sure Redis Insight is connected to the same Redis instance

### "Connection timeout"

1. Check network connectivity to your Redis host
2. Verify the port is open (6379 for non-SSL, 6380 for SSL)
3. For cloud Redis, check if you need to allow your IP address

## Quick Start Script

Run the setup script:

```bash
chmod +x setup-redis.sh
./setup-redis.sh
```

This will guide you through the setup process and test your connection.

## Your Data Flow

```
🏢 Wrapper Database → 📡 Redis Channels → 🎯 Applications
     │                       │                    │
     ▼                       ▼                    ▼
• Credit Configs        • crm:123:credit-configs   • CRM App
• User Profiles         • crm:123:users           • CRM & HRMS
• Role Permissions      • crm:123:roles           • All Apps
• Hierarchy Data        • crm:123:hierarchy      • All Apps
```

Each application receives **only the data it needs** with **perfect isolation**.

## Support

If you're still having issues:

1. Check the Redis connection test script output
2. Verify your environment variables
3. Make sure your cloud Redis is properly configured
4. Check Redis Insight connection settings

Your application-specific sync system is ready to go live! 🚀
