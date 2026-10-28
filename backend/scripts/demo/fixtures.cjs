const {id}=require('../catalog/normalize.cjs');
const demoId=(kind,key)=>id(`demo-v1:${kind}:${key}`);
const ANCHOR=new Date('2026-10-27T03:00:00Z');
const ACTIVE_START=new Date('2026-10-01T00:00:00Z');
const ACTIVE_END=new Date('2027-10-27T00:00:00Z');

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
 ['Mua hàng','Làm sao chọn đúng dung tích hoặc màu?','Mở trang sản phẩm, chọn biến thể và đối chiếu tên màu, dung tích, quy cách trước khi thêm vào giỏ.'],
 ['Mua hàng','Một sản phẩm có nhiều ảnh không?','Có. Bạn có thể xem ảnh sản phẩm, bao bì, bảng màu hoặc kết cấu trong bộ ảnh. Ảnh gắn với biến thể sẽ giúp nhận diện lựa chọn tương ứng.'],
 ['Mua hàng','Danh sách yêu thích có giữ hàng không?','Danh sách yêu thích giúp lưu sản phẩm để xem lại. Tồn kho và giá được kiểm tra khi bạn thực hiện đặt hàng.'],
 ['Thanh toán','Đặt hàng online thanh toán thế nào?','Đơn trực tuyến hiện hỗ trợ COD. Sử dụng phương thức được hiển thị tại bước xác nhận đơn.'],
 ['Thanh toán','Vì sao mã giảm giá chưa áp dụng được?','Kiểm tra thời hạn, giá trị đơn tối thiểu, sản phẩm áp dụng và giới hạn sử dụng của mã.'],
 ['Giao hàng','Phí vận chuyển được tính thế nào?','Phí tiêu chuẩn là 30.000 đồng; đơn từ 500.000 đồng sau ưu đãi được miễn phí. Chương trình vận chuyển riêng có thể thay đổi điều kiện.'],
 ['Giao hàng','Tôi xem tiến độ đơn ở đâu?','Đăng nhập và mở đơn hàng để xem lịch sử trạng thái cùng thông tin bàn giao nếu đã có.'],
 ['Giao hàng','Có thể mua trực tiếp ở kho tổng không?','Kho tổng dùng để nhập và điều phối hàng. Bạn có thể mua tại năm cửa hàng bán lẻ của GlowUp.'],
 ['Đổi trả','Thời gian gửi yêu cầu đổi trả là bao lâu?','Tạo yêu cầu trong vòng bảy ngày kể từ khi đơn hoàn tất. Yêu cầu sẽ được kiểm tra trước khi chấp thuận.'],
 ['Đổi trả','Tôi cần chuẩn bị gì khi đổi trả?','Chuẩn bị mã đơn, sản phẩm, bao bì và thông tin lô nếu còn; mô tả rõ mặt hàng và số lượng cần xử lý.'],
 ['Thành viên','Điểm được tích khi nào?','Điểm được ghi nhận khi giao dịch đủ điều kiện hoàn tất. Bạn có thể xem số dư và lịch sử trong mục thành viên.'],
 ['Thành viên','Một điểm có giá trị bao nhiêu?','Theo cấu hình hiện tại, một điểm có giá trị một đồng khi dùng trực tiếp. Quà đổi điểm có điều kiện và thời hạn riêng.'],
 ['Thành viên','Đổi điểm có làm thay đổi hạng không?','Hạng được đánh giá theo số điểm hiện có. Hệ thống đối soát lại khi tích, dùng hoặc điều chỉnh điểm.'],
 ['Tài khoản','Tôi có thể lưu nhiều địa chỉ không?','Có. Thêm địa chỉ trong tài khoản và chọn một địa chỉ mặc định; kiểm tra địa chỉ được chọn trước khi đặt đơn.'],
 ['Tài khoản','Làm sao đánh giá sản phẩm đã mua?','Mở sản phẩm thuộc đơn đã hoàn tất để gửi đánh giá. Đánh giá được kiểm duyệt trước khi hiển thị công khai.'],
].map(([category,question,answer],i)=>({id:demoId('faq',i),category,question,answer:`<p>${answer}</p>`,sortOrder:i}));

const BLOG_CATEGORIES=[['mua-sam-thong-minh','Mua sắm thông minh'],['quyen-loi-thanh-vien','Quyền lợi thành viên'],['dong-hanh-cung-glowup','Đồng hành cùng GlowUp']].map(([slug,name])=>({id:demoId('blog-category',slug),slug,name}));
const BLOGS=[
 ['chon-dung-bien-the','Chọn đúng dung tích và quy cách khi mua mỹ phẩm','mua-sam-thong-minh','Trước khi đặt hàng, kiểm tra tên biến thể để nhận đúng dung tích và quy cách mong muốn.',[
   ['Đọc đầy đủ lựa chọn','Một dòng sản phẩm có thể có nhiều dung tích, màu hoặc dạng đóng gói. Tên biến thể giúp phân biệt những lựa chọn này rõ hơn tên sản phẩm chung.'],
   ['Đối chiếu giỏ hàng','Sau khi chọn, kiểm tra lại tên biến thể và số lượng trong giỏ. Nếu đổi lựa chọn, hãy xác nhận giá và tồn kho hiển thị cho lựa chọn mới.'],
   ['Kiểm tra khi nhận','Đối chiếu thông tin trên bao bì với đơn mua. Lưu mã đơn để thuận tiện cho việc hỗ trợ sau bán hàng.'],
 ]],
 ['xem-anh-va-bang-mau','Đọc bộ ảnh và bảng màu trước khi chọn sản phẩm','mua-sam-thong-minh','Ảnh bao bì, bảng màu và ảnh kết cấu cung cấp những thông tin khác nhau về sản phẩm.',[
   ['Ảnh nhận diện','Ảnh sản phẩm và bao bì giúp bạn đối chiếu tên dòng và quy cách. Kiểm tra nhãn thay vì chỉ dựa vào màu sắc tổng thể.'],
   ['Ảnh minh họa màu','Bảng màu mô tả các lựa chọn trong cùng dòng. Sắc độ trên màn hình phụ thuộc thiết bị, độ sáng và ánh sáng chụp.'],
   ['Thông tin cần xác nhận','Trước khi mua, ưu tiên tên và mã màu của biến thể. Nếu chưa rõ hình đang minh họa lựa chọn nào, hỏi nhân viên để đối chiếu.'],
 ]],
 ['doc-thanh-phan-cong-bo','Đọc thông tin thành phần được công bố','mua-sam-thong-minh','Phân biệt thành phần nổi bật với danh sách thành phần đầy đủ để tra cứu sản phẩm rõ ràng hơn.',[
   ['Hai cách trình bày','Trang sản phẩm có thể giới thiệu một số thành phần nổi bật và phần mô tả chi tiết. Danh sách nổi bật không thay thế toàn bộ danh sách trên nhãn.'],
   ['Kiểm tra phiên bản','Công thức và bao bì có thể khác giữa các phiên bản hoặc thị trường. Đối chiếu sản phẩm thực nhận, dung tích và nhãn để kiểm tra đúng phiên bản.'],
   ['Khi thông tin chưa đủ','Không suy đoán nồng độ chỉ từ tên sản phẩm. Tham khảo thông tin công bố của hãng cho phiên bản cụ thể; nếu cần tư vấn sức khỏe cá nhân, liên hệ người có chuyên môn phù hợp.'],
 ]],
 ['checklist-nhan-hang','Checklist khi nhận đơn GlowUp','dong-hanh-cung-glowup','Những thông tin nên đối chiếu và giữ lại khi nhận sản phẩm.',[
   ['Đối chiếu đơn mua','Kiểm tra đúng số lượng, biến thể và phụ kiện kèm theo được ghi trong đơn. Quan sát tình trạng bao bì trước khi sử dụng.'],
   ['Giữ thông tin lô','Giữ lại nhãn, số lô và hạn dùng để có căn cứ khi cần đối chiếu. Đọc hướng dẫn bảo quản trên bao bì của từng sản phẩm.'],
   ['Gửi yêu cầu rõ ràng','Nếu có vấn đề, mở đơn trong tài khoản và mô tả mặt hàng, số lượng cùng tình trạng thực tế. Thông tin đầy đủ giúp cửa hàng kiểm tra nhanh hơn.'],
 ]],
 ['theo-doi-don-hang','Theo dõi đơn từ xác nhận đến nhận hàng','dong-hanh-cung-glowup','Hiểu các mốc xử lý để chủ động theo dõi đơn mua trực tuyến.',[
   ['Chờ xác nhận và xử lý','Sau khi đặt, đơn được ghi nhận để kiểm tra hàng. Khi cửa hàng xác nhận, đơn chuyển sang chuẩn bị và đóng gói.'],
   ['Đang giao và đã giao','Mốc đang giao cho biết đơn đã sang bước bàn giao vận chuyển. Kiểm tra các cập nhật trong lịch sử đơn khi cần tra cứu.'],
   ['Hỗ trợ sau giao hàng','Khi giao dịch hoàn tất, bạn có thể xem điểm được ghi nhận và gửi đánh giá sản phẩm. Yêu cầu đổi trả được tiếp nhận trong thời hạn đang áp dụng.'],
 ]],
 ['su-dung-diem-thanh-vien','Tích điểm và sử dụng quyền lợi thành viên','quyen-loi-thanh-vien','Xem lịch sử điểm và các lựa chọn sử dụng trong tài khoản GlowUp.',[
   ['Điểm có lịch sử','Điểm tích từ đơn đủ điều kiện, điểm đã sử dụng và các điều chỉnh được ghi lại trong tài khoản để bạn đối chiếu.'],
   ['Dùng trực tiếp hoặc đổi quà','Bạn có thể dùng điểm ở bước thanh toán hoặc đổi phần thưởng có trong danh sách. Mỗi lựa chọn có yêu cầu số điểm và điều kiện riêng.'],
   ['Đối soát khi đổi trả','Khi một phần giao dịch được hoàn lại, hệ thống đối soát số tiền, điểm và quyền lợi liên quan. Kiểm tra lịch sử thay vì chỉ nhìn số dư cuối cùng.'],
 ]],
 ['chuan-bi-doi-tra','Chuẩn bị yêu cầu đổi trả đầy đủ thông tin','dong-hanh-cung-glowup','Cách chọn đúng dòng hàng và chuẩn bị thông tin để cửa hàng kiểm tra yêu cầu.',[
   ['Chọn từ đơn hoàn tất','Mở đơn cần hỗ trợ, chọn đúng mặt hàng và số lượng. Một dòng đã được xử lý trước đó có thể có số lượng còn được yêu cầu khác với số lượng mua ban đầu.'],
   ['Mô tả tình trạng thực tế','Giữ bao bì và thông tin lô nếu còn. Cung cấp ảnh theo yêu cầu để hỗ trợ việc đối chiếu; không gửi thông tin nhạy cảm trong ảnh.'],
   ['Xác nhận phương án','Với đổi sang sản phẩm khác, kiểm tra báo giá mới và phần chênh lệch trước khi đồng ý. Theo dõi lịch sử yêu cầu để biết bước cần thực hiện tiếp theo.'],
 ]],
 ['mua-online-va-tai-cua-hang','Kết nối trải nghiệm online và tại cửa hàng','dong-hanh-cung-glowup','Lưu thông tin mua sắm để thuận tiện đối chiếu và nhận hỗ trợ.',[
   ['Chuẩn bị danh sách','Lưu sản phẩm quan tâm vào danh sách yêu thích. Tại cửa hàng, đối chiếu tên biến thể với nhân viên trước khi thanh toán.'],
   ['Gắn giao dịch với tài khoản','Cung cấp thông tin tài khoản phù hợp để nhân viên tra cứu khách hàng. Kiểm tra lại thông tin được xác nhận cho giao dịch.'],
   ['Tra cứu sau mua','Giữ mã đơn và chứng từ thanh toán. Khi cần hỗ trợ, cung cấp mã đơn giúp xác định đúng giao dịch và sản phẩm.'],
 ]],
].map(([slug,title,categorySlug,excerpt,sections],i)=>({id:demoId('blog',slug),slug,title,categorySlug,excerpt,content:sections.map(([heading,text])=>`<h2>${heading}</h2><p>${text}</p>`).join(''),publishedAt:new Date(ANCHOR.getTime()-(i+1)*86400000)}));

module.exports={demoId,ANCHOR,ACTIVE_START,ACTIVE_END,SETTINGS,PAGES,FAQS,BLOG_CATEGORIES,BLOGS};
