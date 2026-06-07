# AI Log - Kivy Seller Verification Platform

Tài liệu ghi chép lại cách thức cộng tác với AI (Gemini/Antigravity) nhằm minh bạch hóa các phần việc được ủy quyền, lỗi của AI và cách lập trình viên kiểm soát chất lượng hệ thống.

---

## 1. Các phần việc ủy quyền cho AI (Delegated Tasks)

| Tác vụ ủy quyền | Chi tiết thực hiện bởi AI | Lý do ủy quyền & Sự kiểm soát |
| :--- | :--- | :--- |
| **Boilerplate & DTOs** | Sinh các class DTO cho Swagger (`@ApiProperty`, `@ApiResponse`), schema Prisma. | Tác vụ lặp đi lặp lại. Lập trình viên kiểm duyệt lại kiểu dữ liệu để khớp với thiết kế cơ sở dữ liệu. |
| **UI Components** | Dựng khung giao diện Dashboard bằng Tailwind/CSS (Admin Panel, Seller Panel, Review Drawer). | Đẩy nhanh tốc độ CSS. Lập trình viên tinh chỉnh lại UX, responsive và các tương tác động. |
| **Mock Service** | Sinh cấu trúc khung cho Mock Service (chạy trên Hono API) giả lập dịch vụ xác thực. | Tiết kiệm thời gian dựng khung HTTP server cơ bản. Lập trình viên tự viết logic giả lập độ trễ và rate limit. |

---

## 2. Lỗi của AI và cách phát hiện & sửa chữa (AI Mistakes & Fixes)

AI đã đề xuất giải pháp cập nhật trạng thái đơn giản, gây ra lỗ hổng **Race Condition** nghiêm trọng khi xử lý Webhook bất đồng bộ đồng thời từ bên thứ ba hoặc thao tác phê duyệt thủ công của Admin.

### Chi tiết lỗi
Hàm `transition` ban đầu do AI viết chỉ kiểm tra trạng thái trong bộ nhớ rồi gọi `update` trực tiếp. Nếu có 2 luồng đồng thời gọi cập nhật, trạng thái có thể bị ghi đè không hợp lệ (vi phạm tính bất biến của trạng thái kết thúc).

<details>
<summary><b>Mã nguồn trước và sau khi sửa lỗi (Before & After)</b></summary>

#### Trước (Đề xuất lỗi của AI):
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

#### Sau (Lập trình viên khắc phục bằng Row Locking):
```typescript
async transition(
  verificationId: string,
  nextStatus: VerificationStatus,
  actor: StateActor,
  reason: string,
) {
  return this.prisma.$transaction(async (tx) => {
    // Sử dụng khóa SELECT FOR UPDATE để khóa dòng tránh Race Condition
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
    
    // Tiến hành cập nhật trạng thái...
    return tx.verification.update({
      where: { id: verificationId },
      data: { status: nextStatus, reason, actor }
    });
  });
}
```
</details>

---

## 3. Xác thực thủ công bởi lập trình viên (Developer Verifications)

| Nội dung xác thực | Cách thức thực hiện | Kết quả thực tế |
| :--- | :--- | :--- |
| **Rate Limiter & Worker** | Viết script gửi đồng thời 120 yêu cầu xác thực trong 1 phút lên hệ thống. | Hệ thống lưu trữ đúng 120 bản ghi ở trạng thái `PENDING`. Worker BullMQ điều phối gửi sang Mock Service ổn định ở mức ~80 requests/phút (không vượt quá giới hạn 100/phút). |
| **Tính bất biến của State Machine** | Truy cập database qua Prisma Studio, cố tình giả lập API chuyển một bản ghi đã `VERIFIED` về `PROCESSING`. | Hệ thống ném lỗi `BadRequestException`, giữ nguyên trạng thái kết thúc `VERIFIED`, đảm bảo tính toàn vẹn của State Machine. |
| **Dọn dẹp môi trường Local** | Phát hiện CLI Supabase local tự tạo các thư mục `.temp/` và `.branches/` làm bẩn Git Tree. | Cấu hình thủ công `.gitignore` để loại bỏ triệt để các thư mục này trước khi commit. |
