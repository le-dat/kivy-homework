# AI Log - Kivy Seller Verification Platform

## 1. Các phần việc ủy quyền cho AI (Delegated Tasks)

| Tác vụ ủy quyền | Chi tiết thực hiện bởi AI | Lý do ủy quyền & Sự kiểm soát |
| :--- | :--- | :--- |
| **Boilerplate & DTOs** | Sinh các class DTO cho Swagger (`@ApiProperty`, `@ApiResponse`), schema Prisma. | Tác vụ lặp đi lặp lại. Lập trình viên kiểm duyệt lại kiểu dữ liệu để khớp với thiết kế cơ sở dữ liệu. |
| **UI Components** | Dựng khung giao diện Dashboard bằng Tailwind/CSS (Admin Panel, Seller Panel, Review Drawer). | Đẩy nhanh tốc độ CSS. Lập trình viên tinh chỉnh lại UX, responsive và các tương tác động. |
| **Mock Service** | Sinh cấu trúc khung cho Mock Service (chạy trên Hono API) giả lập dịch vụ xác thực. | Tiết kiệm thời gian dựng khung HTTP server cơ bản. Lập trình viên tự viết logic giả lập độ trễ và rate limit. |

---

## 2. Lỗi của AI và cách sửa (AI Mistakes & Fixes)

Tóm tắt nhanh mấy lỗi do AI tự chế/cấu hình sai và cách xử lý thực tế:

| Lỗi của AI | Kiểu lỗi | Phát hiện thế nào? | Sửa ra sao? | Bài học rút ra |
| :--- | :--- | :--- | :--- | :--- |
| **Race Condition** | Code Logic | Test gọi đồng thời cả webhook và admin duyệt. | Dùng Row Locking (`SELECT FOR UPDATE`) trong transaction. | Luôn khóa dòng (lock row) khi đổi trạng thái cuối của State Machine. |
| **Kẹt Migration trên Render** | Cấu hình Ops | Deploy lên Render bị treo cứng (timeout) lúc chạy migration. | Đổi câu lệnh deploy thành: `DATABASE_URL=$DIRECT_URL prisma migrate deploy`. | Prisma 7 bỏ `directUrl`. Muốn migrate qua PgBouncer phải ghi đè `DATABASE_URL` bằng cổng trực tiếp. |
| **Lệch thư mục build `dist`** | Biên dịch TS | Render báo lỗi `MODULE_NOT_FOUND` do không thấy file `dist/main.js`. | Thêm `prisma.config.ts` và `prisma/seed.ts` vào `exclude` của `tsconfig.build.json`. | File `.ts` nằm ngoài `src/` sẽ làm tsc hiểu sai `rootDir`, đẩy file build vào sâu trong `dist/src/main.js`. |

---

### Chi tiết lỗi & Code khắc phục

<details>
<summary><b>1. Race Condition khi đổi trạng thái (State Transition)</b></summary>

#### Tại sao lỗi?
Hàm `transition` cũ chỉ check trạng thái trên RAM rồi `update` DB luôn. Nếu 2 request cùng gọi một lúc, trạng thái cuối sẽ bị ghi đè đè lên nhau, phá hỏng logic bất biến.

#### Code lỗi (AI viết):
```typescript
async transition(verificationId: string, nextStatus: VerificationStatus) {
  const current = await this.prisma.verification.findUnique({ where: { id: verificationId } });
  if (!this.canTransition(current.status, nextStatus)) {
    throw new BadRequestException("Invalid transition");
  }
  return this.prisma.verification.update({
    where: { id: verificationId },
    data: { status: nextStatus }
  });
}
```

#### Code sửa (Lập trình viên viết lại):
```typescript
async transition(
  verificationId: string,
  nextStatus: VerificationStatus,
  actor: StateActor,
  reason: string,
) {
  return this.prisma.$transaction(async (tx) => {
    // Khóa dòng bằng SELECT FOR UPDATE để chặn Race Condition
    const rows = await tx.$queryRaw<any[]>`
      SELECT id, seller_id, status, reason
      FROM verifications
      WHERE id = ${verificationId}
      FOR UPDATE
    `;
    const row = rows[0];
    
    if (!row) throw new NotFoundException("Verification not found");
    if (!this.canTransition(row.status, nextStatus)) {
      throw new BadRequestException(`Cannot transition from ${row.status} to ${nextStatus}`);
    }
    
    return tx.verification.update({
      where: { id: verificationId },
      data: { status: nextStatus, reason, actor }
    });
  });
}
```
</details>

<details>
<summary><b>2. Treo tiến trình Migrate do cổng PgBouncer (Prisma 7)</b></summary>

#### Tại sao lỗi?
Khi deploy lên Render, migration mặc định chạy qua cổng pooler `6543` (Transaction Mode) của Supabase. Cổng này không hỗ trợ Advisory Locks (khóa tư vấn) nên Prisma Migrate bị treo cứng. Từ Prisma 7, `directUrl` trong schema bị khai tử nên không cấu hình tĩnh được nữa.

#### Lệnh lỗi (AI viết):
```json
"db:deploy": "prisma migrate deploy"
```

#### Cách sửa:
Ép lệnh deploy chạy qua cổng trực tiếp `5432` bằng cách ghi đè biến môi trường lúc chạy:
```json
"db:deploy": "DATABASE_URL=$DIRECT_URL prisma migrate deploy"
```
</details>

<details>
<summary><b>3. Lệch thư mục build dist/main do tsconfig rootDir</b></summary>

#### Tại sao lỗi?
Khi thêm file cấu hình `prisma.config.ts` ở thư mục gốc của backend, trình biên dịch TypeScript (`tsc`) tự mở rộng `rootDir` của dự án từ `src/` ra toàn bộ thư mục cha. Kết quả là file build bị đẩy vào sâu trong `dist/src/main.js` thay vì `dist/main.js`, làm Render không tìm thấy file khởi chạy.

#### Cấu hình lỗi (AI viết):
```json
"exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
```

#### Cách sửa:
Loại trừ các file cấu hình và seed nằm ngoài `src/` trong `tsconfig.build.json` để giữ nguyên `rootDir` là `src/`:
```json
"exclude": ["node_modules", "test", "dist", "**/*spec.ts", "prisma.config.ts", "prisma/seed.ts"]
```
</details>

---

## 3. Xác thực thủ công bởi lập trình viên (Developer Verifications)

| Nội dung xác thực | Cách thức thực hiện | Kết quả thực tế |
| :--- | :--- | :--- |
| **Rate Limiter & Worker** | Viết script gửi đồng thời 120 yêu cầu xác thực trong 1 phút lên hệ thống. | Hệ thống lưu trữ đúng 120 bản ghi ở trạng thái `PENDING`. Worker BullMQ điều phối gửi sang Mock Service ổn định ở mức ~80 requests/phút (không vượt quá giới hạn 100/phút). |
| **Tính bất biến của State Machine** | Truy cập database qua Prisma Studio, cố tình giả lập API chuyển một bản ghi đã `VERIFIED` về `PROCESSING`. | Hệ thống ném lỗi `BadRequestException`, giữ nguyên trạng thái kết thúc `VERIFIED`, đảm bảo tính toàn vẹn của State Machine. |
| **Dọn dẹp môi trường Local** | Phát hiện CLI Supabase local tự tạo các thư mục `.temp/` và `.branches/` làm bẩn Git Tree. | Cấu hình thủ công `.gitignore` để loại bỏ triệt để các thư mục này trước khi commit. |
