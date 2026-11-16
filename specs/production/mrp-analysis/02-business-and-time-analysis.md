# 02 — Phân tích nghiệp vụ, thời gian và ví dụ tính (Phần 2, 3, 4)

Mọi nội dung là **đề xuất từ phân tích**, chưa phải yêu cầu chính thức. Mã BR-MRP-xx là mã tạm. Các điểm cần chủ dự án quyết định được gom ở `06-assessment-and-roadmap.md` mục 10.

## 1. Quy trình MRP đề xuất

```
Kế hoạch sản xuất (dòng: thành phẩm, số lượng, ngày bắt đầu, ngày kết thúc)   ← đã có
   → Phân rã BOM đang áp dụng (định mức × số lượng × hao hụt)                 ← đã có (một cấp)
   → Gắn ngày cần cho từng nhu cầu (ngày bắt đầu của dòng)                    ← mới
   → Gộp nhu cầu của mọi kế hoạch + lệnh đang mở theo NVL và ngày             ← mới
   → Đối chiếu nguồn: tồn kho + hàng đang về                                  ← tồn đã có, hàng đang về mới
   → Tính thiếu theo từng mốc ngày                                            ← mới
   → Tính ngày cần đặt hàng (ngày cần − lead time)                            ← mới
   → Trạng thái sẵn sàng của từng dòng kế hoạch                               ← mới
```

## 2. Trả lời 12 câu hỏi nghiệp vụ

| # | Câu hỏi | Hiện tại | Đề xuất |
|---|---|---|---|
| 1 | Tạo kế hoạch thì tính nhu cầu thế nào | `ProductionPlanReader.MaterialRequirementsAsync`: với mỗi dòng, lấy BOM đang áp dụng, tính `CalculateRequirement(SL, định mức, hao hụt)` cho từng NVL. Tính khi xem, không lưu | Giữ nguyên công thức. Bổ sung ngày cần cho mỗi nhu cầu |
| 2 | Nhiều thành phẩm dùng chung NVL | Đã cộng dồn theo (NVL, đơn vị) trong một kế hoạch | Cộng dồn thêm theo **ngày cần**, và trên **nhiều kế hoạch** |
| 3 | BOM nhiều cấp | Chưa phân rã. Bán thành phẩm trong BOM bị coi như NVL mua ngoài | Giai đoạn đầu: giữ một cấp, và cảnh báo khi NVL trong BOM là hàng có BOM riêng. Phân rã nhiều cấp là NICE TO HAVE, chỉ làm khi U1 được xác nhận. Nếu làm: phân rã đệ quy, trừ tồn bán thành phẩm trước khi phân rã tiếp, chặn BOM vòng |
| 4 | BOM đổi sau khi kế hoạch được duyệt | Kế hoạch luôn tính theo BOM đang áp dụng lúc xem. Lệnh đã lập giữ nhu cầu đã chụp (`trx_production_material_requirements`) | Giữ cách này: phần **chưa lập lệnh** theo BOM mới, phần **đã lập lệnh** theo số đã chụp. Màn MRP hiện ghi chú "tính theo BOM phiên bản X" |
| 5 | Số lượng đổi | Nhu cầu tính lại mỗi lần xem | Không cần xử lý thêm vì không lưu kết quả. Nếu sau này lưu ảnh chụp thì phải đánh dấu "đã cũ" |
| 6 | Ngày sản xuất đổi | Chưa có khái niệm lịch chuẩn bị | Ngày cần và ngày đặt hàng được tính lại từ ngày bắt đầu mới. Nếu ngày đặt hàng mới đã qua thì báo "trễ" |
| 7 | Nhiều kế hoạch dùng chung NVL | Mỗi kế hoạch so với **toàn bộ** tồn → tồn bị tính trùng | Phân bổ **mềm**: xếp mọi nhu cầu theo ngày cần tăng dần, trừ dần vào nguồn. Không khóa tồn. Xem mục 5 |
| 8 | Tồn không đủ | Tô đỏ NVL thiếu ở tab Nhu cầu NVL, không chặn (BR-PP-15) | Thêm: số thiếu theo từng mốc ngày, ngày cần đặt, gợi ý "mua" hoặc "chuyển kho". Vẫn không chặn duyệt |
| 9 | Hàng đã đặt chưa nhập | Không tính | Tính là **nguồn dự kiến** nếu đơn mua `ORDERED` / `PARTIAL`. Cần ngày giao dự kiến trên đơn mua; đơn không có ngày thì hiện riêng ở cột "đang đặt, chưa rõ ngày" và **không** dùng để xóa cảnh báo thiếu |
| 10 | Hàng đã đến, đang kiểm nhận | Phiếu nhập `DRAFT` chưa vào tồn | **Không** coi là sẵn sàng. Hiện ở cột "đang kiểm nhận" để người dùng biết. Chỉ `accepted_qty` của phiếu `COMPLETED` mới là tồn |
| 11 | Hàng ở kho khác | Người dùng tự đổi kho ở ô chọn | Với NVL thiếu ở kho sản xuất, liệt kê tồn ở các kho khác mà người dùng có quyền và gợi ý chuyển kho. Người dùng tự lập phiếu chuyển (module `Transfers` đang có) |
| 12 | NVL lỗi, hết hạn, không đạt | Hàng lỗi lúc nhập không vào tồn; lô hết hạn vẫn nằm trong tồn và vẫn xuất được | Tồn khả dụng cho MRP loại lô có `expiry_date` trước ngày cần. Hàng lỗi phát hiện sau khi nhập phải xuất hủy (module `Disposals`) thì mới ra khỏi tồn. Không thêm trạng thái chất lượng trên tồn ở giai đoạn đầu |

## 3. Tính nhu cầu theo thời gian: ba phương án

| | A. Sẵn sàng trước ngày bắt đầu | B. Theo sản lượng từng ngày | C. Theo công đoạn |
|---|---|---|---|
| Cách tính | Toàn bộ nhu cầu của dòng kế hoạch cần có vào ngày bắt đầu của dòng | Chia sản lượng của dòng ra từng ngày giữa ngày bắt đầu và kết thúc; nhu cầu mỗi ngày = sản lượng ngày × định mức | Mỗi NVL gắn với một công đoạn; cần vào ngày công đoạn đó bắt đầu |
| Dữ liệu cần | Ngày bắt đầu của dòng (**đã có**) | Sản lượng theo ngày (chưa có), lịch làm việc (chưa có) | Quy trình công đoạn, thời lượng, BOM theo công đoạn (đều chưa có) |
| Ưu điểm | Đơn giản, an toàn, dễ giải thích, dùng ngay dữ liệu hiện có | Giảm tồn nằm chờ với lô dài ngày; hàng về làm nhiều đợt được | Chính xác nhất với sản xuất dài, nhiều bước |
| Nhược điểm | Yêu cầu NVL về sớm hơn cần thiết với lô sản xuất dài | Phải nhập hoặc giả định sản lượng ngày; số liệu dễ sai nếu thực tế không đều | Phải xây cả mô hình công đoạn; vượt xa phạm vi hiện tại |
| Độ phức tạp | Thấp | Trung bình | Cao |
| Phù hợp StockFlow | **Cao** | Trung bình, làm được sau | Thấp |

**Khuyến nghị: phương án A.**
- Xuất NVL hiện nay cũng làm theo lệnh, không theo ngày hay công đoạn (`CreateMaterialIssueCommand`), nên A khớp cách xưởng đang vận hành trong hệ thống.
- Không cần thêm bảng lịch sản xuất.
- Có thể nâng lên B về sau bằng cách chia đều sản lượng theo số ngày làm việc của dòng, mà không đổi mô hình dữ liệu: B chỉ là cách sinh nhiều mốc ngày hơn từ cùng một dòng kế hoạch.

## 4. Lead time và các mốc ngày

### 4.1 Bốn mốc ngày cần phân biệt

| Mốc | Ý nghĩa | Nguồn |
|---|---|---|
| Ngày cần đưa vào sản xuất (N_sx) | Ngày bắt đầu của dòng kế hoạch | `dtl_production_plan_items.planned_start_date` (đã có) |
| Ngày cần có tại kho (N_kho) | NVL đã vào tồn, dùng được | N_sx − đệm an toàn |
| Ngày hàng phải đến (N_đến) | Hàng tới cổng kho, bắt đầu kiểm nhận | N_kho − thời gian kiểm nhận |
| Ngày phải đặt hàng (N_đặt) | Hạn chót gửi đơn mua | N_đến − thời gian nhà cung cấp − thời gian vận chuyển |

### 4.2 Thành phần lead time

| Thành phần | Hiện có? | Đề xuất lưu |
|---|---|---|
| Thời gian nhà cung cấp chuẩn bị | Chưa | Gộp chung với vận chuyển thành một số "ngày giao hàng" trên NVL |
| Thời gian vận chuyển | Chưa | Như trên. Tách riêng là NICE TO HAVE |
| Thời gian kiểm nhận, nhập kho | Chưa | Một số cấu hình chung cho toàn hệ thống (mặc định 0 hoặc 1 ngày) |
| Đệm an toàn | Chưa | Một số cấu hình chung (mặc định 0 hoặc 1 ngày) |

Lý do gộp: hệ thống không có bảng hàng – nhà cung cấp, và nhóm chưa có dữ liệu chi tiết từng thành phần (U2). Bắt đầu bằng một số ngày trên mỗi NVL là đủ để ra ngày đặt hàng; tách sau không phá dữ liệu.

### 4.3 Công thức

```
N_kho  = trừ_ngày_làm_việc(N_sx, đệm_an_toàn)
N_đến  = trừ_ngày_làm_việc(N_kho, ngày_kiểm_nhận)
N_đặt  = trừ_ngày(N_đến, ngày_giao_hàng_của_NVL)
```

- `trừ_ngày_làm_việc`: lùi theo ngày kho hoạt động (kiểm nhận và sản xuất là việc nội bộ).
- `trừ_ngày` cho phần nhà cung cấp: lùi theo **ngày lịch** hay **ngày làm việc** phụ thuộc cách nhà cung cấp báo thời gian giao. Đây là điểm cần xác nhận (Q-M4). Mặc định đề xuất: ngày lịch, vì báo giá thường ghi "giao sau N ngày".
- Nếu N_đặt rơi vào ngày nghỉ thì lùi về ngày làm việc liền trước.
- Nếu N_đặt < hôm nay: trạng thái **Trễ**, kèm ngày hàng sớm nhất có thể về = hôm nay + lead time.

### 4.4 Ngày nghỉ

Hệ thống chưa có lịch làm việc (hiện trạng mục 22). Ba mức:

| Mức | Nội dung | Phân loại |
|---|---|---|
| 0 | Mọi ngày là ngày làm việc; tài liệu và màn hình ghi rõ giả định này | MUST (mặc định khi chưa có lịch) |
| 1 | Cấu hình ngày nghỉ hằng tuần (ví dụ Chủ nhật) | SHOULD |
| 2 | Thêm danh sách ngày nghỉ lễ theo năm | NICE TO HAVE |

Không được ngầm coi ngày lịch là ngày làm việc: màn hình phải ghi cách tính đang dùng.

## 5. Tránh phân bổ trùng khi nhiều kế hoạch dùng chung NVL

Hai cách:

| | Phân bổ mềm (tính khi xem) | Giữ chỗ cứng (lưu) |
|---|---|---|
| Cách làm | Gom mọi nhu cầu còn mở của mọi kế hoạch đã duyệt và mọi lệnh đang mở, xếp theo ngày cần, trừ dần vào nguồn | Ghi bản ghi giữ chỗ khi duyệt kế hoạch hoặc lập lệnh; tồn khả dụng = tồn − đã giữ |
| Đổi database | Không | Bảng giữ chỗ mới; mọi luồng xuất kho phải tôn trọng giữ chỗ |
| Hai người cùng thao tác | Không xung đột vì không ghi gì | Phải khóa khi giữ chỗ |
| Rủi ro | Thứ tự ưu tiên chỉ theo ngày; kế hoạch có ngày sớm hơn luôn thắng | Giữ chỗ "chết" khi kế hoạch treo; ảnh hưởng bán hàng, chuyển kho, xuất hủy đang chạy |
| Khuyến nghị | **Giai đoạn đầu** | Chỉ làm khi chủ dự án yêu cầu khóa tồn thật |

**Nhu cầu được tính trong phân bổ mềm (để không trùng và không sót):**

| Nguồn nhu cầu | Số lượng | Ngày cần |
|---|---|---|
| Lệnh `NOT_STARTED`, `IN_PROGRESS` | `shortage_qty` của `trx_production_material_requirements` (còn phải xuất) | Lệnh chưa bắt đầu: ngày bắt đầu của dòng kế hoạch nếu lệnh thuộc kế hoạch, nếu không thì `start_date` của lệnh. Lệnh đang chạy: hôm nay |
| Kế hoạch `APPROVED` | Nhu cầu của **số còn lại chưa lập lệnh** (đã có sẵn: `RemainingRequiredQty`) | Ngày bắt đầu của dòng |
| Kế hoạch `PENDING_APPROVAL` | Như trên, toàn bộ số kế hoạch | Ngày bắt đầu của dòng. Tính hay không: Q-M2 |
| Kế hoạch `DRAFT`, `REJECTED`, `CLOSED`, `CANCELLED` | Không tính | — |

Phần đã lập lệnh của kế hoạch **không** được tính lần hai: nó đã nằm trong nhu cầu của lệnh.

## 6. Ví dụ tính (Phần 4)

Giả định của ví dụ: một kho, BOM một cấp, hao hụt 0%, đệm an toàn 0, kiểm nhận 0 ngày, lead time tính theo ngày lịch, không có hàng đang về, không có kế hoạch hay lệnh nào khác. Hôm nay là thứ Hai 16/11/2026.

### 6.1 Tổng nhu cầu

| NVL | Bàn A (100) | Ghế B (200) | Tổng |
|---|---|---|---|
| Gỗ (kg) | 100 × 5 = 500 | 200 × 2 = 400 | **900** |
| Sơn (lít) | 100 × 1 = 100 | 200 × 0,5 = 100 | **200** |
| Ốc vít (cái) | 100 × 10 = 1.000 | 200 × 8 = 1.600 | **2.600** |

### 6.2 Nhu cầu theo ngày và tồn sau phân bổ (phương án A)

Nhu cầu ngày sớm hơn được cấp tồn trước.

| NVL | Tồn đầu | Cần 20/11 | Tồn sau 20/11 | Thiếu 20/11 | Cần 22/11 | Thiếu 22/11 | Tổng thiếu |
|---|---|---|---|---|---|---|---|
| Gỗ | 300 | 500 | 0 | **200** | 400 | **400** | **600** |
| Sơn | 150 | 100 | 50 | 0 | 100 | **50** | **50** |
| Ốc vít | 800 | 1.000 | 0 | **200** | 1.600 | **1.600** | **1.800** |

"Tồn khả dụng" cho một mốc ngày = tồn đầu + hàng về trước mốc − nhu cầu của các mốc sớm hơn. Ví dụ tồn khả dụng của sơn cho ngày 22/11 là 150 − 100 = 50.

### 6.3 Ngày cần chuẩn bị và ngày cần đặt hàng

| NVL | Lead time | Thiếu cho ngày | Số cần mua | Ngày cần có tại kho | Ngày cần đặt hàng |
|---|---|---|---|---|---|
| Gỗ | 3 ngày | 20/11 | 200 kg | 20/11 | **17/11** |
| Gỗ | 3 ngày | 22/11 | 400 kg | 22/11 | **19/11** |
| Sơn | 2 ngày | 22/11 | 50 lít | 22/11 | **20/11** |
| Ốc vít | 1 ngày | 20/11 | 200 cái | 20/11 | **19/11** |
| Ốc vít | 1 ngày | 22/11 | 1.600 cái | 22/11 | **21/11** |

Lưu ý về lịch: 22/11/2026 là Chủ nhật và 21/11 là thứ Bảy. Nếu xưởng nghỉ cuối tuần thì kế hoạch ngày 22/11 cần xem lại, và hạn đặt ốc vít cho đợt đó phải lùi về thứ Sáu 20/11. Đây là lý do cần cấu hình ngày nghỉ (mục 4.4).

Nếu gộp một đơn cho mỗi NVL thì đặt theo hạn sớm nhất: gỗ 600 kg trước 17/11, ốc vít 1.800 cái trước 19/11, sơn 50 lít trước 20/11.

### 6.4 Trạng thái đáp ứng

| Đối tượng | Trạng thái | Lý do |
|---|---|---|
| Bàn A (20/11) | **Thiếu NVL** | Thiếu 200 kg gỗ, 200 ốc vít; sơn đủ |
| Ghế B (22/11) | **Thiếu NVL** | Thiếu 400 kg gỗ, 50 lít sơn, 1.600 ốc vít |
| Gỗ, ốc vít | Thiếu, còn kịp đặt | Ngày cần đặt ≥ hôm nay (16/11) |
| Sơn | Đủ cho 20/11, thiếu cho 22/11 | |

Tỷ lệ sẵn sàng của một dòng có thể tính bằng số thành phẩm làm được với NVL được cấp: Bàn A có 300 kg gỗ → 60 bàn; 800 ốc → 80 bàn; sơn đủ → làm được tối đa **60 / 100**.

### 6.5 Một lượng NVL dùng cho nhiều kế hoạch

Giả sử có thêm kế hoạch KH-2 cần 250 kg gỗ vào ngày 19/11.

- Cách hiện tại (mỗi kế hoạch so với toàn bộ tồn): KH-2 thấy 300 ≥ 250 nên "đủ"; Bàn A thấy 300 < 500 nên "thiếu 200". Cùng 300 kg bị tính hai lần; thực tế tổng thiếu lớn hơn.
- Phân bổ mềm theo ngày: KH-2 (19/11) nhận 250, còn 50. Bàn A (20/11) nhận 50, thiếu **450**. Ghế B (22/11) thiếu 400. Tổng thiếu gỗ = 850 kg, đúng bằng (250 + 900) − 300.

Hệ quả cần chấp nhận: thêm một kế hoạch có ngày sớm hơn sẽ làm kế hoạch muộn hơn chuyển từ "đủ" sang "thiếu". Màn hình phải cho thấy NVL đang được cấp cho những kế hoạch / lệnh nào.
