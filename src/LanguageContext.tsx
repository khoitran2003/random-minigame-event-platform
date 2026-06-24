import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'vi';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'config.title': 'Event Configuration',
    'config.basic': 'Basic Details',
    'config.defaultEventName': 'Grand Prize Draw',
    'config.eventNamePlaceholder': 'e.g. Who is the lucky guy?',
    'config.eventName': 'Event Name',
    'config.backgroundStyling': 'Background Styling',
    'config.uploadImage': 'Upload Image',
    'config.orImageUrl': 'Or enter image URL',
    'config.prizesSetup': 'Prizes Setup',
    'config.firstPrize': 'First Prize',
    'config.prizeName': 'Prize Name',
    'config.background': 'Background Image URL (Optional)',
    'config.blur': 'Blur',
    'config.opacity': 'Opacity',
    'config.prizes': 'Prizes & Quantities',
    'config.addPrize': 'Add Prize',
    'config.participants': 'Participants List',
    'config.participantsDesc': 'Paste list of IDs and Names (Tab or Comma separated)',
    'config.loadSample': 'Load Sample List',
    'config.count': 'Total: {count}',
    'config.continue': 'Save & Continue to Games',
    'config.orColor': 'or Color:',
    'config.blurAmount': 'Blur Amount:',
    'config.darkenOverlay': 'Darken Overlay:',
    'config.qty': 'Qty:',
    'config.csvFormat': 'CSV must include ids and name headers.',
    'config.csvPlaceholder': 'No participants loaded.',
    'config.uploadCsv': 'Upload CSV File',
    'config.uploadSuccess': 'Successfully loaded {count} participants',
    'config.moreParticipants': '+ {count} more...',
    
    'menu.title': 'Select Game Mode',
    'menu.back': 'Back to Config',
    'menu.LUCKY_NUMBERS': 'Lucky Numbers',
    'menu.LUCKY_NUMBERS_desc': 'Slot machine style draw',
    'menu.HUMAN_ATHLETICS': 'Human Athletics',
    'menu.HUMAN_ATHLETICS_desc': 'Horizontal sprint to the finish',
    'menu.LUCKY_WHEEL': 'Lucky Wheel',
    'menu.LUCKY_WHEEL_desc': 'Spinning roulette wheel',
    'menu.MYSTERY_CHESTS': 'Mystery Chests',
    'menu.MYSTERY_CHESTS_desc': 'Pick the winning chest',
    'menu.GACHA_MACHINE': 'Gacha Machine',
    'menu.GACHA_MACHINE_desc': 'Capsule dispenser reveal',
    'menu.BALLOON_POP': 'Balloon Pop',
    'menu.BALLOON_POP_desc': 'Pop balloons to reveal winners',
    'menu.CARD_FLIP': 'Card Flip',
    'menu.CARD_FLIP_desc': '3D facedown card reveal',
    
    'game.back': 'Back to Menu',
    'game.draw': 'Draw Next Winner!',
    'game.spin': 'Spin the Wheel!',
    'game.rewardLog': 'Reward Log',
    'game.remaining': 'Remaining: {count}',
    'game.drawing': 'Drawing:',
    'game.prizeDefault': 'Prize',
    'game.underConstruction': 'The {gameMode} game mode is currently under construction. Please try Lucky Numbers or Lucky Wheel.',
    
    'finale.title': 'CONGRATULATIONS TO THE WINNERS!',
    'finale.others': 'Other Rewards',
    'finale.nextGame': 'Next Game (Remaining Users)',

    'modal.title': 'Reward Decision',
    'modal.desc': 'Confirm the prize distribution.',
    'modal.prizeLabel': 'Prize',
    'modal.winnerIdLabel': 'Winner ID',
    'modal.winnerNameLabel': 'Winner Name',
    'modal.rejectBtn': 'Reject',
    'modal.acceptBtn': 'Accept',
    'modal.rejectQuestion': 'What would you like to do with this user?',
    'modal.keepBtn': 'Keep in Pool',
    'modal.removeBtn': 'Remove from Pool',
    'modal.cancelBtn': 'Cancel',
    
    'log.title': 'Reward Log',
    'log.desc': 'View all claimed and rejected rewards from this session.',
    'log.viewAll': 'View all claimed and rejected rewards.',
    'log.export': 'Export CSV',
    'log.reset': 'Reset Session & Logs',
    'log.time': 'Timestamp',
    'log.game': 'Game',
    'log.prize': 'Prize',
    'log.id': 'Winner ID',
    'log.name': 'Winner Name',
    'log.status': 'Status',
    'log.empty': 'No rewards logged yet.',
    
    'status.accepted': 'Accepted',
    'status.rejectedKeep': 'Rejected (Kept)',
    'status.rejectedRemove': 'Rejected (Removed)',
    'game.comingSoon': 'Coming Soon',
    'modal.winner': 'Winner',
    'config.csvErrorParsing': 'Error parsing CSV file. Please check the format.',
    'config.csvErrorHeader': 'CSV must contain "ids" and "name" columns.',
    'config.csvErrorNoParticipants': 'No valid participants found in CSV.',
    'config.csvErrorRead': 'Failed to read the file.',
    'config.prizeTier': 'Prize Tier {number}',
    'generic.id': 'ID',
    'generic.name': 'Name',
    'generic.reason': 'Reason',
    'config.removed': 'Removed',
    'config.remaining': 'Remaining',
    'config.removedCount': 'Removed: {count}'
  },
  vi: {
    'config.title': 'Cấu hình sự kiện',
    'config.basic': 'Thông tin cơ bản',
    'config.defaultEventName': 'Giải thưởng lớn',
    'config.eventNamePlaceholder': 'VD: Ai là kẻ may mắn?',
    'config.eventName': 'Tên sự kiện',
    'config.backgroundStyling': 'Tùy chỉnh nền',
    'config.uploadImage': 'Tải ảnh lên',
    'config.orImageUrl': 'Hoặc nhập URL ảnh',
    'config.prizesSetup': 'Cài đặt giải thưởng',
    'config.firstPrize': 'Giải nhất',
    'config.prizeName': 'Tên giải thưởng',
    'config.background': 'URL ảnh nền (Tùy chọn)',
    'config.blur': 'Độ mờ',
    'config.opacity': 'Độ đục',
    'config.prizes': 'Giải thưởng & Số lượng',
    'config.addPrize': 'Thêm giải thưởng',
    'config.participants': 'Danh sách tham gia',
    'config.participantsDesc': 'Dán danh sách ID và Tên (phân cách bằng Tab hoặc Dấu phẩy)',
    'config.loadSample': 'Tải danh sách mẫu',
    'config.count': 'Tổng: {count}',
    'config.continue': 'Lưu & Tiếp tục',
    'config.orColor': 'hoặc Màu:',
    'config.blurAmount': 'Độ mờ:',
    'config.darkenOverlay': 'Phủ tối:',
    'config.qty': 'SL:',
    'config.csvFormat': 'CSV phải chứa tiêu đề cột là ids và name.',
    'config.csvPlaceholder': 'Chưa có danh sách.',
    'config.uploadCsv': 'Tải CSV lên',
    'config.uploadSuccess': 'Tải thành công {count} người tham gia',
    'config.moreParticipants': '+ {count} người nữa...',
    
    'menu.title': 'Chọn chế độ chơi',
    'menu.back': 'Quay lại cấu hình',
    'menu.LUCKY_NUMBERS': 'Vòng quay số',
    'menu.LUCKY_NUMBERS_desc': 'Rút thăm ngẫu nhiên',
    'menu.HUMAN_ATHLETICS': 'Điền kinh',
    'menu.HUMAN_ATHLETICS_desc': 'Cuộc đua kỳ thú',
    'menu.LUCKY_WHEEL': 'Vòng quay may mắn',
    'menu.LUCKY_WHEEL_desc': 'Quay vòng quay để chọn',
    'menu.MYSTERY_CHESTS': 'Hộp quà bí ẩn',
    'menu.MYSTERY_CHESTS_desc': 'Chọn hộp quà may mắn',
    'menu.GACHA_MACHINE': 'Máy Gacha',
    'menu.GACHA_MACHINE_desc': 'Mở quả cầu may mắn',
    'menu.BALLOON_POP': 'Bắn bóng bay',
    'menu.BALLOON_POP_desc': 'Bắn bóng để tìm người trúng',
    'menu.CARD_FLIP': 'Lật bài',
    'menu.CARD_FLIP_desc': 'Lật bài 3D',
    
    'game.back': 'Trở về Menu',
    'game.draw': 'Rút người tiếp theo!',
    'game.spin': 'Quay vòng quay!',
    'game.rewardLog': 'Lịch sử trao giải',
    'game.remaining': 'Còn lại: {count}',
    'game.drawing': 'Đang quay giải:',
    'game.prizeDefault': 'Giải thưởng',
    'game.underConstruction': 'Trò chơi {gameMode} hiện đang được xây dựng. Vui lòng thử Vòng quay số hoặc Vòng quay may mắn.',
    
    'finale.title': 'CHÚC MỪNG CÁC NGƯỜI CHIẾN THẮNG!',
    'finale.others': 'Các giải thưởng khác',
    'finale.nextGame': 'Bốc thăm tiếp với user còn lại',
 
    'modal.title': 'Quyết định trao giải',
    'modal.desc': 'Xác nhận trao giải cho người này.',
    'modal.prizeLabel': 'Giải thưởng',
    'modal.winnerIdLabel': 'ID người trúng',
    'modal.winnerNameLabel': 'Tên người trúng',
    'modal.rejectBtn': 'Từ chối',
    'modal.acceptBtn': 'Chấp nhận',
    'modal.rejectQuestion': 'Bạn muốn xử lý người này như thế nào?',
    'modal.keepBtn': 'Giữ lại trong danh sách',
    'modal.removeBtn': 'Xóa khỏi danh sách',
    'modal.cancelBtn': 'Hủy',
    
    'log.title': 'Lịch sử trúng thưởng',
    'log.desc': 'Xem tất cả giải thưởng đã nhận hoặc bị từ chối trong phiên này.',
    'log.viewAll': 'Xem tất cả giải thưởng đã nhận hoặc bị từ chối.',
    'log.export': 'Xuất CSV',
    'log.reset': 'Đặt lại lượt chơi & Lịch sử',
    'log.time': 'Thời gian',
    'log.game': 'Trò chơi',
    'log.prize': 'Giải thưởng',
    'log.id': 'ID người thắng',
    'log.name': 'Người trúng giải',
    'log.status': 'Trạng thái',
    'log.empty': 'Chưa có dữ liệu trao giải.',
    
    'status.accepted': 'Chấp nhận',
    'status.rejectedKeep': 'Từ chối (Giữ lại)',
    'status.rejectedRemove': 'Từ chối (Loại bỏ)',
    'game.comingSoon': 'Sắp ra mắt',
    'modal.winner': 'Người thắng giải',
    'config.csvErrorParsing': 'Lỗi phân tích cú pháp tệp CSV. Vui lòng kiểm tra định dạng.',
    'config.csvErrorHeader': 'Tệp CSV phải chứa các cột "ids" và "name".',
    'config.csvErrorNoParticipants': 'Không tìm thấy người tham gia hợp lệ nào trong tệp CSV.',
    'config.csvErrorRead': 'Không thể đọc tệp.',
    'config.prizeTier': 'Hạng giải {number}',
    'generic.id': 'ID',
    'generic.name': 'Tên',
    'generic.reason': 'Lý do',
    'config.removed': 'Đã loại',
    'config.remaining': 'Còn lại',
    'config.removedCount': 'Đã loại: {count}'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Language>('vi');

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    let text = translations[lang][key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
