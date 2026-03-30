# ⚡ Quick Start Guide

Get your Apnidukan backend running in **5 minutes**!

---

## 📝 Prerequisites

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **MongoDB** ([Local installation](https://www.mongodb.com/try/download/community) or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Git** (to clone repository)

---

## 🚀 Installation Steps

### 1️⃣ Clone & Install

```bash
# Clone repository
git clone <your-repo-url>
cd backend

# Install dependencies
npm install
```

### 2️⃣ Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your values
# Minimum required:
#   - MONGO_URI
#   - JWT_SECRET
#   - JWT_REFRESH_SECRET
```

**Quick .env setup:**

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/apnidukan
JWT_SECRET=your_super_secret_jwt_key_minimum_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_chars
CLIENT_URL=http://localhost:5173
```

💡 **Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3️⃣ Start MongoDB

**Option A: Local MongoDB**
```bash
# macOS/Linux
sudo systemctl start mongod

# Windows
net start MongoDB

# Check if running
mongo --eval "db.version()"
```

**Option B: MongoDB Atlas (Free Cloud)**
1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster (M0)
3. Get connection string
4. Update `MONGO_URI` in `.env`

### 4️⃣ Seed Database (Optional)

```bash
# Populate with sample data
npm run seed
```

**Sample credentials after seeding:**
- Admin: `admin@apnidukan.com` / `admin123`
- Business Owner: `raj@example.com` / `password123`

### 5️⃣ Start Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

**Server will start on:** `http://localhost:5000`

---

## ✅ Verify Installation

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Expected response:
# { "success": true, "message": "Server is running" }
```

---

## 🧪 Testing API Endpoints

### Using cURL

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get all businesses (public)
curl http://localhost:5000/api/business
```

### Using Postman

1. Import `Postman_Collection.json` from the backend folder
2. Set `baseUrl` variable to `http://localhost:5000/api`
3. Run "Login User" request first
4. Access token will be automatically saved for other requests

---

## 📁 Project Structure

```
backend/
├── server.js              # Entry point
├── package.json           # Dependencies
├── .env                   # Environment variables (create this)
├── .env.example           # Environment template
├── ecosystem.config.js    # PM2 configuration
├── models/                # MongoDB models
│   ├── User.js
│   ├── Business.js
│   ├── Listing.js
│   └── ...
├── controllers/           # Business logic
│   ├── authController.js
│   ├── businessController.js
│   └── ...
├── routes/                # API routes
│   ├── authRoutes.js
│   ├── businessRoutes.js
│   └── ...
├── middleware/            # Express middleware
│   ├── auth.js
│   └── errorHandler.js
├── config/                # Configuration
│   └── database.js
└── scripts/               # Utility scripts
    └── seed.js
```

---

## 🎯 Common Tasks

### Create Admin User (Without Seed)

```javascript
// Run in MongoDB shell or Atlas
use apnidukan

db.users.insertOne({
  name: "Admin User",
  email: "admin@example.com",
  password: "$2a$10$hashed_password_here",
  role: "admin",
  isActive: true,
  createdAt: new Date()
})
```

### Reset Database

```bash
# MongoDB local
mongo apnidukan --eval "db.dropDatabase()"

# Then re-seed
npm run seed
```

### Check Logs

```bash
# Development logs (console)
npm run dev

# Production logs (file)
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log
```

### Stop Server

```bash
# Development (Ctrl+C)

# Production with PM2
pm2 stop apnidukan-backend
```

---

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=5001
```

### MongoDB Connection Failed

```bash
# Check MongoDB is running
sudo systemctl status mongod

# Check connection string in .env
# Format: mongodb://localhost:27017/apnidukan
# Or Atlas format: mongodb+srv://user:pass@cluster.mongodb.net/dbname
```

### JWT Secret Error

```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env
JWT_SECRET=<generated_secret>
JWT_REFRESH_SECRET=<another_generated_secret>
```

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Next Steps

1. **Read API Documentation:** [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
2. **Deploy to Production:** [DEPLOYMENT.md](DEPLOYMENT.md)
3. **Connect Frontend:** Update frontend API endpoints
4. **Setup Cloudinary:** For image uploads
5. **Configure Payments:** Razorpay integration

---

## 🆘 Need Help?

- **Backend Issues:** Check logs in `logs/` directory
- **API Testing:** Use Postman collection
- **Database Issues:** Check MongoDB connection
- **Documentation:** See [README.md](README.md)

---

**🎉 You're ready to build!**

Start creating businesses, listings, and testing your multi-tenant SaaS platform.
