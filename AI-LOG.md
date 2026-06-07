# AI Log - Kivy Seller Verification Platform

Tài liệu này ghi chép lại cách thức sử dụng AI (Antigravity/Gemini) trong quá trình thực hiện dự án take-home, nhằm minh bạch hóa những gì được ủy quyền cho AI, lỗi mà AI gặp phải và cách nhà phát triển kiểm soát mã nguồn.

---

## 1. Những phần việc ủy quyền cho AI (Delegated Tasks)

Tôi sử dụng AI làm trợ lý đắc lực để đẩy nhanh tiến độ đối với các tác vụ mang tính thủ tục hoặc boilerplate:

*   **Scaffolding & Boilerplate:** Sinh các file DTO (Data Transfer Object) cho Swagger, định nghĩa các Schema Prisma, và cấu hình các module cơ bản trong NestJS.
*   **UI Components:** Tạo cấu trúc giao diện Dashboard Next.js (Dashboard Admin, Seller Panel, Timeline hiển thị sự kiện, Review Drawer). AI giúp viết CSS/Tailwind nhanh và tạo layout khung.
*   **Viết Swagger/OpenAPI annotations:** Gắn các `@ApiProperty()` và `@ApiResponse()` cho toàn bộ 13 endpoints trong NestJS để tự động hóa tài liệu API.
*   **Mã Mock-Service:** Sinh mã nguồn khung cho dịch vụ Hono API giả lập kiểm duyệt bên thứ ba.

---

## 2. Lỗi của AI và cách tôi phát hiện & sửa chữa (AI Mistakes & Fixes)

Trong quá trình phát triển, AI đã gặp phải một lỗi nghiêm trọng liên quan đến **Concurrency (Bất đồng bộ đồng thời)** và **Race Condition** khi xử lý cập nhật trạng thái.

### Chi tiết lỗi
Khi thiết kế luồng cập nhật trạng thái xác thực trong `verification-state-machine.service.ts`, AI ban đầu đề xuất sử dụng câu lệnh Prisma `update` thông thường:

```typescript
// Code lỗi do AI đề xuất ban đầu
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

### Cách phát hiện lỗi
Tôi nhận ra rằng trong môi trường thực tế, Webhook phản hồi từ bên thứ ba có thể gửi về đồng thời với thao tác bấm duyệt thủ công của Admin, hoặc nhiều Webhook cũ/mới bị gửi trùng lặp cùng lúc do sập mạng tạm thời. Nếu hai luồng xử lý chạy đồng thời:
1. Luồng A đọc trạng thái là `PROCESSING`.
2. Luồng B cũng đọc trạng thái là `PROCESSING`.
3. Cả hai luồng đều kiểm tra qua hàm `canTransition` hợp lệ.
4. Luồng A cập nhật thành `VERIFIED`.
5. Luồng B cập nhật ghi đè (hoặc ghi đè ngược) thành một trạng thái lỗi thời, phá vỡ logic tính bất biến (Immutable) của trạng thái kết thúc.

### Giải pháp khắc phục
Tôi đã yêu cầu sửa lại sử dụng giao dịch cơ sở dữ liệu (**Database Transaction**) kết hợp khóa bi quan (**Pessimistic Locking / Row Locking**) của PostgreSQL bằng câu lệnh `SELECT ... FOR UPDATE` thông qua `$queryRaw` để lock dòng dữ liệu trước khi thay đổi trạng thái, chặn đứng mọi hành vi ghi đè đồng thời.

```diff
 async transition(
   verificationId: string,
   nextStatus: VerificationStatus,
   actor: StateActor,
   reason: string,
 ) {
   return this.prisma.$transaction(async (tx) => {
-    const verification = await tx.verification.findUnique({ where: { id: verificationId } });
+    // Sử dụng khóa SELECT FOR UPDATE để khóa dòng cần cập nhật tránh Race Condition
+    const rows = await tx.$queryRaw<any[]>`
+      SELECT id, seller_id, status, reason
+      FROM verifications
+      WHERE id = ${verificationId}
+      FOR UPDATE
+    `;
+    const row = rows[0];
     
     // Tiếp tục kiểm tra logic transition và cập nhật trạng thái...
   });
 }
```

---

## 3. Xác thực thủ công bởi lập trình viên (Manual Verification)

Tôi đã tự thực hiện các bước kiểm nghiệm thực tế trên hệ thống để đảm bảo chất lượng vận hành:

1.  **Rate Limiter Verification:** 
    *   **Thao tác:** Viết một script chạy thử nghiệm đẩy liên tục 120 yêu cầu xác thực tài liệu lên hệ thống trong vòng 1 phút.
    *   **Kết quả:** Hệ thống lưu 120 bản ghi ở trạng thái `PENDING`. Worker BullMQ chia đều tải trọng, gửi sang Mock Service với tốc độ chính xác tối đa ~80 requests/phút (dưới giới hạn 100 requests/phút). Phía Mock Service nhận đều đặn và không trả về lỗi `429 Too Many Requests`.
2.  **State Machine Terminal State Verification:**
    *   **Thao tác:** Truy cập thẳng database qua Prisma Studio, cố tình gửi API kích hoạt đổi trạng thái của một hồ sơ đã `VERIFIED` thành `PROCESSING`.
    *   **Kết quả:** Hệ thống chặn đứng ở tầng State Machine, ném lỗi `BadRequestException` và giữ nguyên trạng thái `VERIFIED`, chứng minh cơ chế bảo vệ Terminal State hoạt động hoàn hảo.
3.  **Supabase Local Cache Git Ignore:**
    *   **Thao tác:** Phát hiện CLI Supabase local sinh thư mục cache `.temp/` và `.branches/` làm bẩn Git Tree.
    *   **Kết quả:** Cập nhật thủ công file `.gitignore` để loại bỏ các thư mục này trước khi đẩy code lên Github.
