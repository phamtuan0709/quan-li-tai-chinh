# 💰 Quản Lý Chi Tiêu - Personal Expense Tracker

Ứng dụng web cá nhân quản lý chi tiêu, tự động parse email từ BIDV và tích hợp AI (Gemini) để phân tích chi tiêu.

## ✨ Tính năng

- 📧 **Parse Email BIDV** - Upload file .eml để tự động trích xuất giao dịch
- 🤖 **AI Phân loại** - Tự động phân loại chi tiêu theo danh mục
- 📊 **Dashboard** - Biểu đồ trực quan: Pie, Bar, Line, Area charts
- 💬 **AI Chat** - Hỏi đáp về chi tiêu với Gemini AI
- 🔮 **Dự đoán** - Dự báo chi tiêu tháng tới
- 💡 **Lời khuyên** - Gợi ý tiết kiệm thông minh
- 🔒 **Bảo mật** - Chỉ cho phép 1 email đăng nhập

## 🚀 Cài đặt

### 1. Cài dependencies

```bash
npm install
```

### 2. Thiết lập environment variables

Copy `.env.example` sang `.env.local` và điền các giá trị:

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth - Lấy từ https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Email được phép đăng nhập (CHỈ email này)
ALLOWED_EMAIL="your-email@gmail.com"

# Gemini API - Lấy từ https://aistudio.google.com/apikey
GEMINI_API_KEY="your-api-key"
```

### 3. Tạo database

```bash
npx prisma db push
```

### 4. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

## 🔐 Thiết lập Google OAuth

1. Vào [Google Cloud Console](https://console.cloud.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Chọn **Web application**
6. Thêm Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
7. Copy **Client ID** và **Client Secret** vào `.env.local`

## 📧 Cách lấy email .eml từ Gmail

1. Mở Gmail và tìm email thông báo giao dịch từ BIDV
2. Click menu ⋮ (3 chấm) ở góc phải email
3. Chọn **Download message** để tải file .eml
4. Upload file vào trang **/upload** của ứng dụng

## 🗂 Cấu trúc thư mục

```
src/
├── app/
│   ├── api/           # API routes
│   ├── login/         # Trang đăng nhập
│   ├── upload/        # Upload email
│   ├── transactions/  # Danh sách giao dịch
│   ├── analytics/     # Phân tích AI
│   └── chat/          # Chat với AI
├── components/
│   ├── charts/        # Biểu đồ (Pie, Bar, Line, Area)
│   └── layout/        # Sidebar, Header
└── lib/
    ├── auth.ts        # NextAuth config
    ├── prisma.ts      # Database client
    ├── gemini.ts      # AI functions
    └── email-parser.ts # BIDV email parser
```

## 🚀 Deploy lên Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Nhớ set environment variables trên Railway dashboard!

## 📝 License

MIT
