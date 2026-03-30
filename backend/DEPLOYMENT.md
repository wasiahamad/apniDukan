# 🚀 Deployment Guide - Apnidukan Backend

Complete guide for deploying the multi-tenant SaaS backend to production.

---

## 📋 Table of Contents

1. [Pre-deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [MongoDB Setup](#mongodb-setup)
4. [Deployment Options](#deployment-options)
   - [AWS EC2](#option-1-aws-ec2)
   - [DigitalOcean](#option-2-digitalocean)
   - [Heroku](#option-3-heroku)
   - [Railway / Render](#option-4-railway--render)
5. [Docker Deployment](#docker-deployment)
6. [Process Management](#process-management)
7. [Nginx Configuration](#nginx-configuration)
8. [SSL Setup](#ssl-setup)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Monitoring & Logging](#monitoring--logging)

---

## ✅ Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] MongoDB database ready (local or Atlas)
- [ ] JWT secrets generated (strong random strings)
- [ ] Cloudinary account setup (for image uploads)
- [ ] Domain purchased and DNS configured
- [ ] SSL certificate ready or Let's Encrypt planned
- [ ] Backup strategy defined
- [ ] Monitoring tools selected

---

## 🔐 Environment Setup

### Production Environment Variables

Create `.env.production`:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/apnidukan?retryWrites=true&w=majority

# JWT (Generate strong secrets)
JWT_SECRET=<your-256-bit-secret-key>
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=<your-256-bit-refresh-secret>
JWT_REFRESH_EXPIRE=30d

# CORS (Your frontend domain)
CLIENT_URL=https://apnidukan.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment Gateway (Optional)
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=xxxx

# SMS/WhatsApp (Optional)
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### Generate Strong Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate refresh token secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🗄 MongoDB Setup

### Option A: MongoDB Atlas (Recommended)

1. **Create Account:** [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

2. **Create Cluster:**
   - Choose M0 (Free) or M10+ (Production)
   - Select region closest to your server
   - Click "Create Cluster"

3. **Configure Security:**
   ```
   Database Access → Add Database User
   - Username: apnidukan_user
   - Password: <strong-password>
   - Role: Read and write to any database

   Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Or add specific server IP
   ```

4. **Get Connection String:**
   ```
   Connect → Connect your application
   Copy connection string:
   mongodb+srv://apnidukan_user:<password>@cluster.mongodb.net/apnidukan
   ```

### Option B: Self-hosted MongoDB

```bash
# Install MongoDB (Ubuntu)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Secure MongoDB
mongo
> use admin
> db.createUser({
  user: "apnidukan_admin",
  pwd: "strong_password",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})
```

**Connection String:**
```
mongodb://apnidukan_admin:strong_password@localhost:27017/apnidukan?authSource=admin
```

---

## 🌐 Deployment Options

### Option 1: AWS EC2

#### Step 1: Launch EC2 Instance

```bash
# Choose: Ubuntu 22.04 LTS
# Instance Type: t2.small or t2.medium
# Security Group:
#   - Port 22 (SSH)
#   - Port 80 (HTTP)
#   - Port 443 (HTTPS)
#   - Port 5000 (Node.js - temporary)
```

#### Step 2: Connect and Setup

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Git
sudo apt install git -y

# Clone repository
git clone https://github.com/your-username/apnidukan.git
cd apnidukan/backend

# Install dependencies
npm install --production

# Setup environment
cp .env.example .env
nano .env  # Add production values

# Seed database (optional)
npm run seed
```

#### Step 3: Test Run

```bash
# Test server
npm start

# Test from another terminal
curl http://localhost:5000/api/health
```

---

### Option 2: DigitalOcean

#### Step 1: Create Droplet

```
- Choose: Ubuntu 22.04
- Plan: Basic ($6/month - 1GB RAM)
- Add SSH key
- Create Droplet
```

#### Step 2: Setup (same as AWS)

Follow AWS Step 2 commands.

---

### Option 3: Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create apnidukan-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGO_URI="mongodb+srv://..."
heroku config:set JWT_SECRET="..."
heroku config:set CLIENT_URL="https://apnidukan.com"

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

**Heroku Procfile:**
```
web: node server.js
```

---

### Option 4: Railway / Render

#### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Set environment variables via Railway dashboard
```

#### Render

1. Go to [render.com](https://render.com)
2. Connect GitHub repository
3. Create Web Service
4. Set environment variables in dashboard
5. Deploy automatically on push

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/apnidukan
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password123
    restart: unless-stopped

volumes:
  mongo-data:
```

### Deploy with Docker

```bash
# Build image
docker build -t apnidukan-backend .

# Run container
docker run -d \
  --name apnidukan \
  -p 5000:5000 \
  --env-file .env.production \
  apnidukan-backend

# Or use docker-compose
docker-compose up -d

# Check logs
docker logs -f apnidukan
```

---

## ⚙️ Process Management

### Option A: PM2 (Recommended)

```bash
# Install PM2
sudo npm install -g pm2

# Create ecosystem file
pm2 ecosystem

# Edit ecosystem.config.js
module.exports = {
  apps: [{
    name: 'apnidukan-backend',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
}

# Start application
pm2 start ecosystem.config.js

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart
pm2 restart apnidukan-backend

# Stop
pm2 stop apnidukan-backend
```

### Option B: Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/apnidukan.service
```

**apnidukan.service:**

```ini
[Unit]
Description=Apnidukan Backend API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/apnidukan/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=apnidukan
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Commands:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start apnidukan

# Enable on boot
sudo systemctl enable apnidukan

# Check status
sudo systemctl status apnidukan

# View logs
sudo journalctl -u apnidukan -f
```

---

## 🔧 Nginx Configuration

### Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/apnidukan
```

**Configuration:**

```nginx
server {
    listen 80;
    server_name api.apnidukan.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy settings
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://localhost:5000/api/health;
    }
}
```

**Enable site:**

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/apnidukan /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔒 SSL Setup

### Option A: Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d api.apnidukan.com

# Auto-renewal (configured by default)
sudo certbot renew --dry-run
```

### Option B: Custom SSL Certificate

```nginx
server {
    listen 443 ssl http2;
    server_name api.apnidukan.com;

    ssl_certificate /etc/ssl/certs/apnidukan.crt;
    ssl_certificate_key /etc/ssl/private/apnidukan.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of config
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.apnidukan.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: |
        cd backend
        npm ci --production

    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /home/ubuntu/apnidukan/backend
          git pull origin main
          npm install --production
          pm2 restart apnidukan-backend
```

**Add GitHub Secrets:**
- `SERVER_HOST`: Your server IP
- `SERVER_USER`: SSH username
- `SSH_PRIVATE_KEY`: Your private key

---

## 📊 Monitoring & Logging

### Setup Winston Logger (Already configured)

Logs are written to `logs/` directory.

### PM2 Monitoring

```bash
# Monitor in terminal
pm2 monit

# Web dashboard
pm2 install pm2-server-monit
```

### External Monitoring Services

**1. UptimeRobot (Free)**
```
- Add monitor: https://api.apnidukan.com/api/health
- Check interval: 5 minutes
```

**2. New Relic**
```bash
npm install newrelic --save
# Add newrelic.js config
node -r newrelic src/server.js
```

**3. Sentry (Error tracking)**
```bash
npm install @sentry/node
```

```javascript
// In server.js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });

// Or with command line
node -r newrelic server.js
```

---

## 🔄 Backup Strategy

### MongoDB Backup

```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"

mkdir -p $BACKUP_DIR

# Backup
mongodump --uri="mongodb+srv://..." --out=$BACKUP_DIR/backup_$DATE

# Compress
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

**Schedule with Cron:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/backup.sh
```

---

## ✅ Post-Deployment Checklist

- [ ] Server responding on domain
- [ ] SSL certificate active
- [ ] Database connection working
- [ ] API endpoints accessible
- [ ] Authentication working
- [ ] File uploads working (Cloudinary)
- [ ] Error logging configured
- [ ] Monitoring active
- [ ] Backups scheduled
- [ ] Documentation updated
- [ ] Team notified

---

## 🐛 Troubleshooting

### Server not starting

```bash
# Check logs
pm2 logs
# or
sudo journalctl -u apnidukan -f

# Check port
sudo lsof -i :5000

# Check process
ps aux | grep node
```

### MongoDB connection failed

```bash
# Test connection
mongo "mongodb+srv://..."

# Check firewall
sudo ufw status
sudo ufw allow 27017
```

### Nginx 502 Bad Gateway

```bash
# Check backend is running
curl http://localhost:5000/api/health

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

---

**🎉 Deployment Complete!**

Your backend is now live and ready to serve requests.

Next: Deploy your frontend applications and connect them to this API.
