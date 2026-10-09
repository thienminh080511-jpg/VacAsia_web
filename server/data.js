// General destination information is curated from the sources in ../SOURCES.md.
// Budgets, activity-pass prices, ratings, suggested durations and bestMonths are
// illustrative planning data, not live prices, customer reviews or forecasts.
export const destinations = [
  {
    id: 'kyoto', name: { en: 'Kyoto', vi: 'Kyoto' }, country: { en: 'Japan', vi: 'Nhật Bản' }, countryCode: 'JP', region: 'east', category: 'culture',
    tags: ['culture', 'nature', 'food', 'wellness'], dailyBudget: 110, ticketPrice: 32, rating: 4.9, duration: 4, bestMonths: [3, 4, 5, 10, 11], image: '/assets/kyoto.jpg',
    description: { en: 'Follow quiet temple paths, wander beneath vermilion torii gates and find a slower rhythm among Kyoto’s gardens and historic streets.', vi: 'Dạo bước trên những lối đi yên tĩnh trong chùa, đi qua hàng cổng torii đỏ son và tìm nhịp sống chậm giữa những khu vườn, phố cổ của Kyoto.' },
    highlights: { en: ['Fushimi Inari’s torii paths', 'Arashiyama bamboo grove', 'Gion and Higashiyama streets'], vi: ['Lối đi qua cổng torii ở Fushimi Inari', 'Rừng tre Arashiyama', 'Phố Gion và Higashiyama'] },
    food: { en: ['Matcha sweets', 'Yudofu tofu', 'Kyoto seasonal cuisine'], vi: ['Bánh ngọt matcha', 'Đậu phụ yudofu', 'Ẩm thực Kyoto theo mùa'] },
    season: { en: 'Spring brings blossoms; autumn brings colorful foliage. Popular sights can be busy, so explore early and respect residential streets.', vi: 'Mùa xuân có hoa nở; mùa thu có lá đổi màu. Những điểm nổi tiếng thường đông khách, nên đi sớm và tôn trọng khu dân cư.' },
    coordinates: { lat: 35.0116, lng: 135.7681 }, officialUrl: 'https://www.japan.travel/en/destinations/kansai/kyoto/'
  },
  {
    id: 'tokyo', name: { en: 'Tokyo', vi: 'Tokyo' }, country: { en: 'Japan', vi: 'Nhật Bản' }, countryCode: 'JP', region: 'east', category: 'city',
    tags: ['city', 'culture', 'food', 'family'], dailyBudget: 130, ticketPrice: 38, rating: 4.8, duration: 5, bestMonths: [3, 4, 5, 10, 11], image: '/assets/tokyo.jpg',
    description: { en: 'Pair the energy of Shibuya with the traditions of Asakusa. Tokyo rewards curious travelers with neighborhood discoveries, remarkable food and skyline views.', vi: 'Kết hợp không khí sôi động của Shibuya với nét truyền thống ở Asakusa. Tokyo chào đón người thích khám phá bằng những khu phố thú vị, món ăn hấp dẫn và cảnh thành phố từ trên cao.' },
    highlights: { en: ['Shibuya Scramble Crossing', 'Sensoji Temple in Asakusa', 'Meiji Jingu’s forest paths'], vi: ['Giao lộ Shibuya', 'Chùa Sensoji ở Asakusa', 'Lối đi giữa rừng ở Meiji Jingu'] },
    food: { en: ['Ramen', 'Sushi', 'Yakitori'], vi: ['Mì ramen', 'Sushi', 'Gà xiên nướng yakitori'] },
    season: { en: 'Spring and autumn are comfortable for long city walks. Blossom timing varies each year; summer is warm and humid.', vi: 'Mùa xuân và mùa thu thuận tiện cho việc đi bộ khám phá thành phố. Thời điểm hoa nở thay đổi mỗi năm; mùa hè nóng và ẩm.' },
    coordinates: { lat: 35.6762, lng: 139.6503 }, officialUrl: 'https://www.gotokyo.org/en/index.html'
  },
  {
    id: 'bali', name: { en: 'Bali', vi: 'Bali' }, country: { en: 'Indonesia', vi: 'Indonesia' }, countryCode: 'ID', region: 'southeast', category: 'nature',
    tags: ['nature', 'beach', 'culture', 'wellness', 'adventure'], dailyBudget: 60, ticketPrice: 28, rating: 4.8, duration: 6, bestMonths: [4, 5, 6, 7, 8, 9, 10], image: '/assets/bali.jpg',
    description: { en: 'Move between terraced rice fields, village craft traditions and dramatic coastal scenery. Build a Bali trip around time outdoors and unhurried moments.', vi: 'Khám phá ruộng bậc thang, nghề thủ công truyền thống ở làng quê và cảnh biển ngoạn mục. Hãy dành thời gian cho thiên nhiên và những khoảnh khắc thư thả ở Bali.' },
    highlights: { en: ['Rice terraces near Ubud', 'Uluwatu coastal views', 'Balinese art and village crafts'], vi: ['Ruộng bậc thang gần Ubud', 'Cảnh biển ở Uluwatu', 'Nghệ thuật và nghề thủ công Bali'] },
    food: { en: ['Nasi campur', 'Satay lilit', 'Gado-gado'], vi: ['Cơm nasi campur', 'Thịt xiên satay lilit', 'Salad gado-gado'] },
    season: { en: 'April to October is a useful dry-season planning window. Tropical showers remain possible; allow extra time for road travel.', vi: 'Tháng 4 đến tháng 10 thường phù hợp để lên kế hoạch vào mùa khô. Vẫn có thể có mưa nhiệt đới; nên dự trù thêm thời gian di chuyển đường bộ.' },
    coordinates: { lat: -8.4095, lng: 115.1889 }, officialUrl: 'https://www.indonesia.travel/gb/en/destination/bali-nusa-tenggara/bali/uluwatu'
  },
  {
    id: 'ha-long-bay', name: { en: 'Ha Long Bay', vi: 'Vịnh Hạ Long' }, country: { en: 'Vietnam', vi: 'Việt Nam' }, countryCode: 'VN', region: 'southeast', category: 'nature',
    tags: ['nature', 'adventure', 'beach', 'family'], dailyBudget: 65, ticketPrice: 45, rating: 4.9, duration: 3, bestMonths: [4, 5, 9, 10, 11], image: '/assets/ha-long-bay.jpg',
    description: { en: 'Cruise emerald waters beneath limestone karsts, explore impressive caves and paddle through quiet corners of one of Vietnam’s most memorable seascapes.', vi: 'Du ngoạn trên làn nước xanh ngọc giữa những núi đá vôi, khám phá hang động và chèo thuyền đến những góc yên bình của một trong những vùng biển đẹp nhất Việt Nam.' },
    highlights: { en: ['A scenic bay cruise', 'Kayaking among limestone islands', 'Caves and floating communities'], vi: ['Du thuyền ngắm cảnh vịnh', 'Chèo kayak giữa các đảo đá vôi', 'Hang động và cộng đồng làng chài nổi'] },
    food: { en: ['Fresh seafood', 'Ha Long squid cakes', 'Vietnamese spring rolls'], vi: ['Hải sản tươi', 'Chả mực Hạ Long', 'Nem Việt Nam'] },
    season: { en: 'April–May and September–November are useful planning windows. Storms can affect summer sailings; check the operator’s current advice.', vi: 'Tháng 4–5 và tháng 9–11 thường thích hợp để lên kế hoạch. Bão có thể ảnh hưởng đến chuyến tàu mùa hè; hãy kiểm tra thông tin mới nhất từ đơn vị vận hành.' },
    coordinates: { lat: 20.9101, lng: 107.1839 }, officialUrl: 'https://vietnam.travel/places-to-go/northern-vietnam/ha-long'
  },
  {
    id: 'hoi-an', name: { en: 'Hoi An', vi: 'Hội An' }, country: { en: 'Vietnam', vi: 'Việt Nam' }, countryCode: 'VN', region: 'southeast', category: 'culture',
    tags: ['culture', 'food', 'beach', 'family'], dailyBudget: 40, ticketPrice: 18, rating: 4.8, duration: 4, bestMonths: [2, 3, 4, 5, 6, 7], image: '/assets/hoi-an.jpg',
    description: { en: 'Lantern-lit lanes, yellow shop houses and the Thu Bon River set the pace in Hoi An. Add countryside cycling and time by the coast to your old-town walks.', vi: 'Những con phố rực đèn lồng, nhà cổ màu vàng và dòng sông Thu Bồn tạo nên nhịp sống Hội An. Kết hợp dạo phố cổ với đạp xe qua đồng quê và thư giãn bên biển.' },
    highlights: { en: ['Ancient Town and Japanese Bridge', 'Lantern-lit riverside walks', 'Rice-field cycling and nearby beaches'], vi: ['Phố cổ và Chùa Cầu', 'Dạo bờ sông dưới ánh đèn lồng', 'Đạp xe qua đồng lúa và đến bãi biển gần đó'] },
    food: { en: ['Cao lau noodles', 'White rose dumplings', 'Banh mi'], vi: ['Cao lầu', 'Bánh hoa hồng trắng', 'Bánh mì'] },
    season: { en: 'February to July is a useful planning window for outdoor exploring. Late-year rain can be heavy, so check local conditions before traveling.', vi: 'Tháng 2 đến tháng 7 thường phù hợp để khám phá ngoài trời. Cuối năm có thể mưa lớn, nên kiểm tra tình hình địa phương trước khi đi.' },
    coordinates: { lat: 15.8801, lng: 108.3380 }, officialUrl: 'https://vietnam.travel/node/99'
  },
  {
    id: 'bangkok', name: { en: 'Bangkok', vi: 'Bangkok' }, country: { en: 'Thailand', vi: 'Thái Lan' }, countryCode: 'TH', region: 'southeast', category: 'city',
    tags: ['city', 'culture', 'food', 'family'], dailyBudget: 55, ticketPrice: 25, rating: 4.7, duration: 4, bestMonths: [1, 2, 11, 12], image: '/assets/bangkok.jpg',
    description: { en: 'Discover riverside temples, lively markets and a city that takes its food seriously. Bangkok combines cultural landmarks with everyday neighborhood adventures.', vi: 'Khám phá đền chùa bên sông, khu chợ nhộn nhịp và thành phố có nền ẩm thực đầy sức hút. Bangkok kết hợp những biểu tượng văn hóa với trải nghiệm đời thường trong từng khu phố.' },
    highlights: { en: ['Wat Arun by the Chao Phraya', 'The Grand Palace area', 'Chinatown food and market walks'], vi: ['Wat Arun bên sông Chao Phraya', 'Khu Hoàng cung', 'Khám phá ẩm thực và chợ ở Chinatown'] },
    food: { en: ['Pad Thai', 'Tom yum', 'Mango sticky rice'], vi: ['Pad Thai', 'Canh tom yum', 'Xôi xoài'] },
    season: { en: 'November to February is a useful cooler-season planning window. The city is warm year-round; schedule outdoor walks earlier in the day.', vi: 'Tháng 11 đến tháng 2 thường có thời tiết dễ chịu hơn. Thành phố nóng quanh năm; nên sắp xếp hoạt động ngoài trời vào sáng sớm.' },
    coordinates: { lat: 13.7563, lng: 100.5018 }, officialUrl: 'https://www.tourismthailand.org/Destinations/Provinces/Bangkok/219'
  },
  {
    id: 'phuket', name: { en: 'Phuket', vi: 'Phuket' }, country: { en: 'Thailand', vi: 'Thái Lan' }, countryCode: 'TH', region: 'southeast', category: 'beach',
    tags: ['beach', 'nature', 'wellness', 'food', 'family'], dailyBudget: 70, ticketPrice: 35, rating: 4.7, duration: 5, bestMonths: [1, 2, 3, 4, 11, 12], image: '/assets/phuket.jpg',
    description: { en: 'Beach days meet colorful old-town streets on Thailand’s largest island. Choose your own balance of coastal relaxation, local food and island viewpoints.', vi: 'Những ngày thư giãn bên biển hòa cùng các con phố cổ đầy màu sắc trên hòn đảo lớn nhất Thái Lan. Tự chọn nhịp khám phá với nghỉ dưỡng, món ăn địa phương và điểm ngắm cảnh.' },
    highlights: { en: ['Kata and Karon beaches', 'Phuket Old Town’s historic streets', 'Promthep Cape coastal views'], vi: ['Bãi biển Kata và Karon', 'Những con phố lịch sử ở phố cổ Phuket', 'Cảnh biển từ mũi Promthep'] },
    food: { en: ['Hokkien noodles', 'Fresh seafood', 'Dim sum'], vi: ['Mì Phúc Kiến', 'Hải sản tươi', 'Dim sum'] },
    season: { en: 'November to April is a useful dry-season planning window. Sea conditions vary; always follow beach flags and current boat advice.', vi: 'Tháng 11 đến tháng 4 thường phù hợp để lên kế hoạch vào mùa khô. Tình trạng biển thay đổi; luôn tuân thủ cờ cảnh báo và hướng dẫn của đơn vị vận hành tàu.' },
    coordinates: { lat: 7.8804, lng: 98.3923 }, officialUrl: 'https://www.tourismthailand.org/Destinations/Provinces/Phuket/350'
  },
  {
    id: 'seoul', name: { en: 'Seoul', vi: 'Seoul' }, country: { en: 'South Korea', vi: 'Hàn Quốc' }, countryCode: 'KR', region: 'east', category: 'city',
    tags: ['city', 'culture', 'food', 'family'], dailyBudget: 95, ticketPrice: 30, rating: 4.8, duration: 5, bestMonths: [4, 5, 9, 10], image: '/assets/seoul.jpg',
    description: { en: 'Royal palaces and traditional hanok streets sit beside creative neighborhoods and busy food markets. Seoul makes it easy to move between heritage and modern city life.', vi: 'Cung điện hoàng gia và những con phố hanok truyền thống nằm cạnh các khu phố sáng tạo và chợ ẩm thực nhộn nhịp. Seoul đưa bạn từ di sản đến nhịp sống hiện đại một cách dễ dàng.' },
    highlights: { en: ['Gyeongbokgung Palace', 'Bukchon’s traditional hanok streets', 'Namsan views and Gwangjang Market'], vi: ['Cung điện Gyeongbokgung', 'Phố nhà hanok truyền thống ở Bukchon', 'Ngắm cảnh Namsan và chợ Gwangjang'] },
    food: { en: ['Bibimbap', 'Korean barbecue', 'Bindaetteok pancakes'], vi: ['Cơm trộn bibimbap', 'Thịt nướng Hàn Quốc', 'Bánh đậu xanh bindaetteok'] },
    season: { en: 'Spring and autumn are comfortable for sightseeing. Winters are cold; summers can be hot and rainy. Respect quiet hours in residential Bukchon.', vi: 'Mùa xuân và mùa thu thuận tiện để tham quan. Mùa đông lạnh; mùa hè có thể nóng và mưa nhiều. Tôn trọng giờ yên tĩnh tại khu dân cư Bukchon.' },
    coordinates: { lat: 37.5665, lng: 126.9780 }, officialUrl: 'https://english.visitseoul.net/AboutSeoul'
  },
  {
    id: 'singapore', name: { en: 'Singapore', vi: 'Singapore' }, country: { en: 'Singapore', vi: 'Singapore' }, countryCode: 'SG', region: 'southeast', category: 'city',
    tags: ['city', 'nature', 'food', 'family'], dailyBudget: 140, ticketPrice: 40, rating: 4.8, duration: 4, bestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], image: '/assets/singapore.jpg',
    description: { en: 'Explore waterfront skylines, lush gardens and neighborhoods full of cultural character. Singapore’s hawker centers make the city’s diverse food traditions part of every day.', vi: 'Khám phá đường chân trời bên vịnh, khu vườn xanh mát và những khu phố giàu bản sắc. Các trung tâm ẩm thực bình dân đưa nét đa dạng của Singapore vào từng bữa ăn.' },
    highlights: { en: ['Marina Bay waterfront', 'Gardens by the Bay', 'Chinatown and hawker centers'], vi: ['Bờ vịnh Marina Bay', 'Gardens by the Bay', 'Chinatown và các trung tâm ẩm thực bình dân'] },
    food: { en: ['Hainanese chicken rice', 'Laksa', 'Kaya toast'], vi: ['Cơm gà Hải Nam', 'Mì laksa', 'Bánh mì nướng kaya'] },
    season: { en: 'A year-round destination with warm, humid weather. Brief heavy showers are common; combine outdoor sights with indoor breaks.', vi: 'Có thể khám phá quanh năm, với thời tiết nóng và ẩm. Mưa rào lớn khá thường xuyên; nên kết hợp điểm tham quan ngoài trời với thời gian nghỉ trong nhà.' },
    coordinates: { lat: 1.3521, lng: 103.8198 }, officialUrl: 'https://www.visitsingapore.com/neighbourhood/featured-neighbourhood/chinatown/'
  },
  {
    id: 'siem-reap', name: { en: 'Siem Reap', vi: 'Siem Reap' }, country: { en: 'Cambodia', vi: 'Campuchia' }, countryCode: 'KH', region: 'southeast', category: 'culture',
    tags: ['culture', 'adventure', 'nature', 'food'], dailyBudget: 45, ticketPrice: 37, rating: 4.8, duration: 4, bestMonths: [1, 2, 3, 11, 12], image: '/assets/siem-reap.jpg',
    description: { en: 'Use Siem Reap as your base for the temples of Angkor. Stone carvings, monumental towers and forest-framed ruins make space for days of cultural discovery.', vi: 'Chọn Siem Reap làm điểm xuất phát khám phá quần thể Angkor. Phù điêu đá, những ngọn tháp đồ sộ và di tích giữa rừng mang đến nhiều ngày tìm hiểu văn hóa.' },
    highlights: { en: ['Angkor Wat’s temple architecture', 'Bayon’s carved stone faces', 'Ta Prohm’s forest setting'], vi: ['Kiến trúc đền Angkor Wat', 'Những gương mặt chạm đá ở Bayon', 'Khung cảnh rừng bao quanh Ta Prohm'] },
    food: { en: ['Fish amok', 'Khmer noodle soup', 'Fresh tropical fruit'], vi: ['Cá amok', 'Mì nước Khmer', 'Trái cây nhiệt đới tươi'] },
    season: { en: 'November to March is a useful cooler, drier planning window. Start temple visits early and leave time to rest during the midday heat.', vi: 'Tháng 11 đến tháng 3 thường mát và khô hơn. Nên tham quan đền từ sáng sớm và dành thời gian nghỉ khi trời nóng giữa ngày.' },
    coordinates: { lat: 13.3633, lng: 103.8564 }, officialUrl: 'https://www.tourismcambodia.com/travelguides/provinces/siem-reap/what-to-see/294_angkor-wat.htm'
  },
  {
    id: 'kathmandu', name: { en: 'Kathmandu', vi: 'Kathmandu' }, country: { en: 'Nepal', vi: 'Nepal' }, countryCode: 'NP', region: 'south', category: 'adventure',
    tags: ['adventure', 'culture', 'nature', 'food'], dailyBudget: 40, ticketPrice: 22, rating: 4.7, duration: 4, bestMonths: [3, 4, 5, 10, 11], image: '/assets/kathmandu.jpg',
    description: { en: 'Begin with the courtyards and temples of Kathmandu’s historic center, then take in hilltop stupas and the wider valley. A rewarding base for cultural exploration and outdoor plans.', vi: 'Bắt đầu ở những sân trong và đền tại trung tâm lịch sử Kathmandu, rồi đến bảo tháp trên đồi và khám phá thung lũng. Đây là điểm dừng chân thú vị cho hành trình văn hóa và hoạt động ngoài trời.' },
    highlights: { en: ['Kathmandu Durbar Square', 'Swayambhu Stupa', 'Kathmandu Valley heritage walks'], vi: ['Quảng trường Durbar Kathmandu', 'Bảo tháp Swayambhu', 'Dạo khám phá di sản thung lũng Kathmandu'] },
    food: { en: ['Momo dumplings', 'Dal bhat', 'Newari dishes'], vi: ['Bánh bao momo', 'Cơm dal bhat', 'Món ăn Newari'] },
    season: { en: 'Spring and autumn are useful planning windows. Conditions in the mountains differ from the city; plan any trek with current local information.', vi: 'Mùa xuân và mùa thu thường phù hợp để lên kế hoạch. Thời tiết trên núi khác với thành phố; khi đi trekking hãy sử dụng thông tin địa phương mới nhất.' },
    coordinates: { lat: 27.7172, lng: 85.3240 }, officialUrl: 'https://ntb.gov.np/kathmandu-durbar-square'
  },
  {
    id: 'taipei', name: { en: 'Taipei', vi: 'Đài Bắc' }, country: { en: 'Taiwan', vi: 'Đài Loan' }, countryCode: 'TW', region: 'east', category: 'city',
    tags: ['city', 'culture', 'nature', 'food', 'family'], dailyBudget: 80, ticketPrice: 25, rating: 4.7, duration: 4, bestMonths: [3, 4, 5, 10, 11], image: '/assets/taipei.jpg',
    description: { en: 'Bring an appetite to Taipei’s lively night markets, then balance city exploring with temple visits and hillside walks. Skyline views and neighborhood food stops go hand in hand.', vi: 'Hãy mang theo chiếc bụng đói đến các chợ đêm sôi động của Đài Bắc, rồi kết hợp khám phá thành phố với thăm đền và đi bộ trên đồi. Cảnh thành phố và món ngon khu phố luôn song hành.' },
    highlights: { en: ['Taipei 101 and Elephant Mountain views', 'Longshan Temple', 'Night-market food walks'], vi: ['Taipei 101 và cảnh từ núi Voi', 'Chùa Long Sơn', 'Khám phá ẩm thực chợ đêm'] },
    food: { en: ['Beef noodle soup', 'Xiao long bao', 'Bubble tea'], vi: ['Mì bò', 'Tiểu long bao', 'Trà sữa trân châu'] },
    season: { en: 'Spring and autumn are useful planning windows for city walks. Rain is possible year-round; check current weather during typhoon season.', vi: 'Mùa xuân và mùa thu thường phù hợp để đi bộ khám phá. Có thể mưa quanh năm; hãy kiểm tra thời tiết mới nhất trong mùa bão.' },
    coordinates: { lat: 25.0330, lng: 121.5654 }, officialUrl: 'https://www.travel.taipei/en'
  }
];
