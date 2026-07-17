import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed dữ liệu demo (đã báo cáo và duyệt ở PHASE 3):
 * - 34 tỉnh/thành (mô hình hành chính 2 cấp sau 01/07/2025)
 * - 5 cơ quan nhà nước
 * - 6 văn bản pháp luật (summary là nguồn RAG)
 * - 8 thủ tục hành chính phổ biến kèm các bước + giấy tờ
 * Idempotent theo mã code. KHÔNG chứa dữ liệu người dùng.
 */
export class SeedDemoData1784293000000 implements MigrationInterface {
  name = 'SeedDemoData1784293000000';

  public async up(q: QueryRunner): Promise<void> {
    // ---------- 34 tỉnh/thành ----------
    const provinces: Array<[string, string]> = [
      ['01', 'Thành phố Hà Nội'], ['79', 'Thành phố Hồ Chí Minh'], ['31', 'Thành phố Hải Phòng'],
      ['48', 'Thành phố Đà Nẵng'], ['92', 'Thành phố Cần Thơ'], ['46', 'Thành phố Huế'],
      ['08', 'Tỉnh Tuyên Quang'], ['10', 'Tỉnh Lào Cai'], ['19', 'Tỉnh Thái Nguyên'],
      ['25', 'Tỉnh Phú Thọ'], ['24', 'Tỉnh Bắc Ninh'], ['33', 'Tỉnh Hưng Yên'],
      ['37', 'Tỉnh Ninh Bình'], ['22', 'Tỉnh Quảng Ninh'], ['38', 'Tỉnh Thanh Hóa'],
      ['40', 'Tỉnh Nghệ An'], ['42', 'Tỉnh Hà Tĩnh'], ['44', 'Tỉnh Quảng Trị'],
      ['51', 'Tỉnh Quảng Ngãi'], ['52', 'Tỉnh Gia Lai'], ['56', 'Tỉnh Khánh Hòa'],
      ['68', 'Tỉnh Lâm Đồng'], ['66', 'Tỉnh Đắk Lắk'], ['75', 'Tỉnh Đồng Nai'],
      ['72', 'Tỉnh Tây Ninh'], ['86', 'Tỉnh Vĩnh Long'], ['87', 'Tỉnh Đồng Tháp'],
      ['96', 'Tỉnh Cà Mau'], ['91', 'Tỉnh An Giang'], ['20', 'Tỉnh Lạng Sơn'],
      ['04', 'Tỉnh Cao Bằng'], ['11', 'Tỉnh Điện Biên'], ['12', 'Tỉnh Lai Châu'],
      ['14', 'Tỉnh Sơn La'],
    ];
    for (const [code, name] of provinces) {
      await q.query(
        `INSERT INTO administrative_units (id, code, name, type)
         VALUES (uuid_generate_v4(), $1, $2, 'PROVINCE') ON CONFLICT (code) DO NOTHING`,
        [code, name],
      );
    }

    // ---------- Cơ quan nhà nước ----------
    const agencies: Array<[string, string, string, string | null, string | null, string | null]> = [
      // [code, name, level, address, phone, website]
      ['C06-BCA', 'Cục Cảnh sát quản lý hành chính về trật tự xã hội (C06) - Bộ Công an', 'CENTRAL',
        '47 Phạm Văn Đồng, Hà Nội', '069.2343647', 'https://bocongan.gov.vn'],
      ['A08-BCA', 'Cục Quản lý xuất nhập cảnh - Bộ Công an', 'CENTRAL',
        '44-46 Trần Phú, Ba Đình, Hà Nội', '069.2326925', 'https://xuatnhapcanh.gov.vn'],
      ['CA-HN', 'Công an Thành phố Hà Nội', 'PROVINCE',
        '87 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', '069.2196204', 'https://congan.hanoi.gov.vn'],
      ['STP-HN', 'Sở Tư pháp Thành phố Hà Nội', 'PROVINCE',
        '221 Trần Phú, Hà Đông, Hà Nội', '024.33546151', 'https://sotuphap.hanoi.gov.vn'],
      ['TTHCC-HN', 'Trung tâm Phục vụ hành chính công Thành phố Hà Nội', 'PROVINCE',
        '197 Nghi Tàm, Tây Hồ, Hà Nội', '024.32171878', 'https://dichvucong.hanoi.gov.vn'],
    ];
    for (const [code, name, level, address, phone, website] of agencies) {
      await q.query(
        `INSERT INTO government_agencies (id, code, name, level, address, phone, website, admin_unit_id)
         VALUES (uuid_generate_v4(), $1, $2, $3::agency_level, $4, $5, $6,
                 CASE WHEN $3::text = 'PROVINCE' THEN (SELECT id FROM administrative_units WHERE code = '01') END)
         ON CONFLICT (code) DO NOTHING`,
        [code, name, level, address, phone, website],
      );
    }

    // ---------- Văn bản pháp luật (summary = nội dung RAG) ----------
    const legalDocs: Array<[string, string, string, string, string, string]> = [
      // [code, title, docType, issuingBody, issuedDate, summary]
      ['26/2023/QH15', 'Luật Căn cước', 'LUAT', 'Quốc hội', '2023-11-27',
        'Luật Căn cước 2023 có hiệu lực từ 01/7/2024, quy định về Cơ sở dữ liệu quốc gia về dân cư, thẻ căn cước và căn cước điện tử. Công dân Việt Nam từ đủ 14 tuổi trở lên phải thực hiện thủ tục cấp thẻ căn cước; người dưới 14 tuổi được cấp theo nhu cầu. Thẻ căn cước cấp cho người từ đủ 14 tuổi có giá trị sử dụng đến khi đủ 25 tuổi, 40 tuổi và 60 tuổi thì phải cấp đổi. Khi cấp thẻ, cơ quan quản lý thu nhận thông tin sinh trắc học gồm ảnh khuôn mặt, vân tay và mống mắt. Thẻ căn cước công dân (CCCD) đã cấp trước ngày 01/7/2024 vẫn có giá trị sử dụng đến hết thời hạn in trên thẻ.'],
      ['70/2024/ND-CP', 'Nghị định quy định chi tiết một số điều và biện pháp thi hành Luật Căn cước', 'NGHI_DINH', 'Chính phủ', '2024-06-25',
        'Nghị định 70/2024/NĐ-CP hướng dẫn thi hành Luật Căn cước: quy định trình tự cấp, cấp đổi, cấp lại thẻ căn cước tại cơ quan quản lý căn cước hoặc qua Cổng dịch vụ công quốc gia và ứng dụng VNeID. Thời hạn giải quyết cấp thẻ căn cước là 07 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ. Người dân có thể lựa chọn nhận thẻ tại cơ quan cấp hoặc trả qua dịch vụ bưu chính công ích.'],
      ['60/2014/QH13', 'Luật Hộ tịch', 'LUAT', 'Quốc hội', '2014-11-20',
        'Luật Hộ tịch quy định việc đăng ký khai sinh, kết hôn, khai tử và các việc hộ tịch khác. Trẻ em phải được đăng ký khai sinh trong thời hạn 60 ngày kể từ ngày sinh; Ủy ban nhân dân cấp xã nơi cư trú của cha hoặc mẹ thực hiện đăng ký khai sinh và việc đăng ký khai sinh được miễn lệ phí đối với trường hợp đúng hạn. Đăng ký kết hôn được thực hiện tại UBND cấp xã nơi cư trú của một trong hai bên nam nữ; hai bên phải có mặt khi trao Giấy chứng nhận kết hôn.'],
      ['68/2020/QH14', 'Luật Cư trú', 'LUAT', 'Quốc hội', '2020-11-13',
        'Luật Cư trú 2020 quản lý cư trú bằng phương thức điện tử trên Cơ sở dữ liệu quốc gia về dân cư, bãi bỏ sổ hộ khẩu giấy. Công dân đăng ký thường trú khi có chỗ ở hợp pháp; đăng ký tạm trú khi sinh sống tại chỗ ở hợp pháp ngoài nơi thường trú từ 30 ngày trở lên, thời hạn tạm trú tối đa 02 năm và được gia hạn nhiều lần. Hồ sơ đăng ký cư trú nộp tại công an cấp xã nơi cư trú hoặc trực tuyến qua Cổng dịch vụ công.'],
      ['49/2019/QH14', 'Luật Xuất cảnh, nhập cảnh của công dân Việt Nam', 'LUAT', 'Quốc hội', '2019-11-22',
        'Luật quy định về hộ chiếu và giấy tờ xuất nhập cảnh của công dân Việt Nam. Hộ chiếu phổ thông cấp cho người từ đủ 14 tuổi có thời hạn 10 năm, người chưa đủ 14 tuổi có thời hạn 05 năm và không được gia hạn. Công dân đề nghị cấp hộ chiếu lần đầu tại cơ quan quản lý xuất nhập cảnh công an cấp tỉnh nơi cư trú; từ lần thứ hai được thực hiện tại bất kỳ cơ quan quản lý xuất nhập cảnh nào hoặc trực tuyến qua Cổng dịch vụ công.'],
      ['12/2024/TT-BCA', 'Thông tư quy định về mẫu thẻ căn cước, mẫu giấy chứng nhận căn cước', 'THONG_TU', 'Bộ Công an', '2024-04-15',
        'Thông tư của Bộ Công an quy định mẫu thẻ căn cước mới áp dụng từ 01/7/2024: thẻ gắn chip điện tử, mặt trước in số định danh cá nhân 12 chữ số, họ tên, ngày sinh; mặt sau chứa thông tin nơi cư trú, nơi đăng ký khai sinh và mã QR. Thẻ căn cước mẫu mới không còn in vân tay và đổi mục "quê quán" thành "nơi đăng ký khai sinh".'],
    ];
    for (const [code, title, docType, issuingBody, issuedDate, summary] of legalDocs) {
      await q.query(
        `INSERT INTO legal_documents (id, code, title, doc_type, issuing_body, issued_date, effective_date, status, summary)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $5, 'CON_HIEU_LUC', $6)
         ON CONFLICT (code) DO NOTHING`,
        [code, title, docType, issuingBody, issuedDate, summary],
      );
    }

    // ---------- Thủ tục hành chính ----------
    interface SeedProcedure {
      code: string; name: string; agencyCode: string; description: string;
      fee: string; time: string; legalBasis: string; onlineLevel: string;
      steps: Array<[string, string]>; requirements: Array<[string, string, number]>;
    }
    const procedures: SeedProcedure[] = [
      {
        code: 'TT-CC-01', name: 'Cấp thẻ căn cước cho người từ đủ 14 tuổi', agencyCode: 'C06-BCA',
        description: 'Cấp thẻ căn cước lần đầu cho công dân Việt Nam từ đủ 14 tuổi trở lên. Thực hiện tại cơ quan quản lý căn cước công an cấp tỉnh/xã nơi cư trú hoặc đặt lịch qua VNeID.',
        fee: 'Miễn phí (cấp lần đầu)', time: '07 ngày làm việc', onlineLevel: 'MUC_3',
        legalBasis: 'Luật Căn cước 26/2023/QH15; Nghị định 70/2024/NĐ-CP',
        steps: [
          ['Đặt lịch hẹn', 'Đặt lịch qua Cổng dịch vụ công/VNeID hoặc đến trực tiếp cơ quan quản lý căn cước nơi cư trú.'],
          ['Cung cấp thông tin', 'Cán bộ đối chiếu thông tin trong Cơ sở dữ liệu quốc gia về dân cư; công dân bổ sung, cập nhật nếu có thay đổi.'],
          ['Thu nhận sinh trắc học', 'Chụp ảnh khuôn mặt, thu nhận vân tay và mống mắt.'],
          ['Nhận kết quả', 'Nhận thẻ tại cơ quan cấp hoặc qua bưu chính công ích sau 07 ngày làm việc.'],
        ],
        requirements: [
          ['Thông tin trong Cơ sở dữ liệu quốc gia về dân cư (không cần mang giấy tờ nếu thông tin đã chính xác)', 'CONDITION', 1],
          ['Giấy khai sinh hoặc giấy tờ hộ tịch (nếu thông tin dân cư chưa có/chưa đúng)', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-CC-02', name: 'Cấp đổi, cấp lại thẻ căn cước', agencyCode: 'C06-BCA',
        description: 'Cấp đổi thẻ khi đến tuổi phải đổi (25, 40, 60 tuổi), thẻ hư hỏng, thay đổi thông tin; cấp lại khi bị mất thẻ. Có thể thực hiện trực tuyến qua Cổng dịch vụ công.',
        fee: 'Cấp đổi 50.000đ/thẻ; cấp lại 70.000đ/thẻ (nộp trực tuyến giảm 50% theo chính sách hiện hành)', time: '07 ngày làm việc', onlineLevel: 'MUC_4',
        legalBasis: 'Luật Căn cước 26/2023/QH15; Nghị định 70/2024/NĐ-CP; Thông tư 12/2024/TT-BCA',
        steps: [
          ['Nộp hồ sơ', 'Nộp trực tuyến trên Cổng dịch vụ công quốc gia/VNeID hoặc trực tiếp tại cơ quan quản lý căn cước.'],
          ['Thu nhận sinh trắc học', 'Đến điểm thu nhận theo lịch hẹn để chụp ảnh, lấy vân tay, mống mắt (nếu cấp đổi).'],
          ['Nộp lệ phí', 'Thanh toán trực tuyến hoặc tại quầy.'],
          ['Nhận kết quả', 'Nhận thẻ mới tại cơ quan hoặc qua bưu chính.'],
        ],
        requirements: [
          ['Thẻ căn cước/CCCD cũ (với cấp đổi; nộp lại khi nhận thẻ mới)', 'DOCUMENT', 1],
          ['Đơn trình báo mất thẻ hoặc xác nhận của cơ quan công an (với cấp lại do mất)', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-HC-01', name: 'Cấp hộ chiếu phổ thông trong nước', agencyCode: 'A08-BCA',
        description: 'Cấp hộ chiếu phổ thông không gắn chip hoặc gắn chip cho công dân Việt Nam. Cấp lần đầu tại công an cấp tỉnh nơi cư trú; từ lần 2 tại bất kỳ đâu hoặc trực tuyến.',
        fee: '200.000đ/lần cấp (nộp trực tuyến được giảm theo chính sách hiện hành)', time: '08 ngày làm việc (cấp tỉnh); 05 ngày làm việc (Cục Quản lý XNC)', onlineLevel: 'MUC_4',
        legalBasis: 'Luật Xuất cảnh, nhập cảnh của công dân Việt Nam 49/2019/QH14',
        steps: [
          ['Chuẩn bị hồ sơ', 'Điền tờ khai TK01 (trực tuyến hoặc bản giấy), chuẩn bị ảnh 4x6 nền trắng.'],
          ['Nộp hồ sơ', 'Nộp trực tuyến qua Cổng dịch vụ công Bộ Công an hoặc trực tiếp tại cơ quan quản lý xuất nhập cảnh.'],
          ['Nộp lệ phí', 'Thanh toán 200.000đ trực tuyến hoặc tại quầy.'],
          ['Nhận hộ chiếu', 'Nhận trực tiếp hoặc qua bưu chính sau 05-08 ngày làm việc.'],
        ],
        requirements: [
          ['Tờ khai đề nghị cấp hộ chiếu (mẫu TK01)', 'DOCUMENT', 1],
          ['02 ảnh 4x6cm nền trắng, chụp không quá 6 tháng', 'DOCUMENT', 2],
          ['Thẻ căn cước/CCCD còn giá trị (xuất trình khi nộp trực tiếp)', 'DOCUMENT', 3],
          ['Hộ chiếu cũ (nếu cấp từ lần thứ hai)', 'DOCUMENT', 4],
        ],
      },
      {
        code: 'TT-HT-01', name: 'Đăng ký khai sinh', agencyCode: 'STP-HN',
        description: 'Đăng ký khai sinh cho trẻ em trong thời hạn 60 ngày kể từ ngày sinh tại UBND cấp xã nơi cư trú của cha hoặc mẹ. Có thể thực hiện liên thông cùng đăng ký thường trú và cấp thẻ BHYT.',
        fee: 'Miễn lệ phí (đăng ký đúng hạn)', time: 'Trong ngày làm việc', onlineLevel: 'MUC_3',
        legalBasis: 'Luật Hộ tịch 60/2014/QH13',
        steps: [
          ['Chuẩn bị hồ sơ', 'Giấy chứng sinh do cơ sở y tế cấp; giấy tờ tùy thân và giấy chứng nhận kết hôn của cha mẹ (nếu có).'],
          ['Nộp hồ sơ', 'Nộp tại UBND cấp xã nơi cư trú của cha/mẹ hoặc trực tuyến (dịch vụ công liên thông).'],
          ['Nhận kết quả', 'Nhận Giấy khai sinh trong ngày; trẻ được cấp số định danh cá nhân.'],
        ],
        requirements: [
          ['Giấy chứng sinh (bản chính)', 'DOCUMENT', 1],
          ['Giấy chứng nhận kết hôn của cha mẹ (nếu cha mẹ có đăng ký kết hôn)', 'DOCUMENT', 2],
          ['Thẻ căn cước/CCCD của người đi đăng ký', 'DOCUMENT', 3],
        ],
      },
      {
        code: 'TT-HT-02', name: 'Đăng ký kết hôn', agencyCode: 'STP-HN',
        description: 'Đăng ký kết hôn giữa công dân Việt Nam thực hiện tại UBND cấp xã nơi cư trú của một trong hai bên. Nam từ đủ 20 tuổi, nữ từ đủ 18 tuổi, tự nguyện và không thuộc trường hợp cấm kết hôn.',
        fee: 'Miễn lệ phí (kết hôn trong nước)', time: 'Trong ngày làm việc; xác minh tối đa 05 ngày', onlineLevel: 'MUC_2',
        legalBasis: 'Luật Hộ tịch 60/2014/QH13; Luật Hôn nhân và gia đình 52/2014/QH13',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai đăng ký kết hôn; giấy xác nhận tình trạng hôn nhân (nếu đăng ký tại nơi không thường trú).'],
          ['Nộp hồ sơ', 'Hai bên nộp tại UBND cấp xã nơi cư trú của một trong hai bên.'],
          ['Trao giấy chứng nhận', 'Hai bên cùng có mặt ký Sổ hộ tịch và nhận Giấy chứng nhận kết hôn.'],
        ],
        requirements: [
          ['Tờ khai đăng ký kết hôn (theo mẫu)', 'DOCUMENT', 1],
          ['Thẻ căn cước/CCCD hoặc hộ chiếu của hai bên', 'DOCUMENT', 2],
          ['Giấy xác nhận tình trạng hôn nhân (khi cần)', 'DOCUMENT', 3],
          ['Nam đủ 20 tuổi, nữ đủ 18 tuổi, tự nguyện kết hôn', 'CONDITION', 4],
        ],
      },
      {
        code: 'TT-CT-01', name: 'Đăng ký thường trú', agencyCode: 'CA-HN',
        description: 'Đăng ký nơi thường trú khi công dân có chỗ ở hợp pháp. Nộp hồ sơ tại công an cấp xã nơi cư trú hoặc trực tuyến qua Cổng dịch vụ công/VNeID.',
        fee: '20.000đ/lần (trực tiếp); 10.000đ/lần (trực tuyến)', time: '07 ngày làm việc', onlineLevel: 'MUC_4',
        legalBasis: 'Luật Cư trú 68/2020/QH14',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai thay đổi thông tin cư trú (CT01); giấy tờ chứng minh chỗ ở hợp pháp.'],
          ['Nộp hồ sơ', 'Nộp tại công an cấp xã nơi cư trú hoặc trực tuyến qua VNeID.'],
          ['Nhận kết quả', 'Thông tin thường trú được cập nhật vào Cơ sở dữ liệu về cư trú; nhận thông báo kết quả.'],
        ],
        requirements: [
          ['Tờ khai thay đổi thông tin cư trú (mẫu CT01)', 'DOCUMENT', 1],
          ['Giấy tờ chứng minh chỗ ở hợp pháp (sổ đỏ, hợp đồng thuê, văn bản cho mượn/ở nhờ...)', 'DOCUMENT', 2],
          ['Ý kiến đồng ý của chủ hộ/chủ sở hữu (khi đăng ký vào chỗ ở của người khác)', 'DOCUMENT', 3],
        ],
      },
      {
        code: 'TT-CT-02', name: 'Đăng ký tạm trú', agencyCode: 'CA-HN',
        description: 'Bắt buộc khi sinh sống tại chỗ ở hợp pháp ngoài nơi thường trú từ 30 ngày trở lên. Thời hạn tạm trú tối đa 02 năm, được gia hạn nhiều lần.',
        fee: '15.000đ/lần (trực tiếp); 7.000đ/lần (trực tuyến)', time: '03 ngày làm việc', onlineLevel: 'MUC_4',
        legalBasis: 'Luật Cư trú 68/2020/QH14',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai CT01; giấy tờ chứng minh chỗ ở hợp pháp đang tạm trú.'],
          ['Nộp hồ sơ', 'Nộp tại công an cấp xã nơi tạm trú hoặc trực tuyến qua VNeID.'],
          ['Nhận kết quả', 'Thông tin tạm trú được cập nhật vào Cơ sở dữ liệu về cư trú sau 03 ngày làm việc.'],
        ],
        requirements: [
          ['Tờ khai thay đổi thông tin cư trú (mẫu CT01)', 'DOCUMENT', 1],
          ['Giấy tờ chứng minh chỗ ở hợp pháp (hợp đồng thuê nhà...)', 'DOCUMENT', 2],
        ],
      },
      {
        code: 'TT-TP-01', name: 'Cấp Phiếu lý lịch tư pháp', agencyCode: 'STP-HN',
        description: 'Cấp Phiếu lý lịch tư pháp số 1, số 2 cho công dân phục vụ xin việc, du học, định cư... Nộp tại Sở Tư pháp nơi cư trú hoặc trực tuyến qua VNeID.',
        fee: '200.000đ/lần/người (giảm còn 100.000đ với sinh viên, người thuộc hộ nghèo)', time: '10 ngày làm việc (tối đa 15 ngày nếu cần xác minh)', onlineLevel: 'MUC_4',
        legalBasis: 'Luật Lý lịch tư pháp 28/2009/QH12',
        steps: [
          ['Chuẩn bị hồ sơ', 'Tờ khai yêu cầu cấp Phiếu lý lịch tư pháp; bản chụp thẻ căn cước.'],
          ['Nộp hồ sơ', 'Nộp trực tuyến qua VNeID/Cổng dịch vụ công hoặc trực tiếp tại Sở Tư pháp.'],
          ['Nộp phí và chờ xác minh', 'Thanh toán phí; cơ quan tra cứu, xác minh thông tin án tích.'],
          ['Nhận kết quả', 'Nhận phiếu bản giấy hoặc bản điện tử trên VNeID sau 10 ngày làm việc.'],
        ],
        requirements: [
          ['Tờ khai yêu cầu cấp Phiếu lý lịch tư pháp', 'DOCUMENT', 1],
          ['Bản chụp thẻ căn cước/CCCD hoặc hộ chiếu', 'DOCUMENT', 2],
        ],
      },
    ];

    for (const p of procedures) {
      await q.query(
        `INSERT INTO administrative_procedures
           (id, code, name, description, agency_id, online_level, fee_text, processing_time_text, legal_basis_text, status)
         VALUES (uuid_generate_v4(), $1, $2, $3,
                 (SELECT id FROM government_agencies WHERE code = $4), $5, $6, $7, $8, 'ACTIVE')
         ON CONFLICT (code) DO NOTHING`,
        [p.code, p.name, p.description, p.agencyCode, p.onlineLevel, p.fee, p.time, p.legalBasis],
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
  }

  public async down(q: QueryRunner): Promise<void> {
    // Xóa theo thứ tự phụ thuộc FK (steps/requirements xóa theo CASCADE của procedure)
    await q.query(`DELETE FROM administrative_procedures WHERE code LIKE 'TT-%'`);
    await q.query(
      `DELETE FROM legal_documents WHERE code IN
       ('26/2023/QH15','70/2024/ND-CP','60/2014/QH13','68/2020/QH14','49/2019/QH14','12/2024/TT-BCA')`,
    );
    await q.query(
      `DELETE FROM government_agencies WHERE code IN ('C06-BCA','A08-BCA','CA-HN','STP-HN','TTHCC-HN')`,
    );
    await q.query(`DELETE FROM administrative_units WHERE type = 'PROVINCE'`);
  }
}
