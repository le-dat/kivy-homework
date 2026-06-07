## 1. Người bán (Seller) có được phép tạo sản phẩm trong khi chờ xác thực danh tính không?

#### Thiết kế A: Bắt buộc xác thực xong mới được tạo sản phẩm

- **Ưu điểm:** Đảm bảo an toàn tuyệt đối. Không sợ hàng kém chất lượng lọt vào sàn. DB đơn giản.
- **Nhược điểm:** Trải nghiệm người dùng (UX) rất kém. Seller phải xếp hàng chờ đợi mà không thao tác được gì.

#### Thiết kế B: Cho phép tạo sản phẩm trước, ẩn hiển thị cho đến khi được duyệt

- **Ưu điểm:** Tối ưu hóa tỷ lệ chuyển đổi (onboarding conversion). Seller có thể setup gian hàng ngay.
- **Nhược điểm:** Phân quyền và quản lý trạng thái sản phẩm phức tạp hơn (sản phẩm tạo mới mặc định ẩn hoặc ở trạng thái nháp).

> **Chọn thiết kế B**. Với áp lực 5.000 seller tuần đầu và giới hạn xác thực 100 requests/phút, bắt seller xếp hàng chờ không làm gì sẽ phá hỏng trải nghiệm UX. Đánh đổi thêm phân quyền quản lí và db bị phình hơn để tối ưu trải nghiệm người dùng.

---

## 2. Launch Week (Vận hành dưới tải trọng cao & Giới hạn tài nguyên)

### Ràng buộc vận hành

- **Tải trọng:** ~5.000 seller đăng ký tuần đầu.
- **Giới hạn tài nguyên:** Chi phí 2 USD/request, giới hạn tốc độ tối đa 100 requests/phút.

### Giải pháp xử lý của hệ thống

1. **Nhận File & Phản hồi ngay:** Seller upload tài liệu -> Lưu DB với trạng thái `PENDING` -> Trả kết quả thành công lập tức để seller tiếp tục thao tác.
2. **Đưa vào hàng đợi (Queue):** Đẩy thông tin xác thực vào Message Queue (ví dụ: BullMQ).
3. **Worker kiểm soát tốc độ:** Worker ngầm lấy job từ Queue gửi sang bên thứ ba với tốc độ an toàn (~80 requests/phút) để tránh vượt rate limit.
4. **Lọc trước lỗi (Pre-validation):** Backend tự kiểm tra định dạng và dung lượng file trước khi gửi đi. Bản ghi lỗi sẽ bị `REJECTED` ngay tại local, giúp tiết kiệm chi phí 2 USD cho mỗi request rác.

### Các đánh đổi

- **Chọn bảo vệ hệ thống & ngân sách:** Chấp nhận hàng đợi bị dồn ứ lúc cao điểm (seller chờ lâu hơn), đảm bảo hệ thống không sập và không mất phí phạt do gọi API quá giới hạn.
- **Loại bỏ xử lý thời gian thực (Real-time):** Không gọi API trực tiếp ngay khi upload để tránh quá tải khi 5.000 seller đồng thời thao tác.

> **Điểm ít tự tin nhất:** Sự kiên nhẫn của seller khi chờ đợi. Nếu tỷ lệ rời bỏ cao, hệ thống sẽ nâng cấp thêm hàng đợi ưu tiên (Priority Queue) hoặc tích hợp nhà cung cấp phụ.

---

## 3. State Machine (Vòng đời trạng thái)

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> PROCESSING : System xử lý
    PROCESSING --> VERIFIED : Thành công
    PROCESSING --> REJECTED : Từ chối
    PROCESSING --> INCONCLUSIVE : Cần duyệt tay
    PROCESSING --> SYSTEM_ERROR : Lỗi hệ thống / Hết retry
    INCONCLUSIVE --> APPROVED : Admin duyệt chấp nhận
    INCONCLUSIVE --> REJECTED : Admin từ chối
```

### Bảo vệ trạng thái kết thúc (Terminal State Guard)

> [!CAUTION]
> **Lỗi lập trình viên cẩu thả dễ mắc phải:** Chỉ kiểm tra điều kiện lỏng lẻo (ví dụ: chỉ tìm bản ghi theo `id` để cập nhật trạng thái mà không kiểm tra trạng thái hiện tại trong DB, hoặc chỉ check `WHERE status = 'PROCESSING'`).
> *Hậu quả của sai lầm này:* Khi một Webhook thông báo kết quả `INCONCLUSIVE` (cần duyệt tay) được admin xử lý và cập nhật thành `APPROVED` (trạng thái kết thúc). Ngay sau đó, một Webhook cũ báo `REJECTED` bị trễ do nghẽn mạng gửi đến muộn. Nếu engineer cẩu thả chỉ chạy lệnh `UPDATE` dựa theo ID bản ghi hoặc không bảo vệ trạng thái kết thúc, Webhook cũ này sẽ ghi đè trạng thái `APPROVED` của admin thành `REJECTED`, phá hỏng tính nhất quán của hệ thống.
>
> **Giải pháp bảo vệ:** Trạng thái kết thúc (`VERIFIED`, `APPROVED`, `REJECTED`, `SYSTEM_ERROR`) là **bất biến (Immutable)**. Chặn ghi đè trực tiếp ở câu lệnh cập nhật DB:
> `UPDATE verifications SET status = :new_status WHERE id = :id AND status NOT IN ('VERIFIED', 'APPROVED', 'REJECTED', 'SYSTEM_ERROR')`

---

## 4. What you deliberately did not build (Cố ý lược bỏ cho V1)

**Tính năng lược bỏ:** Luồng gửi lại hồ sơ (Re-upload/Resubmission flow) khi bị từ chối (`REJECTED`) hoặc gặp lỗi hệ thống (`SYSTEM_ERROR`).

- **Lý do:** Tiết kiệm thời gian phát triển giao diện người dùng và tránh kiểm soát các trạng thái chuyển đổi phức tạp. Mỗi Seller chỉ có duy nhất 1 bản ghi yêu cầu xác thực trong hệ thống, giúp loại bỏ hoàn toàn rủi ro race condition khi người dùng cố tình hoặc vô tình gửi lại (re-submit) tài liệu liên tục trong lúc Worker/Webhook đang xử lý.
- **Rủi ro:** Khi Seller nhập sai thông tin hoặc upload ảnh lỗi dẫn đến trạng thái từ chối (`REJECTED`), họ sẽ bị kẹt vĩnh viễn và không thể tự thực hiện lại quy trình xác thực trên giao diện.

---

## 5. The failure that worries you most (Lỗi lo sợ nhất trong Production)

**Lỗi đáng sợ nhất:** **Mất Webhook phản hồi từ bên thứ ba (do sập mạng hoặc lỗi hệ thống).**
Hậu quả: Hồ sơ của seller bị kẹt ở trạng thái `PROCESSING` vô thời hạn.

### Giải pháp giảm thiểu (Mitigation Strategy)

1. **Reconciliation (Đối soát tự động):** Chạy Cron job quét database mỗi 10 phút để tìm các bản ghi ở trạng thái `PROCESSING`.
2. **State Pulling (Chủ động truy vấn):** Gọi API `GET /verifications/{id}` của bên thứ ba để đối chiếu và cập nhật trạng thái mới nhất về DB.
3. **Retry với Exponential Backoff & Jitter:** Khi API đối soát gặp lỗi kết nối, thử lại theo chu kỳ tăng dần: lần 1 sau **5 phút**, lần 2 sau **15 phút**, lần 3 sau **1 giờ**, lần 4 sau **4 giờ** (kèm theo độ trễ ngẫu nhiên - Jitter từ 1-5 phút để phân tán lưu lượng tải đột biến).
4. **Xử lý khi cạn kiệt (Exhausted):** Khi cạn kiệt số lần thử lại tại Worker hoặc gặp lỗi hệ thống nghiêm trọng, chuyển bản ghi sang trạng thái `SYSTEM_ERROR`, ghi log chi tiết và bắn Paging Alert (Slack/Telegram) để kỹ sư trực hệ thống kiểm tra thủ công.
