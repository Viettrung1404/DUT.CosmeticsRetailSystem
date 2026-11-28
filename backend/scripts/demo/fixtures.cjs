const {id}=require('../catalog/normalize.cjs');
const demoId=(kind,key)=>id(`demo-v1:${kind}:${key}`);
const ANCHOR=new Date('2026-10-27T03:00:00Z');
const ACTIVE_START=new Date('2026-10-01T00:00:00Z');
const ACTIVE_END=new Date('2027-10-27T00:00:00Z');
const FLASH_SALE_END=new Date('2030-12-31T16:59:59.999Z');

const SETTINGS=[
  {key:'loyalty_config',group:'loyalty',value:{point_rate:0.01,point_value_vnd:1}},
  {key:'loyalty_rewards',group:'loyalty',value:{rewards:[
    {code:'GLOWUP-5K',version:'demo-v1',pointsCost:5000,discountType:'FIXED_AMOUNT',discountValue:5000,minOrderAmount:100000,validityDays:30},
    {code:'GLOWUP-20K',version:'demo-v1',pointsCost:20000,discountType:'FIXED_AMOUNT',discountValue:20000,minOrderAmount:200000,validityDays:30},
  ]}},
  {key:'return_policy',group:'returns',value:{version:'demo-v1',allocation:'PROPORTIONAL',refundPointsAs:'POINTS',exchangeShippingFee:30000,quoteMinutes:30,allowDifferenceCod:true}},
  {key:'return_accounting',group:'returns',value:{earnedPointsReversal:'PROPORTIONAL',allowPointDebt:true,stats:'NET_CASH_VALUE',totalOrdersMode:'KEEP_COMPLETED_PURCHASES'}},
  {key:'carrier_tracking_urls',group:'shipping',value:{}},
];

const page=(slug,title,paragraphs)=>({id:demoId('page',slug),slug,title,content:paragraphs.map(p=>`<p>${p}</p>`).join(''),metaTitle:title+' | GlowUp',metaDescription:paragraphs[0].slice(0,160),isPublished:true});
const PAGES=[
  page('gioi-thieu','Về GlowUp',[
    'GlowUp là không gian mua sắm mỹ phẩm kết hợp website và hệ thống năm cửa hàng. Bạn có thể khám phá sản phẩm theo danh mục, thương hiệu và các lựa chọn dung tích, màu sắc.',
    'Mỗi trang sản phẩm hiển thị thông tin quy cách, giá và bộ ảnh để bạn đối chiếu trước khi đặt hàng. Thông tin thành phần được trình bày theo dữ liệu công bố của sản phẩm.',
    'Đội ngũ tại cửa hàng hỗ trợ kiểm tra biến thể, tra cứu đơn mua và tiếp nhận yêu cầu sau bán hàng. Các quyền lợi thành viên được quản lý trong tài khoản GlowUp của bạn.',
  ]),
  page('lien-he','Liên hệ và hệ thống cửa hàng',[
    'Bạn có thể gửi yêu cầu hỗ trợ từ tài khoản GlowUp, kèm mã đơn hàng và nội dung cần xử lý. Không gửi mật khẩu, mã xác thực hoặc thông tin thẻ trong nội dung yêu cầu.',
    'Hệ thống có cửa hàng tại Hai Bà Trưng, Cầu Giấy, Quận 1, Hải Châu và Thủ Đức. Kho tổng phục vụ nhập hàng và điều phối; kho không mở quầy bán lẻ.',
    'Vui lòng xem địa chỉ và giờ hoạt động của từng chi nhánh trước khi đến. Đối với đổi trả, chuẩn bị mã đơn và thông tin sản phẩm để nhân viên tra cứu nhanh hơn.',
  ]),
  page('huong-dan-mua-hang','Hướng dẫn mua hàng',[
    'Chọn danh mục hoặc thương hiệu, mở trang sản phẩm và kiểm tra đúng dung tích, màu sắc, quy cách. Thêm biến thể cần mua vào giỏ hoặc danh sách yêu thích.',
    'Ở bước thanh toán, kiểm tra số lượng, địa chỉ nhận hàng, ưu đãi và số tiền cuối cùng. Mã giảm giá và điểm được áp dụng theo điều kiện hiển thị; giá được xác nhận lại trước khi tạo đơn.',
    'Sau khi đặt hàng, vào mục đơn hàng để theo dõi tiến độ. Khách có thể hủy đơn đang chờ xác nhận. Nếu đơn đã sang bước xử lý tiếp theo, gửi yêu cầu để cửa hàng hỗ trợ.',
  ]),
  page('phuong-thuc-thanh-toan','Phương thức thanh toán',[
    'Đơn hàng trực tuyến hiện hỗ trợ thanh toán khi nhận hàng (COD). Chỉ lựa chọn phương thức đang được hiển thị ở bước thanh toán.',
    'Tại cửa hàng, nhân viên thông báo các phương thức được chấp nhận tại quầy và xác nhận tổng tiền trước khi hoàn tất giao dịch. Giữ lại thông tin đơn và chứng từ thanh toán để đối chiếu.',
    'Không chuyển tiền qua đường dẫn hoặc tài khoản do người lạ gửi. Khi cần kiểm tra giao dịch, sử dụng thông tin đơn được lưu trong tài khoản GlowUp.',
  ]),
  page('chinh-sach-giao-hang','Giao hàng và phí vận chuyển',[
    'Phí vận chuyển tiêu chuẩn là 30.000 đồng cho đơn dưới 500.000 đồng sau ưu đãi. Đơn đạt ngưỡng được miễn phí; chương trình miễn phí vận chuyển riêng có thể có điều kiện khác.',
    'Địa chỉ và số điện thoại nhận hàng phải đầy đủ để hỗ trợ bàn giao. Phí và tổng tiền được hiển thị ở bước xác nhận đơn trước khi bạn đặt hàng.',
    'Bạn có thể theo dõi các mốc xác nhận, xử lý, đang giao và đã giao trong tài khoản. Thời gian nhận hàng phụ thuộc khu vực và tình trạng bàn giao; GlowUp không cam kết thời gian khi đơn chưa được xác nhận.',
  ]),
  page('chinh-sach-doi-tra','Hỗ trợ đổi trả',[
    'Bạn có thể tạo yêu cầu đổi trả trong vòng bảy ngày kể từ khi đơn hoàn tất. Chọn đơn và số lượng sản phẩm cần xử lý, trình bày lý do và cung cấp thông tin đối chiếu khi được yêu cầu.',
    'Yêu cầu được kiểm tra trước khi chấp thuận. Giữ nguyên bao bì, phụ kiện và thông tin lô nếu còn; tình trạng thực nhận quyết định khả năng nhập lại kho hoặc phương án xử lý.',
    'Số tiền được tính theo phần giá trị thực trả của mặt hàng, sau phân bổ ưu đãi và điểm. Điểm và quyền lợi được đối soát khi yêu cầu hoàn tất; đổi sang mặt hàng khác cần xác nhận báo giá mới.',
  ]),
  page('chinh-sach-bao-mat','Thông tin tài khoản và quyền riêng tư',[
    'GlowUp sử dụng thông tin tài khoản, địa chỉ và đơn mua để phục vụ đăng nhập, giao hàng, chăm sóc sau bán hàng và chương trình thành viên.',
    'Bạn nên sử dụng mật khẩu riêng, không chia sẻ mã xác thực và đăng xuất trên thiết bị dùng chung. Chỉ cập nhật địa chỉ nhận hàng trong phiên đăng nhập của chính bạn.',
    'Khi cần tra cứu hoặc đề nghị xử lý thông tin của mình, gửi yêu cầu hỗ trợ từ tài khoản để được xác minh. Không công khai địa chỉ, số điện thoại hoặc thông tin giao dịch trong đánh giá sản phẩm.',
  ]),
  page('dieu-khoan-su-dung','Điều kiện sử dụng GlowUp',[
    'Vui lòng kiểm tra sản phẩm, biến thể, số lượng và thông tin nhận hàng trước khi xác nhận mua. Giá và quyền lợi được áp dụng theo thông tin xác nhận của đơn.',
    'Ảnh giúp nhận diện sản phẩm; sắc độ hiển thị có thể khác theo thiết bị và ánh sáng. Kiểm tra tên màu, dung tích và quy cách thay vì chỉ dựa vào ảnh.',
    'Đánh giá cần liên quan đến giao dịch và không chứa thông tin riêng tư của người khác. Yêu cầu hỗ trợ về giao dịch nên gửi qua mục đơn hàng để có đầy đủ dữ liệu đối chiếu.',
  ]),
];

const FAQS=[
 ['Cam kết chính hãng & Nguồn gốc','Làm sao GlowUp đảm bảo 100% sản phẩm là hàng chính hãng?','GlowUp hợp tác trực tiếp với các thương hiệu mỹ phẩm và nhà phân phối độc quyền chính thức tại Việt Nam (L\'Oréal, Cocoon, Banila Co, Clio, Goodal...). 100% sản phẩm có hóa đơn VAT và chứng từ nhập khẩu chính ngạch. GlowUp cam kết đền bù 200% nếu phát hiện sản phẩm không chính hãng.'],
 ['Cam kết chính hãng & Nguồn gốc','Làm thế nào để kiểm tra hạn sử dụng (EXP) và hạn mở nắp (PAO)?','Hạn sử dụng (EXP) được in dập nổi hoặc in laser rõ nét trên bao bì gốc và tem phụ tiếng Việt. Với mỹ phẩm đã mở nắp niêm phong, hãy lưu ý ký hiệu chiếc hộp mở nắp (PAO - Period After Opening) như 6M (6 tháng), 12M (12 tháng). Đây là khoảng thời gian hoạt chất phát huy hiệu quả dưỡng da tối ưu nhất.'],
 ['Cam kết chính hãng & Nguồn gốc','Sản phẩm có đầy đủ tem phụ tiếng Việt và tem niêm phong không?','Theo quy chuẩn của Bộ Y Tế, mọi sản phẩm nhập khẩu chính ngạch tại GlowUp đều có tem phụ tiếng Việt thể hiện rõ thành phần công thức, công dụng, hướng dẫn sử dụng, hạn dùng và đơn vị nhập khẩu. Sản phẩm còn có tem chống hàng giả hoặc tem niêm phong hologram của nhãn hàng.'],
 ['Cam kết chính hãng & Nguồn gốc','Vì sao bao bì hoặc mùi hương sản phẩm có thể khác đôi chút so với trước đây?','Các thương hiệu mỹ phẩm thường xuyên cải tiến bao bì hoặc tinh chỉnh công thức (reformulation) để tăng hiệu quả và tuân thủ quy chuẩn dược mỹ phẩm mới. Ngoài ra, các sản phẩm thuần chay hoặc chứa chiết xuất thiên nhiên có thể có độ đậm nhạt mùi tự nhiên giữa các đợt thu hoạch nguyên liệu.'],
 ['Giao nhận & Đồng kiểm','GlowUp có hỗ trợ giao nhanh hỏa tốc 2H (GlowUp Now 2H) không?','Có. Dịch vụ GlowUp Now 2H áp dụng cho đơn hàng giao tại các quận nội thành có showroom hoặc kho hàng của GlowUp. Đơn đặt trước 18:00 sẽ được chuẩn bị ưu tiên và giao tận tay quý khách chỉ trong vòng 120 phút.'],
 ['Giao nhận & Đồng kiểm','Tôi có được mở hộp kiểm tra hàng (đồng kiểm) khi shipper giao tới không?','Có. GlowUp áp dụng chính sách ĐỒNG KIỂM 100%. Quý khách có quyền mở thùng carton kiểm tra ngoại quan (đúng sản phẩm, đúng biến thể, nguyên vẹn tem seal, không móp méo đổ vỡ) trước khi ký nhận hoặc thanh toán tiền thu hộ COD cho nhân viên giao hàng.'],
 ['Giao nhận & Đồng kiểm','Quy cách đóng gói mỹ phẩm của GlowUp như thế nào để tránh va đập vỡ hỏng?','Mỗi sản phẩm đều được quấn 3-4 lớp màng xốp khí chống sốc chuyên dụng, đặt trong thùng carton chịu lực và dán băng keo niêm phong thương hiệu GlowUp. Các sản phẩm nhạy cảm nhiệt độ như Serum Vitamin C hay Retinol luôn được bảo quản trong kho lạnh tiêu chuẩn dưới 25°C trước khi giao.'],
 ['Giao nhận & Đồng kiểm','Phí vận chuyển toàn quốc và chính sách Freeship tính như thế nào?','GlowUp miễn phí giao hàng tiêu chuẩn toàn quốc cho đơn hàng từ 299.000đ sau ưu đãi. Với đơn hàng dưới 299.000đ, phí giao hàng đồng giá toàn quốc chỉ từ 25.000đ đến 30.000đ tùy khu vực.'],
 ['Chính sách đổi trả & Làn da','GlowUp có chính sách bảo hành gì nếu da tôi bị kích ứng hoặc dị ứng mỹ phẩm?','GlowUp áp dụng chính sách Bảo Hiểm An Tâm Làn Da trong 7 ngày kể từ khi nhận hàng. Nếu bạn gặp tình trạng ửng đỏ, ngứa rát bất thường nghi do kích ứng sản phẩm, hãy ngừng sử dụng và liên hệ ngay Hotline hoặc Zalo OA. Đội ngũ dược sĩ GlowUp sẽ tư vấn dịu da và tiếp nhận đổi trả hoặc hoàn tiền chu đáo.'],
 ['Chính sách đổi trả & Làn da','Nếu sản phẩm bị lỗi vòi xịt, nứt vỡ hoặc giao nhầm thì đổi trả thế nào?','GlowUp áp dụng chính sách 1 ĐỔI 1 TẬN NHÀ HOÀN TOÀN MIỄN PHÍ trong vòng 7 ngày. Nhân viên giao hàng sẽ mang sản phẩm mới tinh đến đổi tận tay và thu hồi sản phẩm lỗi, quý khách không cần phải mang ra bưu điện hay chịu bất kỳ chi phí phát sinh nào.'],
 ['Chính sách đổi trả & Làn da','Điều kiện để đổi trả sản phẩm do không ưng ý hoặc đổi ý là gì?','Sản phẩm đổi trả do nhu cầu cá nhân cần giữ nguyên màng co seal, tem niêm phong của nhà sản xuất, chưa qua sử dụng, kèm đầy đủ vỏ hộp và quà tặng (nếu có). Quý khách có thể gửi yêu cầu đổi trả ngay trên mục Quản lý đơn hàng trong tài khoản.'],
 ['Chính sách đổi trả & Làn da','Thời gian nhận lại tiền hoàn sau khi hủy đơn hoặc đổi trả là bao lâu?','Với đơn thanh toán online (VNPAY / Thẻ ATM / Ví điện tử), tiền hoàn sẽ về tài khoản nguồn trong vòng 1 - 3 ngày làm việc. Với đơn thanh toán COD, GlowUp sẽ chuyển khoản trực tiếp vào tài khoản ngân hàng của bạn trong vòng 24h sau khi tiếp nhận sản phẩm hoàn về kho.'],
 ['Thành viên & Tích điểm GlowUp Xu','Cách thức tích lũy điểm thưởng GlowUp Xu và các hạng thành viên?','Mỗi khi mua sắm online hoặc tại showroom, quý khách sẽ được tích lũy điểm thưởng từ 1% đến 5% giá trị đơn hàng tùy theo hạng: Bạc (Silver), Vàng (Gold) và Kim Cương (Diamond). Điểm tích lũy được tự động cập nhật ngay khi đơn hàng hoàn tất.'],
 ['Thành viên & Tích điểm GlowUp Xu','1 điểm GlowUp Xu quy đổi được bao nhiêu tiền và cách dùng ra sao?','1 điểm GlowUp Xu tương đương 1 VNĐ. Khi thanh toán đơn hàng mới, quý khách có thể chọn dùng điểm tích lũy để trừ trực tiếp vào tổng tiền thanh toán mà không cần điều kiện đơn hàng tối thiểu, có thể dùng đồng thời với mã voucher.'],
 ['Thành viên & Tích điểm GlowUp Xu','Thành viên GlowUp được nhận quà tặng sinh nhật như thế nào?','Trong tháng sinh nhật, quý khách sẽ nhận được một mã voucher giảm 20% độc quyền (tối đa 200.000đ) gửi vào ví ưu đãi, kèm một phần quà mỹ phẩm mini size đặc biệt khi ghé trải nghiệm mua hàng tại bất kỳ showroom GlowUp nào.'],
 ['Thành viên & Tích điểm GlowUp Xu','Điểm tích lũy có bị hết hạn sử dụng không?','Điểm tích lũy GlowUp Xu có thời hạn sử dụng trong vòng 365 ngày kể từ ngày giao dịch thành công. Hệ thống sẽ gửi thông báo email hoặc tin nhắn nhắc nhở trước 30 ngày nếu quý khách có số điểm sắp hết hạn.'],
 ['Showroom & Dịch vụ Soi da','Dịch vụ soi da chuyên sâu tại Showroom GlowUp có tính phí không?','Dịch vụ soi da phân tích đa tầng bằng máy soi da chuyên dụng tại tất cả showroom GlowUp là hoàn toàn MIỄN PHÍ 100%. Máy sẽ phân tích độ ẩm, sắc tố melanin, mật độ collagen và tình trạng bã nhờn, kèm lời khuyên routine chuẩn khoa học từ chuyên viên mà không bắt buộc phải mua hàng.'],
 ['Showroom & Dịch vụ Soi da','Tôi có thể đến cửa hàng dùng thử mẫu thử (tester) trước khi mua không?','Có. 100% dòng sản phẩm son môi, cushion, phấn mắt, kem dưỡng và kem chống nắng tại quầy trưng bày đều có mẫu thử Tester chính hãng, kèm cọ, bông mút và cồn khử khuẩn dùng một lần để quý khách an tâm trải nghiệm.'],
 ['Showroom & Dịch vụ Soi da','Giá bán tại Showroom có đồng nhất với trên Website không?','Toàn bộ giá bán niêm yết, chương trình khuyến mãi tháng, quà tặng tặng kèm và voucher giảm giá đều được áp dụng đồng bộ thời gian thực giữa Website và hệ thống Showroom GlowUp.'],
 ['Showroom & Dịch vụ Soi da','Dịch vụ Đặt hàng Online - Nhận tại Showroom (Click & Collect) hoạt động thế nào?','Tại bước thanh toán, quý khách có thể chọn phương thức Nhận tại showroom gần nhất. Đội ngũ cửa hàng sẽ chuẩn bị đơn hàng trong vòng 30 phút và gửi tin nhắn thông báo khi gói hàng sẵn sàng để quý khách ghé nhận tiện lợi.'],
].map(([category,question,answer],i)=>({id:demoId('faq',i),category,question,answer:`<p>${answer}</p>`,sortOrder:i}));

const BLOG_CATEGORIES=[
 ['cham-soc-da','Chăm sóc da'],
 ['thanh-phan-hoat-chat','Thành phần hoạt chất'],
 ['xu-huong-trang-diem','Xu hướng trang điểm'],
 ['review-so-sanh','Review & So sánh'],
 ['meo-lam-dep','Cẩm nang làm đẹp'],
].map(([slug,name])=>({id:demoId('blog-category',slug),slug,name}));

const BLOGS=[
 ['routine-phuc-hoi-da-treatment','Chu Trình Phục Hồi Toàn Diện Cho Làn Da Đang Treatment BHA & Retinol','cham-soc-da','Hướng dẫn từng bước cấp ẩm, làm dịu và củng cố màng bảo vệ da khi da gặp tình trạng khô căng, bong tróc hoặc ửng đỏ do hoạt chất treatment.',[
   ['Nguyên Nhân Khiến Làn Da Treatment Bị Tổn Thương Màng Lipid','Khi sử dụng các hoạt chất treatment mạnh như BHA (Salicylic Acid) hay Retinol ở nồng độ cao hoặc với tần suất quá dày, lớp màng lipid tự nhiên trên bề mặt da rất dễ bị suy yếu. Biểu hiện rõ nhất là da ửng đỏ, căng rát khi rửa mặt, xuất hiện vảy khô bong tróc và dễ nổi mụn kích ứng.'],
   ['Quy Trình 5 Bước Phục Hồi Chuẩn Dược Mỹ Phẩm','Để da nhanh chóng hồi phục, hãy áp dụng chu trình tối giản: 1. Nước tẩy trang micellar không cồn; 2. Sữa rửa mặt dạng gel dịu nhẹ pH 5.5; 3. Serum phục hồi chứa Vitamin B5, Ceramide NP và Hyaluronic Acid đa tầng; 4. Kem dưỡng khóa ẩm củng cố hàng rào bảo vệ da; 5. Kem chống nắng phổ rộng SPF 50+ PA++++ vào ban ngày.'],
   ['Những Hoạt Chất Cần Tạm Dừng Trong Giai Đoạn Này','Trong ít nhất 2 đến 3 tuần đầu phục hồi, hãy tạm ngừng toàn bộ các sản phẩm chứa cồn khô nồng độ cao, hạt scrub cơ học thô ráp và các acid tẩy da chết mạnh. Hãy để làn da có thời gian tái tạo tự nhiên trước khi đưa hoạt chất treatment trở lại.'],
 ]],
 ['bi-quyet-chon-kem-chong-nang-cho-da-dau-mun','Top Tiêu Chí Chọn Kem Chống Nắng Kiềm Dầu, Thoáng Mịn Cho Da Mụn Mùa Hè','review-so-sanh','Bí quyết phân biệt màng lọc vật lý vs hóa học, đọc chỉ số SPF/PPD chuẩn châu Âu và cách nhận biết kết cấu kem chống nắng không gây bí tắc lỗ chân lông.',[
   ['Vì Sao Da Dầu Mụn Dễ Bị Bí Da Khi Dùng Kem Chống Nắng','Làn da dầu mụn tại khí hậu nhiệt đới ẩm Việt Nam thường xuyên đổ nhiều dầu thừa và mồ hôi. Nếu chọn phải dòng kem chống nắng chứa gốc dầu nặng, dầu thừa kết hợp với bụi mịn sẽ bít tắc cổ nang lông, kích thích vi khuẩn sinh mụn ẩn và mụn viêm.'],
   ['3 Tiêu Chí Vàng Cho Kem Chống Nắng Da Mụn','1. Nhãn Non-Comedogenic & Oil-Free: Đảm bảo không gây bít tắc lỗ chân lông; 2. Màng lọc quang phổ rộng (Broad Spectrum): Bảo vệ toàn diện trước tia UVA1, UVA2, UVB với SPF 50 và PA++++ (hoặc PPD trên 16); 3. Kết cấu dạng sữa lỏng (fluid/milk) thẩm thấu nhanh, để lại bề mặt ráo mịn tự nhiên.'],
   ['So Sánh Màng Lọc Vật Lý, Hóa Học Và Lai','Màng lọc vật lý (Zinc Oxide, Titanium Dioxide) rất lành tính và kháng viêm nhưng dễ nâng tông trắng. Màng lọc hóa học thế hệ mới mỏng nhẹ trong suốt. Dòng kem chống nắng lai kết hợp ưu điểm của cả hai, vừa bảo vệ bền bỉ vừa giữ lớp nền sáng mịn cả ngày.'],
 ]],
 ['hoat-chat-niacinamide-va-vitamin-c','Niacinamide và Vitamin C: Có Thật Sự Kỵ Nhau? Góc Nhìn Khoa Học Chuẩn Dược','thanh-phan-hoat-chat','Giải oan cho cặp đôi vàng trong làng sáng da mờ thâm. Phân tích độ pH tương thích và cách kết hợp layer hoạt chất hiệu quả tối đa mà không lo kích ứng.',[
   ['Nguồn Gốc Của Lời Đồn Niacinamide Triệt Tiêu Vitamin C','Quan niệm Niacinamide và Vitamin C không thể dùng chung bắt nguồn từ nghiên cứu trong phòng thí nghiệm từ thập niên 1960 khi đun nóng ở nhiệt độ cao trong acid mạnh. Tuy nhiên, trong điều kiện nhiệt độ phòng và công thức mỹ phẩm hiện đại, phản ứng gây đỏ da này hoàn toàn không xảy ra.'],
   ['Lợi Ích Nhân Đôi Khi Kết Hợp Bộ Đôi Sáng Da','Vitamin C ức chế enzyme tổng hợp melanin, kích thích collagen và trung hòa gốc tự do do tia UV. Trong khi đó, Niacinamide (Vitamin B3) ngăn chặn túi melanin vận chuyển lên bề mặt da, đồng thời kiểm soát bã nhờn và củng cố hàng rào ceramide ẩm mịn.'],
   ['Cách Sử Dụng Hiệu Quả Chuẩn Dược Sĩ','Cách kết hợp lý tưởng nhất là thoa Vitamin C vào buổi sáng trước kem chống nắng để tăng cường khả năng chống oxy hóa; Thoa Niacinamide vào buổi tối để dưỡng sáng, thu nhỏ lỗ chân lông và phục hồi da qua đêm.'],
 ]],
 ['phong-cach-trang-diem-glass-skin-tu-nhien','Bí Quyết Tạo Lớp Nền Căng Bóng Glass Skin Chuẩn Hàn Không Bị Mốc Nền','xu-huong-trang-diem','Cách chuẩn bị làn da (skin prep), kỹ thuật tán cushion mỏng nhẹ và mẹo xịt khóa nền giúp lớp makeup trong suốt, lâu trôi suốt cả ngày.',[
   ['Glass Skin - Vẻ Đẹp Căng Bóng Khỏe Mạnh Từ Bên Trong','Xu hướng Glass Skin không đến từ việc thoa thật nhiều phấn hay kem bắt sáng, mà bắt nguồn từ một làn da được cấp ẩm ngậm nước từ sâu bên trong. Lớp nền mỏng trong suốt sẽ tôn vinh vẻ đẹp tươi tắn tự nhiên của làn da.'],
   ['3 Bước Chuẩn Bị Da (Skin Prep) Trước Khi Trang Điểm','1. Tẩy tế bào chết dịu nhẹ với Toner Pad để làm phẳng mịn bề mặt da; 2. Cấp ẩm tức thì với Serum Hyaluronic Acid giúp phấn bám chặt không bị cakey; 3. Thoa kem lót nâng tông bắt sáng nhẹ tạo hiệu ứng phát sáng tự nhiên.'],
   ['Kỹ Thuật Tán Cushion Đúng Cách','Nhẹ nhàng chấm mút lên khay cushion để điều tiết lượng phấn vừa đủ. Bắt đầu tán từ gò má ra ngoài theo thao tác vỗ nhẹ (tap-tap), tuyệt đối không miết mạnh tay. Cố định toàn diện bằng xịt khóa nền dewy mist để lớp nền bền đẹp suốt 12 tiếng.'],
 ]],
 ['cach-kiem-tra-han-su-dung-va-date-pao','Đọc Vị Hạn Mở Nắp (PAO) Và Batch Code: Cách Bảo Quản Mỹ Phẩm Tránh Hư Hỏng','meo-lam-dep','Vì sao mỹ phẩm còn date 3 năm nhưng mở nắp 6 tháng đã biến chất? Cẩm nang đọc ký hiệu PAO 6M/12M và mẹo bảo quản serum, kem dưỡng luôn tươi mới.',[
   ['Sự Khác Biệt Giữa Hạn Sử Dụng (EXP) Và Hạn Mở Nắp (PAO)','Hạn sử dụng (EXP) cho biết thời hạn sản phẩm khi còn nguyên niêm phong kín. Khi bạn đã bóc seal mở nắp, không khí và vi khuẩn bắt đầu xâm nhập. Ký hiệu chiếc hộp mở nắp (PAO) kèm số tháng như 6M, 12M quy định thời gian tối đa nên dùng hết sản phẩm.'],
   ['Thời Hạn Mở Nắp Của Các Nhóm Sản Phẩm Phổ Biến','Mascara và kẻ mắt nước: 3 - 6 tháng; Serum Vitamin C nguyên chất: 2 - 3 tháng (rất dễ oxy hóa chuyển màu sẫm); Kem dưỡng da và kem mắt: 6 - 12 tháng; Kem chống nắng: 6 - 12 tháng; Son thỏi và phấn nén: 12 - 24 tháng.'],
   ['Mẹo Bảo Quản Mỹ Phẩm Luôn Đạt Chuẩn Hoạt Tính','Tránh để mỹ phẩm trong phòng tắm ẩm ướt hoặc cạnh cửa sổ có ánh nắng rọi trực tiếp. Các dòng serum Vitamin C, Retinol hoặc peptide nhạy cảm nhiệt độ nên được bảo quản trong ngăn mát tủ lạnh từ 10 - 15°C để kéo dài độ tươi mới.'],
 ]],
 ['so-sanh-tay-trang-dang-nuoc-va-sap-tay-trang','Nước Tẩy Trang (Micellar Water) Hay Sáp Tẩy Trang (Cleansing Balm): Đâu Là Chân Ái?','review-so-sanh','Đặt lên bàn cân khả năng làm sạch mascara chống nước, độ dịu nhẹ với da nhạy cảm và cách nhũ hóa sáp đúng chuẩn để không gây mụn ẩn.',[
   ['Làm Sạch Kép - Bước Khởi Đầu Quyết Định Mọi Hiệu Quả Dưỡng Da','Dù chỉ thoa kem chống nắng hay trang điểm đậm mỗi ngày, làm sạch kép (Double Cleansing) vẫn là chìa khóa để ngăn ngừa bít tắc lỗ chân lông. Nước tẩy trang micellar và sáp tẩy trang đều có những thế mạnh riêng phù hợp với từng nhu cầu.'],
   ['Ưu Và Nhược Điểm Của Từng Dạng Tẩy Trang','Nước tẩy trang micellar: Cực kỳ tiện lợi, dịu nhẹ cho da mụn viêm nhưng khó làm sạch mascara chống trôi. Sáp tẩy trang: Hòa tan mọi lớp makeup chống nước êm ái, massage thư giãn nhưng bắt buộc phải nhũ hóa kỹ với nước ấm để tránh đọng dầu.'],
   ['Lời Khuyên Từ Chuyên Gia GlowUp','Nếu bạn chỉ thoa kem chống nắng hàng ngày hoặc có mụn viêm: Hãy chọn Nước tẩy trang micellar dịu nhẹ. Nếu bạn thường xuyên makeup đậm, dùng son lì hoặc có nhiều sợi bã nhờn vùng mũi: Hãy chọn Sáp tẩy trang và chú ý nhũ hóa trong 60 giây.'],
 ]],
 ['routine-cham-soc-da-dau-lo-chan-long-to','Quy Trình Chăm Sóc Da Dầu Giảm Tiết Bã Nhờn Và Thu Nhỏ Lỗ Chân Lông Tại Nhà','cham-soc-da','Hiểu đúng về cơ chế giãn nở của lỗ chân lông và bộ ba hoạt chất vàng: Salicylic Acid (BHA), Zinc PCA và Niacinamide.',[
   ['Hiểu Đúng Về Cơ Chế Khiến Lỗ Chân Lông Giãn Nở','Lỗ chân lông không có cơ bắp để đóng mở. Hiện tượng lỗ chân lông to thường do tuyến bã nhờn hoạt động quá mức gây ứ đọng cổ nang lông, hoặc do thành nang lông suy giảm collagen khiến cấu trúc nâng đỡ bị lỏng lẻo.'],
   ['Bộ Ba Hoạt Chất Vàng Cải Thiện Bề Mặt Da Dầu','BHA (Salicylic Acid 2%) tan trong dầu, đi sâu vào lỗ chân lông để quét sạch dầu thừa; Zinc PCA giúp điều hòa bài tiết bã nhờn và giảm viêm; Niacinamide (Vitamin B3) kích thích sản sinh ceramide củng cố thành lỗ chân lông săn chắc.'],
   ['Quy Trình Chăm Sóc Da Dầu Chuẩn Khoa Học','Buổi sáng: Sữa rửa mặt dịu nhẹ -> Nước hoa hồng kiềm dầu -> Serum Niacinamide -> Gel dưỡng ẩm mỏng nhẹ -> Kem chống nắng ráo mịn. Buổi tối: Tẩy trang kép -> Rửa mặt sạch sâu -> Dung dịch BHA 2% (2-3 lần/tuần) -> Kem dưỡng ẩm phục hồi dạng gel.'],
 ]],
 ['cach-xac-dinh-undertone-chon-mau-son','Xác Định Skintone & Undertone: Tuyệt Chiêu Chọn Màu Son Và Kem Nền Tôn Da Tuyệt Đối','xu-huong-trang-diem','Test đường gân cổ tay, phản ứng dưới ánh nắng và trang sức kim loại để nhận biết bạn thuộc Warm, Cool hay Neutral Undertone.',[
   ['Phân Biệt Skintone Và Undertone Làn Da','Skintone là tông màu da bề mặt bên ngoài (sáng, trung bình, ngăm) và có thể thay đổi do thời tiết hay dưỡng trắng. Undertone là sắc thái ẩn sâu dưới biểu bì do gen di truyền quyết định và hoàn toàn không bao giờ thay đổi.'],
   ['3 Cách Test Undertone Nhanh Nhất Tại Nhà','1. Quan sát gân cổ tay: Gân xanh lá là Warm (ấm); gân xanh dương hoặc tím là Cool (lạnh); có cả hai màu là Neutral (trung tính). 2. Test trang sức: Đeo trang sức bạc sáng da là Cool; đeo vàng gold rạng rỡ là Warm; cả hai đều đẹp là Neutral. 3. Phản ứng ánh nắng: Dễ đỏ rát cháy nắng là Cool; dễ rám ngăm là Warm.'],
   ['Gợi Ý Màu Son Tôn Da Theo Từng Undertone','Warm Undertone: Rực rỡ với son gốc ấm như đỏ gạch, cam cháy, cam đất, đỏ san hô. Cool Undertone: Quyến rũ với son gốc lạnh như đỏ mận, đỏ cherry, hồng ruby, đỏ hồng lạnh. Neutral Undertone: Thỏa sức diện mọi màu son từ đỏ thuần đến cam nude.'],
 ]],
].map(([slug,title,categorySlug,excerpt,sections],i)=>({id:demoId('blog',slug),slug,title,categorySlug,excerpt,content:sections.map(([heading,text])=>`<h2>${heading}</h2><p>${text}</p>`).join(''),publishedAt:new Date(ANCHOR.getTime()-(i+1)*86400000)}));

module.exports={demoId,ANCHOR,ACTIVE_START,ACTIVE_END,FLASH_SALE_END,SETTINGS,PAGES,FAQS,BLOG_CATEGORIES,BLOGS};
