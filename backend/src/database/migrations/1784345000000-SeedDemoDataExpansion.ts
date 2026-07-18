import { hash } from 'bcryptjs';
import { MigrationInterface, QueryRunner } from 'typeorm';

/** Số vòng băm bcrypt — khớp BCRYPT_ROUNDS của AuthService (auth.service.ts) */
const BCRYPT_ROUNDS = 10;
/** Mật khẩu demo dùng chung cho toàn bộ user seed — CHỈ dùng cho môi trường demo/QA */
const DEMO_PASSWORD = 'Demo@2026';

/**
 * Mở rộng seed demo (PROMPT 17 — Database & Data Layer):
 * - +15 cơ quan nhà nước (tổng 20), +14 văn bản pháp luật (tổng 20),
 *   +22 thủ tục hành chính (tổng 30) kèm bước + giấy tờ.
 * - Backfill category/expected_result cho 8 thủ tục seed cũ (cột mới thêm ở
 *   migration AddDataLayerExtensions).
 * - 1 admin + 5 citizen (mật khẩu demo dùng chung, xem DEMO_PASSWORD) + citizen_profiles.
 * - 1 conversation mẫu kèm message, 1 feedback mẫu.
 * Idempotent theo code/email — chạy lại không tạo trùng.
 */
export class SeedDemoDataExpansion1784345000000 implements MigrationInterface {
  name = 'SeedDemoDataExpansion1784345000000';

  public async up(q: QueryRunner): Promise<void> {
    // ---------- Backfill category/expected_result cho thủ tục seed cũ ----------
    const backfill: Array<[string, string, string]> = [
      ['TT-CC-01', 'Căn cước', 'Thẻ căn cước'],
      ['TT-CC-02', 'Căn cước', 'Thẻ căn cước (cấp đổi/cấp lại)'],
      ['TT-HC-01', 'Xuất nhập cảnh', 'Hộ chiếu phổ thông'],
      ['TT-HT-01', 'Hộ tịch', 'Giấy khai sinh'],
      ['TT-HT-02', 'Hộ tịch', 'Giấy chứng nhận kết hôn'],
      ['TT-CT-01', 'Cư trú', 'Xác nhận đăng ký thường trú'],
      ['TT-CT-02', 'Cư trú', 'Xác nhận đăng ký tạm trú'],
      ['TT-TP-01', 'Tư pháp', 'Phiếu lý lịch tư pháp'],
    ];
    for (const [code, category, expectedResult] of backfill) {
      await q.query(
        `UPDATE administrative_procedures SET category = $2, expected_result = $3
         WHERE code = $1 AND category IS NULL`,
        [code, category, expectedResult],
      );
    }

    // ---------- +15 cơ quan nhà nước ----------
    const agencies: Array<[string, string, string, string | null, string | null, string | null, string | null, string | null]> = [
      // [code, name, level, provinceCode, address, phone, website, workingHours]
      ['CT-HN', 'Cục Thuế Thành phố Hà Nội', 'PROVINCE', '01', '187 Giảng Võ, Đống Đa, Hà Nội', '024.38460990', 'https://hanoi.gdt.gov.vn', 'Thứ 2 - Thứ 6, 8:00 - 17:00'],
      ['BHXH-HN', 'Bảo hiểm xã hội Thành phố Hà Nội', 'PROVINCE', '01', '15 Yết Kiêu, Hai Bà Trưng, Hà Nội', '024.39420488', 'https://baohiemxahoi.gov.vn', 'Thứ 2 - Thứ 6, 8:00 - 17:00'],
      ['SYT-HN', 'Sở Y tế Thành phố Hà Nội', 'PROVINCE', '01', '4 Sơn Tây, Ba Đình, Hà Nội', '024.38230416', 'https://soyte.hanoi.gov.vn', 'Thứ 2 - Thứ 6, 8:00 - 17:00'],
      ['SGDDT-HN', 'Sở Giáo dục và Đào tạo Thành phố Hà Nội', 'PROVINCE', '01', '23 Quang Trung, Hoàn Kiếm, Hà Nội', '024.38257777', 'https://sogddt.hanoi.gov.vn', 'Thứ 2 - Thứ 6, 8:00 - 17:00'],
      ['SGTVT-HN', 'Sở Giao thông vận tải Thành phố Hà Nội', 'PROVINCE', '01', '2 Phùng Hưng, Hà Đông, Hà Nội', '024.33828435', 'https://sogtvt.hanoi.gov.vn', 'Thứ 2 - Thứ 6, 7:30 - 17:00'],
      ['SKHDT-HN', 'Sở Kế hoạch và Đầu tư Thành phố Hà Nội', 'PROVINCE', '01', '16 Cát Linh, Đống Đa, Hà Nội', '024.37348666', 'https://skhdt.hanoi.gov.vn', 'Thứ 2 - Thứ 6, 8:00 - 17:00'],
      ['SNV-HN', 'Sở Nội vụ Thành phố Hà Nội', 'PROVINCE', '01', '18B Lê Thánh Tông, Hoàn Kiếm, Hà Nội', '024.38253536', 'https://snv.hanoi.gov.vn', 'Thứ 2 - Thứ 6, 8:00 - 17:00'],
      ['CA-HCM', 'Công an Thành phố Hồ Chí Minh', 'PROVINCE', '79', '268 Trần Hưng Đạo, Quận 1, TP. Hồ Chí Minh', '069.3187167', 'https://congan.hochiminhcity.gov.vn', 'Thứ 2 - Thứ 6, 7:30 - 17:00'],
      ['STP-HCM', 'Sở Tư pháp Thành phố Hồ Chí Minh', 'PROVINCE', '79', '141-143 Pasteur, Quận 3, TP. Hồ Chí Minh', '028.38294083', 'https://sotuphap.hochiminhcity.gov.vn', 'Thứ 2 - Thứ 6, 7:30 - 17:00'],
      ['BHXH-HCM', 'Bảo hiểm xã hội Thành phố Hồ Chí Minh', 'PROVINCE', '79', '117 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh', '028.39303332', 'https://baohiemxahoi.gov.vn', 'Thứ 2 - Thứ 6, 7:30 - 17:00'],
      ['CT-HCM', 'Cục Thuế Thành phố Hồ Chí Minh', 'PROVINCE', '79', '63 Vũ Tông Phan, Thủ Đức, TP. Hồ Chí Minh', '028.37649888', 'https://hcmtax.gov.vn', 'Thứ 2 - Thứ 6, 7:30 - 17:00'],
      ['CA-DN', 'Công an Thành phố Đà Nẵng', 'PROVINCE', '48', '80 Lê Lợi, Hải Châu, Đà Nẵng', '069.4258719', 'https://congan.danang.gov.vn', 'Thứ 2 - Thứ 6, 7:30 - 17:00'],
      ['STP-DN', 'Sở Tư pháp Thành phố Đà Nẵng', 'PROVINCE', '48', '24 Trần Phú, Hải Châu, Đà Nẵng', '0236.3822222', 'https://stp.danang.gov.vn', 'Thứ 2 - Thứ 6, 7:30 - 17:00'],
      ['TCT-BTC', 'Cục Thuế - Bộ Tài chính', 'CENTRAL', null, '123 Lò Đúc, Hai Bà Trưng, Hà Nội', '024.39716666', 'https://gdt.gov.vn', 'Thứ 2 - Thứ 6, 8:00 - 17:00'],
      ['BHXHVN', 'Bảo hiểm xã hội Việt Nam', 'CENTRAL', null, '7 Tràng Thi, Hoàn Kiếm, Hà Nội', '024.39364008', 'https://baohiemxahoi.gov.vn', 'Thứ 2 - Thứ 6, 8:00 - 17:00'],
    ];
    for (const [code, name, level, provinceCode, address, phone, website, workingHours] of agencies) {
      await q.query(
        `INSERT INTO government_agencies (id, code, name, level, address, phone, website, working_hours, admin_unit_id)
         VALUES (uuid_generate_v4(), $1, $2, $3::agency_level, $4, $5, $6, $7,
                 CASE WHEN $8::text IS NOT NULL THEN (SELECT id FROM administrative_units WHERE code = $8) END)
         ON CONFLICT (code) DO NOTHING`,
        [code, name, level, address, phone, website, workingHours, provinceCode],
      );
    }

    // ---------- +14 văn bản pháp luật ----------
    const legalDocs: Array<[string, string, string, string, string, string, string | null]> = [
      // [code, title, docType, issuingBody, issuedDate, summary, version]
      ['41/2024/QH15', 'Luật Bảo hiểm xã hội', 'LUAT', 'Quốc hội', '2024-06-29',
        'Luật Bảo hiểm xã hội 2024 có hiệu lực từ 01/7/2025, mở rộng đối tượng tham gia BHXH bắt buộc, bổ sung trợ cấp hưu trí xã hội cho người từ đủ 75 tuổi không hưởng lương hưu, giảm số năm đóng tối thiểu để hưởng lương hưu từ 20 xuống 15 năm. Người lao động và người sử dụng lao động có trách nhiệm đăng ký tham gia BHXH bắt buộc trong thời hạn quy định kể từ ngày giao kết hợp đồng lao động.', null],
      ['31/2024/QH15', 'Luật Đất đai', 'LUAT', 'Quốc hội', '2024-01-18',
        'Luật Đất đai 2024 có hiệu lực từ 01/8/2024, quy định về quyền và nghĩa vụ của người sử dụng đất, trình tự đăng ký đất đai, cấp Giấy chứng nhận quyền sử dụng đất/quyền sở hữu tài sản gắn liền với đất, và các trường hợp đăng ký biến động đất đai (chuyển nhượng, tặng cho, thừa kế...). Hồ sơ đăng ký biến động nộp tại Văn phòng đăng ký đất đai hoặc bộ phận một cửa cấp xã.', null],
      ['59/2020/QH14', 'Luật Doanh nghiệp', 'LUAT', 'Quốc hội', '2020-06-17',
        'Luật Doanh nghiệp 2020 quy định về thành lập, tổ chức quản lý, tổ chức lại, giải thể doanh nghiệp. Người thành lập doanh nghiệp nộp hồ sơ đăng ký tại Phòng Đăng ký kinh doanh hoặc qua Cổng thông tin quốc gia về đăng ký doanh nghiệp; cơ quan đăng ký kinh doanh cấp Giấy chứng nhận đăng ký doanh nghiệp trong 03 ngày làm việc nếu hồ sơ hợp lệ.', null],
      ['36/2024/QH15', 'Luật Trật tự, an toàn giao thông đường bộ', 'LUAT', 'Quốc hội', '2024-06-27',
        'Luật có hiệu lực từ 01/01/2025, quy định về quy tắc giao thông đường bộ, điều kiện của người lái xe, đăng ký xe, giấy phép lái xe. Giấy phép lái xe được phân hạng lại (A1, A, B, C1, C, D1, D2, D, BE, C1E, CE, D1E, D2E, DE); người lái xe phải đổi/cấp lại giấy phép lái xe khi hết hạn hoặc thay đổi hạng xe.', null],
      ['43/2019/QH14', 'Luật Giáo dục', 'LUAT', 'Quốc hội', '2019-06-14',
        'Luật Giáo dục 2019 quy định hệ thống giáo dục quốc dân, tuyển sinh các cấp học. Trẻ em trong độ tuổi vào lớp 1 (đủ 6 tuổi) được tuyển sinh theo tuyến cư trú do UBND cấp xã/phòng giáo dục phân tuyến; cha mẹ nộp hồ sơ tuyển sinh trực tuyến hoặc trực tiếp tại trường theo tuyến.', null],
      ['15/2023/QH15', 'Luật Khám bệnh, chữa bệnh', 'LUAT', 'Quốc hội', '2023-01-09',
        'Luật Khám bệnh, chữa bệnh 2023 (hiệu lực 01/01/2024) quy định quyền, nghĩa vụ của người bệnh, cơ sở khám chữa bệnh, cấp giấy chứng sinh, giấy chứng nhận nghỉ việc hưởng bảo hiểm xã hội. Cơ sở khám chữa bệnh có trách nhiệm cấp giấy chứng sinh cho trẻ sinh ra tại cơ sở trong vòng 24 giờ.', null],
      ['38/2019/QH14', 'Luật Quản lý thuế', 'LUAT', 'Quốc hội', '2019-06-13',
        'Luật Quản lý thuế 2019 quy định việc đăng ký, kê khai, nộp thuế, quyết toán thuế. Cá nhân có thu nhập chịu thuế thực hiện đăng ký mã số thuế tại cơ quan thuế hoặc tự động qua tổ chức chi trả thu nhập; quyết toán thuế thu nhập cá nhân hàng năm nộp trước ngày 31/3 (cá nhân trực tiếp quyết toán) hoặc 30/4 (tổ chức quyết toán thay).', null],
      ['45/2019/QH14', 'Bộ luật Lao động', 'LUAT', 'Quốc hội', '2019-11-20',
        'Bộ luật Lao động 2019 quy định về hợp đồng lao động, tiền lương, bảo hiểm thất nghiệp, giấy phép lao động cho người nước ngoài làm việc tại Việt Nam. Người sử dụng lao động sử dụng lao động nước ngoài phải xin cấp giấy phép lao động trước khi người lao động bắt đầu làm việc, trừ trường hợp được miễn.', null],
      ['168/2024/ND-CP', 'Nghị định quy định xử phạt vi phạm hành chính về trật tự, an toàn giao thông đường bộ', 'NGHI_DINH', 'Chính phủ', '2024-12-26',
        'Nghị định 168/2024/NĐ-CP (hiệu lực 01/01/2025) quy định mức xử phạt vi phạm giao thông đường bộ, trừ điểm giấy phép lái xe. Mỗi giấy phép lái xe có 12 điểm; vi phạm bị trừ điểm theo hành vi, giấy phép hết điểm bị tước quyền sử dụng và phải sát hạch lại.', null],
      ['01/2021/ND-CP', 'Nghị định về đăng ký doanh nghiệp', 'NGHI_DINH', 'Chính phủ', '2021-01-04',
        'Nghị định hướng dẫn trình tự, thủ tục đăng ký doanh nghiệp, đăng ký thay đổi nội dung đăng ký doanh nghiệp, giải thể doanh nghiệp qua Cổng thông tin quốc gia về đăng ký doanh nghiệp. Doanh nghiệp có thể nộp hồ sơ trực tuyến bằng chữ ký số hoặc tài khoản đăng ký kinh doanh.', null],
      ['58/2020/ND-CP', 'Nghị định quy định mức đóng bảo hiểm xã hội bắt buộc vào Quỹ bảo hiểm tai nạn lao động, bệnh nghề nghiệp', 'NGHI_DINH', 'Chính phủ', '2020-05-27',
        'Nghị định quy định mức đóng, phương thức đóng bảo hiểm xã hội bắt buộc của người sử dụng lao động vào Quỹ bảo hiểm tai nạn lao động, bệnh nghề nghiệp. Người sử dụng lao động đăng ký tham gia BHXH cho người lao động trong thời hạn 30 ngày kể từ ngày ký hợp đồng lao động.', null],
      ['12/2022/TT-BLDTBXH', 'Thông tư hướng dẫn thực hiện một số điều của Bộ luật Lao động về giấy phép lao động', 'THONG_TU', 'Bộ Lao động - Thương binh và Xã hội', '2022-06-30',
        'Thông tư hướng dẫn hồ sơ, trình tự cấp giấy phép lao động cho người nước ngoài làm việc tại Việt Nam. Hồ sơ nộp tại Sở Nội vụ hoặc Ban quản lý khu công nghiệp nơi người lao động dự kiến làm việc, thời hạn giải quyết 05 ngày làm việc.', null],
      ['30/2018/TT-BYT', 'Thông tư quy định về đơn thuốc và việc kê đơn thuốc hóa dược, sinh phẩm trong điều trị ngoại trú', 'THONG_TU', 'Bộ Y tế', '2018-10-30',
        'Thông tư quy định về mẫu giấy chứng nhận nghỉ việc hưởng bảo hiểm xã hội do cơ sở khám chữa bệnh cấp cho người lao động điều trị ngoại trú, làm căn cứ để cơ quan bảo hiểm xã hội giải quyết chế độ ốm đau.', null],
      ['22/2021/TT-BGDDT', 'Thông tư quy định về tuyển sinh trung học cơ sở và trung học phổ thông', 'THONG_TU', 'Bộ Giáo dục và Đào tạo', '2021-07-20',
        'Thông tư quy định quy chế tuyển sinh vào lớp 6, lớp 10 theo tuyến tuyển sinh do UBND cấp tỉnh quy định; riêng tuyển sinh lớp 1 giao Sở Giáo dục và Đào tạo hướng dẫn theo địa bàn cư trú, ưu tiên trẻ đúng độ tuổi cư trú trên địa bàn phường/xã.', null],
    ];
    for (const [code, title, docType, issuingBody, issuedDate, summary, version] of legalDocs) {
      await q.query(
        `INSERT INTO legal_documents (id, code, title, doc_type, issuing_body, issued_date, effective_date, status, summary, version)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $5, 'CON_HIEU_LUC', $6, $7)
         ON CONFLICT (code) DO NOTHING`,
        [code, title, docType, issuingBody, issuedDate, summary, version],
      );
    }

    // ---------- +22 thủ tục hành chính ----------
    interface SeedProcedure {
      code: string; name: string; agencyCode: string; category: string; expectedResult: string;
      description: string; fee: string; time: string; legalBasis: string; onlineLevel: string;
      steps: Array<[string, string]>; requirements: Array<[string, string, number]>;
    }
    const procedures: SeedProcedure[] = [
      {
        code: 'TT-TH-01', name: 'Đăng ký thuế thu nhập cá nhân', agencyCode: 'CT-HN',
        category: 'Thuế', expectedResult: 'Mã số thuế thu nhập cá nhân',
        description: 'Đăng ký mã số thuế cho cá nhân có thu nhập chịu thuế chưa có mã số thuế. Có thể đăng ký qua tổ chức chi trả thu nhập hoặc trực tiếp tại cơ quan thuế.',
        fee: 'Miễn phí', time: '03 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Quản lý thuế 38/2019/QH14',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai đăng ký thuế mẫu 05-ĐK-TCT; bản chụp thẻ căn cước.'],
          ['Nộp hồ sơ', 'Nộp trực tuyến qua Cổng thông tin điện tử Tổng cục Thuế hoặc tại cơ quan thuế quản lý trực tiếp.'],
          ['Nhận kết quả', 'Nhận mã số thuế cá nhân sau 03 ngày làm việc.'],
        ],
        requirements: [
          ['Tờ khai đăng ký thuế (mẫu 05-ĐK-TCT)', 'DOCUMENT', 1],
          ['Bản chụp thẻ căn cước/CCCD', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-TH-02', name: 'Quyết toán thuế thu nhập cá nhân', agencyCode: 'CT-HN',
        category: 'Thuế', expectedResult: 'Thông báo kết quả quyết toán thuế (hoàn thuế/nộp thêm)',
        description: 'Cá nhân có thu nhập từ tiền lương, tiền công tự quyết toán thuế thu nhập cá nhân hàng năm khi có số thuế nộp thừa cần hoàn hoặc thuộc diện phải tự quyết toán.',
        fee: 'Miễn phí', time: '06 ngày làm việc (hoàn thuế); trong ngày nếu chỉ nộp tờ khai', onlineLevel: 'MUC_4', legalBasis: 'Luật Quản lý thuế 38/2019/QH14',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai quyết toán thuế TNCN mẫu 02/QTT-TNCN; chứng từ khấu trừ thuế.'],
          ['Nộp hồ sơ', 'Nộp trực tuyến qua eTax Mobile hoặc Cổng dịch vụ công quốc gia trước 31/3 hàng năm.'],
          ['Nhận kết quả', 'Cơ quan thuế xử lý và hoàn thuế (nếu có) vào tài khoản đã đăng ký.'],
        ],
        requirements: [
          ['Tờ khai quyết toán thuế TNCN (mẫu 02/QTT-TNCN)', 'DOCUMENT', 1],
          ['Chứng từ khấu trừ thuế thu nhập cá nhân', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-TH-03', name: 'Đăng ký thuế hộ kinh doanh cá thể', agencyCode: 'CT-HCM',
        category: 'Thuế', expectedResult: 'Mã số thuế hộ kinh doanh',
        description: 'Đăng ký mã số thuế cho hộ kinh doanh cá thể mới thành lập, thực hiện đồng thời với đăng ký hộ kinh doanh tại UBND cấp xã.',
        fee: 'Miễn phí', time: '03 ngày làm việc', onlineLevel: 'MUC_3', legalBasis: 'Luật Quản lý thuế 38/2019/QH14',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai đăng ký thuế; bản chụp giấy chứng nhận đăng ký hộ kinh doanh.'],
          ['Nộp hồ sơ', 'Nộp tại Chi cục Thuế nơi đặt địa điểm kinh doanh.'],
          ['Nhận kết quả', 'Nhận mã số thuế hộ kinh doanh.'],
        ],
        requirements: [
          ['Tờ khai đăng ký thuế', 'DOCUMENT', 1],
          ['Giấy chứng nhận đăng ký hộ kinh doanh (bản chụp)', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-BH-01', name: 'Đăng ký tham gia bảo hiểm xã hội bắt buộc', agencyCode: 'BHXH-HN',
        category: 'Bảo hiểm xã hội', expectedResult: 'Sổ bảo hiểm xã hội',
        description: 'Người sử dụng lao động đăng ký tham gia BHXH bắt buộc cho người lao động trong thời hạn 30 ngày kể từ ngày ký hợp đồng lao động.',
        fee: 'Miễn phí', time: '05 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Bảo hiểm xã hội 41/2024/QH15',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai tham gia BHXH mẫu TK1-TS; hợp đồng lao động.'],
          ['Nộp hồ sơ', 'Nộp trực tuyến qua Cổng giao dịch điện tử BHXH Việt Nam hoặc tại cơ quan BHXH.'],
          ['Nhận kết quả', 'Nhận sổ BHXH và thẻ BHYT cho người lao động.'],
        ],
        requirements: [
          ['Tờ khai tham gia, điều chỉnh thông tin BHXH, BHYT (mẫu TK1-TS)', 'DOCUMENT', 1],
          ['Hợp đồng lao động (bản chụp)', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-BH-02', name: 'Cấp lại sổ bảo hiểm xã hội', agencyCode: 'BHXH-HN',
        category: 'Bảo hiểm xã hội', expectedResult: 'Sổ bảo hiểm xã hội (cấp lại)',
        description: 'Cấp lại sổ BHXH khi bị mất, hỏng hoặc thay đổi thông tin cá nhân (họ tên, ngày sinh...).',
        fee: 'Miễn phí', time: '10 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Bảo hiểm xã hội 41/2024/QH15',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai TK1-TS; sổ BHXH cũ (nếu còn, trường hợp hỏng/sai thông tin).'],
          ['Nộp hồ sơ', 'Nộp qua đơn vị sử dụng lao động hoặc trực tiếp tại cơ quan BHXH.'],
          ['Nhận kết quả', 'Nhận sổ BHXH cấp lại sau 10 ngày làm việc.'],
        ],
        requirements: [
          ['Tờ khai tham gia, điều chỉnh thông tin BHXH, BHYT (mẫu TK1-TS)', 'DOCUMENT', 1],
        ],
      },
      {
        code: 'TT-BH-03', name: 'Hưởng chế độ bảo hiểm xã hội một lần', agencyCode: 'BHXH-HCM',
        category: 'Bảo hiểm xã hội', expectedResult: 'Quyết định hưởng BHXH một lần',
        description: 'Giải quyết hưởng BHXH một lần cho người lao động đủ điều kiện theo quy định (nghỉ việc không tiếp tục tham gia, ra nước ngoài định cư, mắc bệnh hiểm nghèo...).',
        fee: 'Miễn phí', time: '05 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Bảo hiểm xã hội 41/2024/QH15',
        steps: [
          ['Chuẩn bị hồ sơ', 'Sổ BHXH; đơn đề nghị hưởng BHXH một lần (mẫu 14-HSB).'],
          ['Nộp hồ sơ', 'Nộp trực tuyến qua VssID/Cổng dịch vụ công hoặc tại cơ quan BHXH nơi cư trú.'],
          ['Nhận kết quả', 'Nhận tiền trợ cấp qua tài khoản ngân hàng hoặc bưu điện.'],
        ],
        requirements: [
          ['Sổ bảo hiểm xã hội', 'DOCUMENT', 1],
          ['Đơn đề nghị hưởng bảo hiểm xã hội một lần (mẫu 14-HSB)', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-BH-04', name: 'Cấp thẻ bảo hiểm y tế', agencyCode: 'BHXHVN',
        category: 'Bảo hiểm y tế', expectedResult: 'Thẻ bảo hiểm y tế',
        description: 'Cấp thẻ BHYT lần đầu cho người tham gia BHYT hộ gia đình hoặc theo nhóm đối tượng khác.',
        fee: 'Theo mức đóng BHYT hộ gia đình quy định hiện hành', time: '05 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Bảo hiểm xã hội 41/2024/QH15',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai tham gia BHYT (mẫu TK1-TS); danh sách thành viên hộ gia đình.'],
          ['Nộp hồ sơ và phí', 'Nộp tại đại lý thu BHXH-BHYT hoặc trực tuyến qua Cổng dịch vụ công.'],
          ['Nhận kết quả', 'Nhận thẻ BHYT bản giấy hoặc thẻ điện tử trên VssID.'],
        ],
        requirements: [
          ['Tờ khai tham gia, điều chỉnh thông tin BHXH, BHYT (mẫu TK1-TS)', 'DOCUMENT', 1],
        ],
      },
      {
        code: 'TT-YT-01', name: 'Cấp giấy chứng sinh', agencyCode: 'SYT-HN',
        category: 'Y tế', expectedResult: 'Giấy chứng sinh',
        description: 'Cơ sở khám chữa bệnh cấp giấy chứng sinh cho trẻ sinh ra tại cơ sở, làm căn cứ đăng ký khai sinh.',
        fee: 'Miễn phí', time: 'Trong 24 giờ kể từ khi sinh', onlineLevel: 'MUC_2', legalBasis: 'Luật Khám bệnh, chữa bệnh 15/2023/QH15',
        steps: [
          ['Khai báo thông tin', 'Cha mẹ hoặc người thân khai báo thông tin trẻ sơ sinh với cơ sở y tế.'],
          ['Cấp giấy chứng sinh', 'Cơ sở y tế lập và cấp giấy chứng sinh theo mẫu quy định.'],
        ],
        requirements: [
          ['Thẻ căn cước/CCCD của mẹ hoặc người giám hộ', 'DOCUMENT', 1],
        ],
      },
      {
        code: 'TT-YT-02', name: 'Cấp giấy chứng nhận nghỉ việc hưởng bảo hiểm xã hội', agencyCode: 'SYT-HN',
        category: 'Y tế', expectedResult: 'Giấy chứng nhận nghỉ việc hưởng BHXH',
        description: 'Cấp giấy chứng nhận nghỉ việc cho người lao động điều trị ngoại trú, làm căn cứ hưởng chế độ ốm đau từ BHXH.',
        fee: 'Miễn phí', time: 'Trong ngày khám', onlineLevel: 'MUC_2', legalBasis: 'Thông tư 30/2018/TT-BYT',
        steps: [
          ['Khám bệnh', 'Người lao động khám tại cơ sở khám chữa bệnh có thẩm quyền.'],
          ['Cấp giấy chứng nhận', 'Bác sĩ điều trị cấp giấy chứng nhận nghỉ việc hưởng BHXH theo mẫu.'],
        ],
        requirements: [
          ['Thẻ bảo hiểm y tế và giấy tờ tùy thân', 'DOCUMENT', 1],
        ],
      },
      {
        code: 'TT-GD-01', name: 'Tuyển sinh đầu cấp lớp 1', agencyCode: 'SGDDT-HN',
        category: 'Giáo dục', expectedResult: 'Quyết định/thông báo trúng tuyển lớp 1',
        description: 'Tuyển sinh trẻ đủ 6 tuổi vào lớp 1 theo tuyến cư trú, đăng ký trực tuyến qua hệ thống tuyển sinh đầu cấp của Sở Giáo dục và Đào tạo.',
        fee: 'Miễn phí', time: 'Theo lịch tuyển sinh hàng năm (thường tháng 7)', onlineLevel: 'MUC_4', legalBasis: 'Luật Giáo dục 43/2019/QH14; Thông tư 22/2021/TT-BGDĐT',
        steps: [
          ['Đăng ký trực tuyến', 'Cha mẹ đăng ký tuyển sinh trên hệ thống trực tuyến của Sở/Phòng Giáo dục.'],
          ['Nộp hồ sơ xác nhận', 'Nộp bản chụp giấy khai sinh, hộ khẩu/xác nhận cư trú tại trường theo tuyến.'],
          ['Nhận kết quả', 'Nhận thông báo trúng tuyển và nhập học theo lịch của trường.'],
        ],
        requirements: [
          ['Giấy khai sinh (bản sao)', 'DOCUMENT', 1],
          ['Giấy xác nhận thông tin cư trú', 'DOCUMENT', 2],
          ['Trẻ đủ 6 tuổi tính đến ngày 31/12 năm tuyển sinh', 'CONDITION', 3],
        ],
      },
      {
        code: 'TT-GD-02', name: 'Cấp bản sao văn bằng, chứng chỉ', agencyCode: 'SGDDT-HN',
        category: 'Giáo dục', expectedResult: 'Bản sao văn bằng/chứng chỉ từ sổ gốc',
        description: 'Cấp bản sao văn bằng, chứng chỉ từ sổ gốc cho người đã được cấp văn bằng, chứng chỉ nhưng bị mất hoặc cần bổ sung hồ sơ.',
        fee: '15.000đ/bản', time: '03 ngày làm việc', onlineLevel: 'MUC_3', legalBasis: 'Luật Giáo dục 43/2019/QH14',
        steps: [
          ['Nộp hồ sơ', 'Nộp đơn đề nghị cấp bản sao tại cơ sở giáo dục lưu sổ gốc hoặc Sở Giáo dục và Đào tạo.'],
          ['Nhận kết quả', 'Nhận bản sao văn bằng, chứng chỉ có xác nhận sao y từ sổ gốc.'],
        ],
        requirements: [
          ['Đơn đề nghị cấp bản sao văn bằng, chứng chỉ', 'DOCUMENT', 1],
          ['Thẻ căn cước/CCCD', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-GT-01', name: 'Cấp giấy phép lái xe', agencyCode: 'SGTVT-HN',
        category: 'Giao thông', expectedResult: 'Giấy phép lái xe',
        description: 'Cấp giấy phép lái xe hạng A1, A, B... lần đầu cho người đã hoàn thành đào tạo và đạt kỳ sát hạch lái xe.',
        fee: '135.000đ/lần sát hạch (hạng A1); 585.000đ/lần (hạng B) theo quy định hiện hành', time: '10 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Trật tự, an toàn giao thông đường bộ 36/2024/QH15',
        steps: [
          ['Đăng ký học và sát hạch', 'Đăng ký tại cơ sở đào tạo lái xe được cấp phép hoặc trực tuyến qua Cổng dịch vụ công.'],
          ['Tham dự sát hạch', 'Thi lý thuyết và thực hành tại trung tâm sát hạch lái xe.'],
          ['Nhận kết quả', 'Nhận giấy phép lái xe sau 10 ngày làm việc kể từ ngày đạt kết quả sát hạch.'],
        ],
        requirements: [
          ['Giấy khám sức khỏe của người lái xe theo mẫu quy định', 'DOCUMENT', 1],
          ['Bản chụp thẻ căn cước/CCCD', 'DOCUMENT', 2],
          ['Chứng chỉ hoàn thành khóa đào tạo lái xe', 'DOCUMENT', 3],
        ],
      },
      {
        code: 'TT-GT-02', name: 'Đổi giấy phép lái xe', agencyCode: 'SGTVT-HN',
        category: 'Giao thông', expectedResult: 'Giấy phép lái xe (cấp đổi)',
        description: 'Đổi giấy phép lái xe khi hết hạn, hư hỏng hoặc đổi giấy phép lái xe do ngành công an cấp trước đây sang mẫu mới.',
        fee: '135.000đ/lần', time: '05 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Trật tự, an toàn giao thông đường bộ 36/2024/QH15',
        steps: [
          ['Nộp hồ sơ', 'Nộp trực tuyến qua Cổng dịch vụ công hoặc trực tiếp tại Sở Giao thông vận tải.'],
          ['Khám sức khỏe', 'Nộp giấy khám sức khỏe hợp lệ.'],
          ['Nhận kết quả', 'Nhận giấy phép lái xe mới sau 05 ngày làm việc.'],
        ],
        requirements: [
          ['Giấy phép lái xe cũ', 'DOCUMENT', 1],
          ['Giấy khám sức khỏe của người lái xe', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-GT-03', name: 'Đăng ký xe mô tô, xe gắn máy', agencyCode: 'CA-HN',
        category: 'Giao thông', expectedResult: 'Giấy chứng nhận đăng ký xe và biển số xe',
        description: 'Đăng ký xe mô tô, xe gắn máy lần đầu cho chủ xe cư trú trên địa bàn, cấp biển số và giấy chứng nhận đăng ký xe.',
        fee: '50.000đ - 1.000.000đ tùy khu vực (theo quy định lệ phí trước bạ và cấp biển số)', time: 'Trong ngày làm việc', onlineLevel: 'MUC_3', legalBasis: 'Luật Trật tự, an toàn giao thông đường bộ 36/2024/QH15',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai đăng ký xe, hóa đơn/chứng từ chuyển quyền sở hữu xe.'],
          ['Nộp hồ sơ', 'Nộp tại đội đăng ký xe công an cấp huyện/xã nơi cư trú.'],
          ['Nộp lệ phí trước bạ và nhận biển số', 'Nộp lệ phí trước bạ, bấm biển số và nhận giấy chứng nhận đăng ký xe.'],
        ],
        requirements: [
          ['Tờ khai đăng ký xe', 'DOCUMENT', 1],
          ['Chứng từ nguồn gốc xe (hóa đơn bán hàng, chứng từ chuyển nhượng)', 'DOCUMENT', 2],
          ['Chứng từ nộp lệ phí trước bạ', 'DOCUMENT', 3],
        ],
      },
      {
        code: 'TT-DD-01', name: 'Đăng ký biến động đất đai (chuyển nhượng quyền sử dụng đất)', agencyCode: 'STP-HN',
        category: 'Đất đai', expectedResult: 'Giấy chứng nhận quyền sử dụng đất (cập nhật biến động)',
        description: 'Đăng ký biến động khi chuyển nhượng, tặng cho, thừa kế quyền sử dụng đất giữa các bên đã hoàn tất công chứng/chứng thực hợp đồng.',
        fee: 'Theo khung lệ phí địa chính do HĐND cấp tỉnh quy định', time: '10 ngày làm việc', onlineLevel: 'MUC_3', legalBasis: 'Luật Đất đai 31/2024/QH15',
        steps: [
          ['Công chứng hợp đồng', 'Các bên công chứng hợp đồng chuyển nhượng/tặng cho tại tổ chức hành nghề công chứng.'],
          ['Nộp hồ sơ đăng ký biến động', 'Nộp tại Văn phòng đăng ký đất đai hoặc bộ phận một cửa cấp xã.'],
          ['Nộp nghĩa vụ tài chính', 'Nộp thuế thu nhập cá nhân, lệ phí trước bạ (nếu có).'],
          ['Nhận kết quả', 'Nhận Giấy chứng nhận đã cập nhật biến động.'],
        ],
        requirements: [
          ['Hợp đồng chuyển nhượng/tặng cho đã công chứng', 'DOCUMENT', 1],
          ['Giấy chứng nhận quyền sử dụng đất (bản gốc)', 'DOCUMENT', 2],
          ['Chứng từ nộp thuế, lệ phí trước bạ', 'DOCUMENT', 3],
        ],
      },
      {
        code: 'TT-DD-02', name: 'Cấp giấy chứng nhận quyền sử dụng đất lần đầu', agencyCode: 'STP-HN',
        category: 'Đất đai', expectedResult: 'Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất',
        description: 'Cấp Giấy chứng nhận lần đầu cho người sử dụng đất đủ điều kiện, chưa được cấp giấy chứng nhận.',
        fee: 'Theo khung lệ phí địa chính do HĐND cấp tỉnh quy định', time: '30 ngày làm việc', onlineLevel: 'MUC_3', legalBasis: 'Luật Đất đai 31/2024/QH15',
        steps: [
          ['Nộp hồ sơ', 'Nộp tại Văn phòng đăng ký đất đai hoặc bộ phận một cửa cấp xã.'],
          ['Xác minh thực địa', 'Cơ quan đo đạc, xác minh hiện trạng và nguồn gốc sử dụng đất.'],
          ['Thực hiện nghĩa vụ tài chính', 'Nộp tiền sử dụng đất, lệ phí trước bạ (nếu thuộc diện phải nộp).'],
          ['Nhận kết quả', 'Nhận Giấy chứng nhận quyền sử dụng đất.'],
        ],
        requirements: [
          ['Đơn đăng ký, cấp Giấy chứng nhận quyền sử dụng đất (mẫu 04a/ĐK)', 'DOCUMENT', 1],
          ['Giấy tờ chứng minh nguồn gốc sử dụng đất (nếu có)', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-DN-01', name: 'Đăng ký thành lập doanh nghiệp', agencyCode: 'SKHDT-HN',
        category: 'Doanh nghiệp', expectedResult: 'Giấy chứng nhận đăng ký doanh nghiệp',
        description: 'Đăng ký thành lập doanh nghiệp mới (công ty TNHH, cổ phần, hợp danh, doanh nghiệp tư nhân) qua Phòng Đăng ký kinh doanh.',
        fee: '50.000đ (nộp trực tuyến được miễn lệ phí theo chính sách hiện hành)', time: '03 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Doanh nghiệp 59/2020/QH14; Nghị định 01/2021/NĐ-CP',
        steps: [
          ['Chuẩn bị hồ sơ', 'Giấy đề nghị đăng ký doanh nghiệp, điều lệ công ty, danh sách thành viên/cổ đông.'],
          ['Nộp hồ sơ trực tuyến', 'Nộp qua Cổng thông tin quốc gia về đăng ký doanh nghiệp bằng chữ ký số hoặc tài khoản đăng ký kinh doanh.'],
          ['Nhận kết quả', 'Nhận Giấy chứng nhận đăng ký doanh nghiệp sau 03 ngày làm việc.'],
        ],
        requirements: [
          ['Giấy đề nghị đăng ký doanh nghiệp', 'DOCUMENT', 1],
          ['Điều lệ công ty', 'DOCUMENT', 2],
          ['Danh sách thành viên/cổ đông sáng lập kèm bản chụp giấy tờ tùy thân', 'DOCUMENT', 3],
        ],
      },
      {
        code: 'TT-DN-02', name: 'Đăng ký thay đổi nội dung đăng ký doanh nghiệp', agencyCode: 'SKHDT-HN',
        category: 'Doanh nghiệp', expectedResult: 'Giấy chứng nhận đăng ký doanh nghiệp (đã cập nhật)',
        description: 'Đăng ký thay đổi tên, địa chỉ trụ sở, vốn điều lệ, người đại diện theo pháp luật hoặc ngành nghề kinh doanh của doanh nghiệp.',
        fee: '50.000đ (miễn phí nếu nộp trực tuyến theo chính sách hiện hành)', time: '03 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Doanh nghiệp 59/2020/QH14',
        steps: [
          ['Chuẩn bị hồ sơ', 'Thông báo thay đổi nội dung đăng ký doanh nghiệp; quyết định và biên bản họp (nếu có) về nội dung thay đổi.'],
          ['Nộp hồ sơ', 'Nộp trực tuyến qua Cổng thông tin quốc gia về đăng ký doanh nghiệp.'],
          ['Nhận kết quả', 'Nhận Giấy chứng nhận đăng ký doanh nghiệp mới.'],
        ],
        requirements: [
          ['Thông báo thay đổi nội dung đăng ký doanh nghiệp', 'DOCUMENT', 1],
          ['Quyết định, biên bản họp về nội dung thay đổi (nếu có)', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-DN-03', name: 'Giải thể doanh nghiệp', agencyCode: 'SKHDT-HN',
        category: 'Doanh nghiệp', expectedResult: 'Thông báo về việc giải thể doanh nghiệp trên Cổng thông tin quốc gia',
        description: 'Thủ tục giải thể doanh nghiệp tự nguyện khi doanh nghiệp đã thanh toán hết nợ và nghĩa vụ tài sản khác.',
        fee: 'Miễn phí', time: '05 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Luật Doanh nghiệp 59/2020/QH14',
        steps: [
          ['Thông qua quyết định giải thể', 'Chủ doanh nghiệp/Hội đồng thành viên/Đại hội đồng cổ đông thông qua quyết định giải thể.'],
          ['Thanh lý tài sản, thông báo chủ nợ', 'Thanh toán các khoản nợ, thông báo công khai trong 07 ngày làm việc.'],
          ['Nộp hồ sơ giải thể', 'Nộp hồ sơ đề nghị giải thể tại Phòng Đăng ký kinh doanh.'],
          ['Nhận kết quả', 'Cơ quan đăng ký kinh doanh cập nhật tình trạng pháp lý "đã giải thể".'],
        ],
        requirements: [
          ['Quyết định giải thể doanh nghiệp', 'DOCUMENT', 1],
          ['Danh sách chủ nợ và số nợ đã thanh toán (nếu có)', 'DOCUMENT', 2],
          ['Xác nhận không nợ thuế của cơ quan thuế', 'DOCUMENT', 3],
        ],
      },
      {
        code: 'TT-LD-01', name: 'Đăng ký hưởng trợ cấp thất nghiệp', agencyCode: 'SNV-HN',
        category: 'Lao động', expectedResult: 'Quyết định hưởng trợ cấp thất nghiệp',
        description: 'Người lao động đã chấm dứt hợp đồng lao động đăng ký hưởng trợ cấp thất nghiệp trong thời hạn 03 tháng kể từ ngày chấm dứt hợp đồng.',
        fee: 'Miễn phí', time: '20 ngày làm việc', onlineLevel: 'MUC_3', legalBasis: 'Bộ luật Lao động 45/2019/QH14',
        steps: [
          ['Nộp hồ sơ', 'Nộp đề nghị hưởng trợ cấp thất nghiệp tại trung tâm dịch vụ việc làm trong 03 tháng kể từ ngày nghỉ việc.'],
          ['Chờ xét duyệt', 'Trung tâm dịch vụ việc làm xem xét, ra quyết định hưởng trợ cấp.'],
          ['Nhận trợ cấp', 'Nhận tiền trợ cấp thất nghiệp hàng tháng qua tài khoản ngân hàng.'],
        ],
        requirements: [
          ['Đơn đề nghị hưởng trợ cấp thất nghiệp (theo mẫu)', 'DOCUMENT', 1],
          ['Quyết định thôi việc/chấm dứt hợp đồng lao động (bản chính hoặc sao y)', 'DOCUMENT', 2],
          ['Sổ bảo hiểm xã hội', 'DOCUMENT', 3],
        ],
      },
      {
        code: 'TT-LD-02', name: 'Cấp giấy phép lao động cho người nước ngoài', agencyCode: 'SNV-HN',
        category: 'Lao động', expectedResult: 'Giấy phép lao động',
        description: 'Cấp giấy phép lao động cho người lao động nước ngoài làm việc tại Việt Nam theo hợp đồng lao động hoặc di chuyển nội bộ doanh nghiệp.',
        fee: '600.000đ/giấy phép/vụ việc theo quy định hiện hành', time: '05 ngày làm việc', onlineLevel: 'MUC_4', legalBasis: 'Bộ luật Lao động 45/2019/QH14; Thông tư 12/2022/TT-BLĐTBXH',
        steps: [
          ['Xin chấp thuận nhu cầu sử dụng lao động', 'Người sử dụng lao động báo cáo giải trình nhu cầu sử dụng lao động nước ngoài.'],
          ['Nộp hồ sơ cấp giấy phép', 'Nộp hồ sơ trước ít nhất 15 ngày kể từ ngày người nước ngoài dự kiến bắt đầu làm việc.'],
          ['Nhận kết quả', 'Nhận giấy phép lao động sau 05 ngày làm việc.'],
        ],
        requirements: [
          ['Văn bản đề nghị cấp giấy phép lao động của người sử dụng lao động', 'DOCUMENT', 1],
          ['Giấy khám sức khỏe do cơ sở y tế nước ngoài/Việt Nam cấp', 'DOCUMENT', 2],
          ['Lý lịch tư pháp của người lao động nước ngoài', 'DOCUMENT', 3],
        ],
      },
      {
        code: 'TT-HT-03', name: 'Đăng ký khai tử', agencyCode: 'STP-DN',
        category: 'Hộ tịch', expectedResult: 'Trích lục khai tử',
        description: 'Đăng ký khai tử cho người chết trong thời hạn 15 ngày kể từ ngày có người chết, thực hiện tại UBND cấp xã nơi cư trú cuối cùng của người chết.',
        fee: 'Miễn phí (đăng ký đúng hạn)', time: 'Trong ngày làm việc', onlineLevel: 'MUC_2', legalBasis: 'Luật Hộ tịch 60/2014/QH13',
        steps: [
          ['Chuẩn bị hồ sơ', 'Giấy báo tử hoặc giấy tờ thay thế do cơ sở y tế/cơ quan có thẩm quyền cấp.'],
          ['Nộp hồ sơ', 'Nộp tại UBND cấp xã nơi cư trú cuối cùng của người chết.'],
          ['Nhận kết quả', 'Nhận trích lục khai tử trong ngày làm việc.'],
        ],
        requirements: [
          ['Giấy báo tử hoặc giấy tờ thay thế giấy báo tử', 'DOCUMENT', 1],
          ['Thẻ căn cước/CCCD của người đi khai tử', 'DOCUMENT', 2],
        ],
      },
    ];

    for (const p of procedures) {
      await q.query(
        `INSERT INTO administrative_procedures
           (id, code, name, description, agency_id, online_level, fee_text, processing_time_text, legal_basis_text, status, category, expected_result)
         VALUES (uuid_generate_v4(), $1, $2, $3,
                 (SELECT id FROM government_agencies WHERE code = $4), $5, $6, $7, $8, 'ACTIVE', $9, $10)
         ON CONFLICT (code) DO NOTHING`,
        [p.code, p.name, p.description, p.agencyCode, p.onlineLevel, p.fee, p.time, p.legalBasis, p.category, p.expectedResult],
      );
      for (let i = 0; i < p.steps.length; i++) {
        await q.query(
          `INSERT INTO procedure_steps (id, procedure_id, step_number, title, description)
           SELECT uuid_generate_v4(), id, $2::int, $3::varchar, $4::text FROM administrative_procedures WHERE code = $1
           ON CONFLICT ON CONSTRAINT "uq_procedure_steps_order" DO NOTHING`,
          [p.code, i + 1, p.steps[i][0], p.steps[i][1]],
        );
      }
      for (const [name, type, order] of p.requirements) {
        await q.query(
          `INSERT INTO procedure_requirements (id, procedure_id, name, requirement_type, sort_order)
           SELECT uuid_generate_v4(), id, $2::varchar, $3::requirement_type, $4::int
           FROM administrative_procedures WHERE code = $1
             AND NOT EXISTS (
               SELECT 1 FROM procedure_requirements r
               WHERE r.procedure_id = administrative_procedures.id AND r.name = $2
             )`,
          [p.code, name, type, order],
        );
      }
    }

    // ---------- Users: 1 admin + 5 citizen ----------
    const passwordHash = await hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
    interface SeedUser {
      email: string; fullName: string; phone: string; roleCode: 'ADMIN' | 'CITIZEN';
      nationalId?: string; dateOfBirth?: string; gender?: string; provinceCode?: string; addressDetail?: string;
    }
    const users: SeedUser[] = [
      { email: 'admin1@vaic.gov.vn', fullName: 'Quản trị viên hệ thống', phone: '0900000001', roleCode: 'ADMIN' },
      { email: 'citizen1@example.com', fullName: 'Nguyễn Văn An', phone: '0900000011', roleCode: 'CITIZEN',
        nationalId: '001099000011', dateOfBirth: '1995-03-12', gender: 'MALE', provinceCode: '01', addressDetail: 'Số 10 ngõ 5, Cầu Giấy, Hà Nội' },
      { email: 'citizen2@example.com', fullName: 'Trần Thị Bình', phone: '0900000012', roleCode: 'CITIZEN',
        nationalId: '001099000012', dateOfBirth: '1998-07-21', gender: 'FEMALE', provinceCode: '01', addressDetail: 'Số 22 Xã Đàn, Đống Đa, Hà Nội' },
      { email: 'citizen3@example.com', fullName: 'Lê Hoàng Cường', phone: '0900000013', roleCode: 'CITIZEN',
        nationalId: '079099000013', dateOfBirth: '1990-01-05', gender: 'MALE', provinceCode: '79', addressDetail: 'Số 5 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh' },
      { email: 'citizen4@example.com', fullName: 'Phạm Thị Dung', phone: '0900000014', roleCode: 'CITIZEN',
        nationalId: '079099000014', dateOfBirth: '2000-11-30', gender: 'FEMALE', provinceCode: '79', addressDetail: 'Số 88 Lê Văn Sỹ, Quận 3, TP. Hồ Chí Minh' },
      { email: 'citizen5@example.com', fullName: 'Hoàng Văn Em', phone: '0900000015', roleCode: 'CITIZEN',
        nationalId: '048099000015', dateOfBirth: '1988-09-17', gender: 'MALE', provinceCode: '48', addressDetail: 'Số 3 Bạch Đằng, Hải Châu, Đà Nẵng' },
    ];
    for (const u of users) {
      await q.query(
        `INSERT INTO users (id, email, password_hash, full_name, phone, status, version)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, 'ACTIVE', 1)
         ON CONFLICT DO NOTHING`,
        [u.email, passwordHash, u.fullName, u.phone],
      );
      await q.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT usr.id, r.id FROM users usr, roles r
         WHERE usr.email = $1 AND r.code = $2
         ON CONFLICT DO NOTHING`,
        [u.email, u.roleCode],
      );
      if (u.roleCode === 'CITIZEN') {
        await q.query(
          `INSERT INTO citizen_profiles (id, user_id, national_id, date_of_birth, gender, province_id, address_detail, version)
           SELECT uuid_generate_v4(), usr.id, $2, $3, $4::gender,
                  (SELECT id FROM administrative_units WHERE code = $5 AND type = 'PROVINCE'), $6, 1
           FROM users usr WHERE usr.email = $1
           ON CONFLICT DO NOTHING`,
          [u.email, u.nationalId, u.dateOfBirth, u.gender, u.provinceCode, u.addressDetail],
        );
      }
    }

    // ---------- Conversation mẫu + message ----------
    await q.query(
      `INSERT INTO conversations (id, user_id, title, channel, status, version)
       SELECT uuid_generate_v4(), id, 'Hỏi về thủ tục cấp thẻ căn cước', 'CHAT', 'ACTIVE', 1
       FROM users WHERE email = 'citizen1@example.com'
       ON CONFLICT DO NOTHING`,
    );
    await q.query(
      `INSERT INTO messages (id, conversation_id, sender_role, content, content_type)
       SELECT uuid_generate_v4(), c.id, 'USER', 'Tôi muốn làm thẻ căn cước lần đầu thì cần chuẩn bị giấy tờ gì?', 'TEXT'
       FROM conversations c
       JOIN users u ON u.id = c.user_id
       WHERE u.email = 'citizen1@example.com' AND c.title = 'Hỏi về thủ tục cấp thẻ căn cước'
         AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)`,
    );
    await q.query(
      `INSERT INTO messages (id, conversation_id, sender_role, content, content_type)
       SELECT uuid_generate_v4(), c.id, 'ASSISTANT',
         'Với thủ tục cấp thẻ căn cước lần đầu cho người từ đủ 14 tuổi, bạn không cần mang giấy tờ nếu thông tin trong Cơ sở dữ liệu quốc gia về dân cư đã chính xác. Nếu chưa có/chưa đúng, cần mang thêm giấy khai sinh hoặc giấy tờ hộ tịch. Thời gian xử lý là 07 ngày làm việc, miễn phí cho lần cấp đầu tiên.',
         'TEXT'
       FROM conversations c
       JOIN users u ON u.id = c.user_id
       WHERE u.email = 'citizen1@example.com' AND c.title = 'Hỏi về thủ tục cấp thẻ căn cước'
         AND (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) = 1`,
    );

    // ---------- Feedback mẫu ----------
    await q.query(
      `INSERT INTO feedbacks (id, message_id, user_id, rating, comment)
       SELECT uuid_generate_v4(), m.id, u.id, 1, 'Trả lời rõ ràng, đúng thứ mình cần.'
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       JOIN users u ON u.id = c.user_id
       WHERE u.email = 'citizen1@example.com' AND m.sender_role = 'ASSISTANT'
       ON CONFLICT DO NOTHING`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(
      `DELETE FROM feedbacks WHERE user_id IN (SELECT id FROM users WHERE email = 'citizen1@example.com')`,
    );
    await q.query(
      `DELETE FROM messages WHERE conversation_id IN (
         SELECT c.id FROM conversations c JOIN users u ON u.id = c.user_id
         WHERE u.email = 'citizen1@example.com' AND c.title = 'Hỏi về thủ tục cấp thẻ căn cước'
       )`,
    );
    await q.query(`DELETE FROM conversations WHERE title = 'Hỏi về thủ tục cấp thẻ căn cước'`);
    await q.query(
      `DELETE FROM citizen_profiles WHERE user_id IN (
         SELECT id FROM users WHERE email IN
         ('citizen1@example.com','citizen2@example.com','citizen3@example.com','citizen4@example.com','citizen5@example.com')
       )`,
    );
    await q.query(
      `DELETE FROM users WHERE email IN
       ('admin1@vaic.gov.vn','citizen1@example.com','citizen2@example.com','citizen3@example.com','citizen4@example.com','citizen5@example.com')`,
    );
    await q.query(`DELETE FROM administrative_procedures WHERE code LIKE 'TT-TH-%' OR code LIKE 'TT-BH-%'
      OR code LIKE 'TT-YT-%' OR code LIKE 'TT-GD-%' OR code LIKE 'TT-GT-%' OR code LIKE 'TT-DD-%'
      OR code LIKE 'TT-DN-%' OR code LIKE 'TT-LD-%' OR code = 'TT-HT-03'`);
    await q.query(
      `DELETE FROM legal_documents WHERE code IN
       ('41/2024/QH15','31/2024/QH15','59/2020/QH14','36/2024/QH15','43/2019/QH14','15/2023/QH15',
        '38/2019/QH14','45/2019/QH14','168/2024/ND-CP','01/2021/ND-CP','58/2020/ND-CP',
        '12/2022/TT-BLDTBXH','30/2018/TT-BYT','22/2021/TT-BGDDT')`,
    );
    await q.query(
      `DELETE FROM government_agencies WHERE code IN
       ('CT-HN','BHXH-HN','SYT-HN','SGDDT-HN','SGTVT-HN','SKHDT-HN','SNV-HN','CA-HCM','STP-HCM',
        'BHXH-HCM','CT-HCM','CA-DN','STP-DN','TCT-BTC','BHXHVN')`,
    );
    await q.query(
      `UPDATE administrative_procedures SET category = NULL, expected_result = NULL
       WHERE code IN ('TT-CC-01','TT-CC-02','TT-HC-01','TT-HT-01','TT-HT-02','TT-CT-01','TT-CT-02','TT-TP-01')`,
    );
  }
}
