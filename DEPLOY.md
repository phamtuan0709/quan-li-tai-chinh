# 🚀 Hướng dẫn Deploy lên Vercel

## Bước 1: Push code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit - Expense Tracker with AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```

## Bước 2: Deploy trên Vercel

1. Truy cập https://vercel.com/new
2. Click **Import Git Repository**
3. Chọn repository vừa push
4. Configure project:
   - Framework Preset: **Next.js** (tự detect)
   - Build Command: Để mặc định
   - Output Directory: Để mặc định

## Bước 3: Thêm Environment Variables

Trong Vercel Dashboard > Settings > Environment Variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
NEXTAUTH_URL=https://YOUR_DOMAIN.vercel.app
NEXTAUTH_SECRET=<random-string-min-32-chars>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-secret>
ALLOWED_EMAIL=your-email@gmail.com
GROQ_API_KEY=<groq-api-key>
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=<gmail-app-password>
```

### Lấy NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## Bước 4: Setup PostgreSQL Database

### Option 1: Vercel Postgres (Khuyên dùng)
1. Vercel Dashboard > Storage > Create Database
2. Chọn **Postgres**
3. Copy `DATABASE_URL` vào Environment Variables

### Option 2: Supabase (Free tier tốt)
1. https://supabase.com > New Project
2. Settings > Database > Connection string
3. Copy `DATABASE_URL`

## Bước 5: Cấu hình Google OAuth

1. https://console.cloud.google.com/apis/credentials
2. Chọn OAuth Client ID đã tạo
3. Thêm **Authorized redirect URIs**:
   ```
   https://YOUR_DOMAIN.vercel.app/api/auth/callback/google
   ```

## Bước 6: Deploy!

1. Vercel tự động detect và deploy
2. Chờ build complete (~2-3 phút)
3. Click vào URL để xem app!

## Bước 7: Chạy Migration (Important!)

Sau khi deploy lần đầu:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Run migration
vercel env pull .env.production
npx prisma migrate deploy
```

Hoặc thêm script trong Vercel:
- Settings > General > **Build Command**:
  ```
  prisma generate && prisma migrate deploy && next build
  ```

## ⚠️ Lưu ý quan trọng

### 1. Database
- ❌ SQLite không hoạt động trên Vercel
- ✅ Dùng PostgreSQL (Vercel Postgres hoặc Supabase)

### 2. Environment Variables
- Thêm FULL tất cả biến trong `.env.example`
- `NEXTAUTH_URL` phải là domain Vercel: `https://*.vercel.app`

### 3. Gmail Sync
- Auto-sync mỗi 5 phút chỉ hoạt động khi trang được mở
- Vercel Serverless Functions có timeout 10s (free tier)
- Nếu sync lâu, cân nhắc tăng timeout (Pro plan)

### 4. Cold Start
- Free tier có thể bị cold start (~2-3s)
- Trang đầu tiên load chậm là bình thường

## 🔧 Troubleshooting

### Build Failed: "Module not found"
```bash
# Xóa node_modules và reinstall
rm -rf node_modules package-lock.json
npm install
git add .
git commit -m "Fix dependencies"
git push
```

### Database Connection Error
- Check `DATABASE_URL` có đúng format PostgreSQL
- Test connection: `npx prisma db pull`

### OAuth Error
- Check Authorized redirect URIs có đúng domain Vercel
- NEXTAUTH_URL phải match domain

## 🎉 Done!

App của bạn đã live tại: `https://YOUR_PROJECT.vercel.app`

### Custom Domain (Optional)
1. Vercel Dashboard > Settings > Domains
2. Add domain
3. Update DNS records theo hướng dẫn
