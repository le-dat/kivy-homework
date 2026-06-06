- write docs step by step to this project => write flow instead of code directly
- Khi setup Supabase local (`supabase start`), CLI tự tạo thư mục `supabase/` chứa các thư mục cache nội bộ như `.temp/` và `.branches/`. Cần cập nhật `.gitignore` để tránh push các file rác này lên Git:
  ```gitignore
  # Supabase local state
  /supabase/.temp/
  /supabase/.branches/
  ```
