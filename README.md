# Kivy Seller Verification Platform

Hệ thống quản lý và xác thực danh tính người bán (Seller Identity Verification Pipeline) được xây dựng bằng NestJS, Prisma, và Supabase (PostgreSQL). Hệ thống tích hợp Message Queue (BullMQ) để kiểm soát rate limit và xử lý tải cao trong quá trình onboarding.

---

## 🚀 Hướng dẫn khởi chạy nhanh ở Local (Quick Start)

Dự án sử dụng **Supabase Local (chạy Docker)** kết hợp với **Prisma** để phát triển offline một cách đồng bộ và an toàn.

### Yêu cầu hệ thống (Prerequisites)
- **Node.js** v20 trở lên
- **pnpm** v9+ (hoặc npm/yarn)
- **Docker** và Docker Compose (để khởi chạy Supabase local)

### Các bước cài đặt:

1. **Cài đặt thư viện**:
   ```bash
   cd backend
   pnpm install
   ```
   *(Lệnh này sẽ tự động sinh Prisma Client sau khi cài đặt hoàn tất).*

2. **Dựng môi trường Database Local**:
   Đảm bảo Docker của bạn đã được bật, chạy lệnh sau trong thư mục `backend/` để khởi động Docker Supabase và tự động đồng bộ cấu trúc bảng:
   ```bash
   pnpm run db:setup
   ```

3. **Cấu hình biến môi trường**:
   Copy file cấu hình mẫu và sử dụng thông tin kết nối local:
   ```bash
   cp .env.example .env
   ```
   Mở file `.env` và uncomment dòng kết nối database local (hoặc điền thông tin Supabase Online của bạn):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
   ```

4. **Khởi động NestJS ở chế độ phát triển (Watch Mode)**:
   ```bash
   pnpm run start:dev
   ```

---

## 🛠️ Các lệnh CLI tiện ích (Database & Prisma CLI)

Các lệnh này được cấu hình sẵn trong file [package.json](file:///home/verno/Desktop/Projects/personal/learn/kivy/backend/package.json) để hỗ trợ quy trình phát triển và làm việc nhóm:

| Lệnh chạy (`pnpm run <tên>`) | Mô tả chức năng |
| :--- | :--- |
| `start:dev` | Khởi chạy server NestJS, tự động chạy `prisma migrate dev` trước để cập nhật DB local. |
| `db:setup` | Lệnh cài đặt nhanh: khởi động Docker Supabase local và chạy migrate tạo bảng. |
| `db:migrate` | So sánh file schema, sinh ra file SQL migration mới và cập nhật cấu hình DB. |
| `db:deploy` | **Lệnh dùng cho Production/CI-CD**. Cập nhật DB an toàn mà không reset hay xóa dữ liệu. |
| `db:studio` | Mở giao diện Prisma Studio quản trị dữ liệu trực quan tại địa chỉ `http://localhost:5555`. |
| `db:generate` | Sinh lại Prisma Client thủ công khi cập nhật schema. |

---

## 🌐 Quy trình Deploy lên Production (Render / VPS)

### 1. Trên Render
Khi tạo một **Web Service** trên Render, hãy cấu hình các thông số sau:
*   **Root Directory**: `backend`
*   **Build Command**: `pnpm install && pnpm run build`
*   **Start Command**: `pnpm run db:deploy && pnpm run start:prod`
*   **Environment Variables**: Khai báo `DATABASE_URL` trỏ tới dự án Supabase Online thật của bạn (nên sử dụng cổng Pooling `6543` kèm tham số `?pgbouncer=true`).

### 2. Trên VPS với Docker
Sử dụng file [Dockerfile](file:///home/verno/Desktop/Projects/personal/learn/kivy/backend/Dockerfile) đa tầng (multi-stage) trong dự án để đóng gói ứng dụng. Trước khi khởi động server, container sẽ tự động chạy lệnh cập nhật database:
```bash
CMD npx prisma migrate deploy && node dist/main.js
```

---

> [!IMPORTANT]
> **Quy ước làm việc nhóm (DX):**
> Khi bạn thay đổi cấu trúc bảng trong file [schema.prisma](file:///home/verno/Desktop/Projects/personal/learn/kivy/backend/prisma/schema.prisma), hãy chạy `pnpm run db:migrate` để sinh file SQL migration, sau đó commit cả file schema và thư mục `prisma/migrations` lên Git. Đồng đội của bạn khi pull code về chỉ cần chạy lệnh `pnpm run start:dev` là database local của họ sẽ tự động được cập nhật.
