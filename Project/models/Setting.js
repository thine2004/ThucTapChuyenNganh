const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
    // Branding
    logoText: { type: String, default: 'ENGLISH MASTER' },
    logoIcon: { type: String, default: 'fa-graduation-cap' },
    
    // Footer Information
    footerAbout: { type: String, default: 'EnglishMaster là đơn vị đào tạo tiếng Anh uy tín hàng đầu, chuyên cung cấp các lộ trình tối ưu cho kỳ thi TOEIC, IELTS và giao tiếp thực tiễn.' },
    footerAddress: { type: String, default: 'Số 123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh' },
    footerPhone: { type: String, default: '1900 6789 - 028 1234 5678' },
    footerEmail: { type: String, default: 'contact@englishmaster.edu.vn' },
    
    // Social Links
    socialFacebook: { type: String, default: 'https://facebook.com/englishmaster' },
    socialYoutube: { type: String, default: 'https://youtube.com/englishmaster' },
    socialLinkedin: { type: String, default: 'https://linkedin.com/company/englishmaster' },
    socialTiktok: { type: String, default: 'https://tiktok.com/@englishmaster' },
    
    // Hero/Carousel Section
    heroTitle: { type: String, default: 'Chinh Phục Chứng Chỉ Quốc Tế Cùng Chuyên Gia' },
    heroSubtitle: { type: String, default: 'HỆ THỐNG ĐÀO TẠO TIẾNG ANH CHUẨN QUỐC TẾ' },
    heroDescription: { type: String, default: 'Lộ trình học cá nhân hóa giúp học viên bứt phá điểm số IELTS, TOEIC trong thời gian ngắn nhất với đội ngũ giảng viên 8.5+ IELTS.' },
    heroImage: { type: String, default: '/img/carousel-1.jpg' },

    // About Section
    aboutTitle: { type: String, default: 'Tầm Nhìn Và Sứ Mệnh Của EnglishMaster' },
    aboutDescription: { type: String, default: 'Với hơn 10 năm tâm huyết trong giáo dục, chúng tôi tin rằng mỗi người đều có tiềm năng ngôn ngữ vô hạn nếu được dẫn dắt bởi phương pháp đúng đắn và sự tận tâm.' },
    aboutImage: { type: String, default: '/img/about.jpg' },
    aboutPoints: { type: [String], default: [
        'Đội ngũ giảng viên IELTS 8.5+ và Guru TOEIC',
        'Phương pháp học Active Learning tiên tiến',
        'Cam kết đầu ra bằng văn bản pháp lý',
        'Sĩ số lớp học giới hạn (tối đa 10 học viên)',
        'Hỗ trợ học tập 24/7 cùng trợ giảng chuyên môn',
        'Cơ sở vật chất hiện đại, chuẩn quốc tế'
    ] },
    
    // Features (The 4 cards)
    features: [
        {
            icon: { type: String, default: 'fa-user-tie' },
            title: { type: String, default: 'Giảng Viên Chuyên Gia' },
            description: { type: String, default: 'Sở hữu chứng chỉ quốc tế và nhiều năm kinh nghiệm thực chiến.' }
        },
        {
            icon: { type: String, default: 'fa-laptop-code' },
            title: { type: String, default: 'Nền Tảng Hiện Đại' },
            description: { type: String, default: 'Kết hợp học offline và hệ thống LMS trực tuyến thông minh.' }
        },
        {
            icon: { type: String, default: 'fa-certificate' },
            title: { type: String, default: 'Cam Kết Chất Lượng' },
            description: { type: String, default: 'Hoàn 100% học phí hoặc học lại miễn phí nếu không đạt kết quả.' }
        },
        {
            icon: { type: String, default: 'fa-book-reader' },
            title: { type: String, default: 'Giáo Trình Độc Quyền' },
            description: { type: String, default: 'Biên soạn từ các nguồn uy tín như Cambridge, Oxford và ETS.' }
        }
    ],

    // Team Section
    teamTitle: { type: String, default: 'Đội Ngũ Giảng Viên Tâm Huyết' },
    teamSubtitle: { type: String, default: 'ĐỘI NGŨ CỐ VẤN' },
    teamDescription: { type: String, default: 'Những "người truyền lửa" không chỉ giỏi chuyên môn mà còn thấu hiểu tâm lý học viên để đưa ra những lời khuyên hữu ích nhất.' },

    // Statistics Section
    stats: [
        {
            value: { type: String, default: '20+' },
            label: { type: String, default: 'Giảng Viên' }
        },
        {
            value: { type: String, default: '5000+' },
            label: { type: String, default: 'Học Viên' }
        },
        {
            value: { type: String, default: '99%' },
            label: { type: String, default: 'Tỷ Lệ Đạt Mục Tiêu' }
        },
        {
            value: { type: String, default: '12' },
            label: { type: String, default: 'Giải Thưởng Giáo Dục' }
        }
    ],

    // Team CTA Section
    teamCtaTitle: { type: String, default: 'Bắt Đầu Hành Trình Chinh Phục Tiếng Anh Ngay Hôm Nay!' },
    teamCtaDescription: { type: String, default: 'Đừng để ngôn ngữ trở thành rào cản sự nghiệp của bạn. Đăng ký nhận tư vấn lộ trình phù hợp nhất với trình độ của bạn.' },

    // Contact Page Section
    contactTitle: { type: String, default: 'Liên Hệ Tư Vấn & Đăng Ký Học Thử' },
    contactSubtitle: { type: String, default: 'KẾT NỐI VỚI CHÚNG TÔI' },
    contactDescription: { type: String, default: 'Chúng tôi luôn lắng nghe và sẵn sàng hỗ trợ bạn 24/7. Hãy để lại thông tin để được đội ngũ chuyên viên liên hệ ngay.' },
    contactMapsUrl: { type: String, default: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.424184103987!2d106.7002501757599!3d10.775974189372122!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f467a87e8c5%3A0xa6cbc5c559a7d4e1!2sNguyen%20Hue%20Street%2C%20District%201%2C%20Ho%20Chi%20Minh%20City%2C%20Vietnam!5e0!3m2!1sen!2s!4v1700000000000!5m2!1sen!2s' },
    contactWorkingHours: { type: String, default: 'Thứ 2 - Thứ 6: 08:30 - 21:00\nThứ 7 - Chủ Nhật: 09:00 - 18:30' },

    // FAQ Section
    faqs: [
        {
            question: { type: String, default: 'Lộ trình học tại EnglishMaster kéo dài bao lâu?' },
            answer: { type: String, default: 'Tùy vào trình độ đầu vào và mục tiêu, lộ trình thường kéo dài từ 3 đến 6 tháng cho mỗi cấp độ bứt phá.' }
        },
        {
            question: { type: String, default: 'Trung tâm có hỗ trợ học bù nếu nghỉ học không?' },
            answer: { type: String, default: 'Có, học viên được hỗ trợ học bù qua video bài giảng hoặc các lớp học song song cùng trình độ.' }
        },
        {
            question: { type: String, default: 'Làm thế nào để nhận cam kết đầu ra?' },
            answer: { type: String, default: 'Học viên sẽ ký hợp đồng đào tạo cam kết đầu ra ngay khi đăng ký khóa học nếu đáp ứng đủ điều kiện chuyên cần.' }
        }
    ],

    // Courses Section
    coursesTitle: { type: String, default: 'Khám Phá Các Khóa Học Bán Chạy Nhất' },
    coursesSubtitle: { type: String, default: 'LỘ TRÌNH ĐÀO TẠO' },

    // Blog Section
    blogTitle: { type: String, default: 'Chia Sẻ Kinh Nghiệm & Tài Liệu Học Tập' },
    blogSubtitle: { type: String, default: 'TIN TỨC & BLOG' },

    // Testimonials Section
    testimonialTitle: { type: String, default: 'Cảm Nhận Từ Những Người Đi Trước' },
    testimonialSubtitle: { type: String, default: 'KẾT QUẢ THỰC TẾ' },

    // Site Identity
    siteTitle: { type: String, default: 'EnglishMaster | Hệ Thống Đào Tạo Tiếng Anh Chuẩn Quốc Tế' },
    siteDescription: { type: String, default: 'EnglishMaster là trung tâm luyện thi IELTS, TOEIC uy tín với cam kết đầu ra bằng văn bản. Hệ thống phòng học hiện đại, giảng viên chuyên môn cao.' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Setting', SettingSchema);
