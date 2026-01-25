import { Locale } from '@i18n/translations';

export type Step2CategoryId = 'food' | 'travel' | 'movies' | 'fashion' | 'music' | 'love';

export type Step2Question = {
  id: string;
  category: Step2CategoryId;
};

export const STEP2_QUESTIONS: Step2Question[] = [
  { id: 'food_1', category: 'food' },
  { id: 'food_2', category: 'food' },
  { id: 'food_3', category: 'food' },
  { id: 'food_4', category: 'food' },
  { id: 'food_5', category: 'food' },
  { id: 'travel_1', category: 'travel' },
  { id: 'travel_2', category: 'travel' },
  { id: 'travel_3', category: 'travel' },
  { id: 'travel_4', category: 'travel' },
  { id: 'travel_5', category: 'travel' },
  { id: 'movies_1', category: 'movies' },
  { id: 'movies_2', category: 'movies' },
  { id: 'movies_3', category: 'movies' },
  { id: 'movies_4', category: 'movies' },
  { id: 'movies_5', category: 'movies' },
  { id: 'fashion_1', category: 'fashion' },
  { id: 'fashion_2', category: 'fashion' },
  { id: 'fashion_3', category: 'fashion' },
  { id: 'fashion_4', category: 'fashion' },
  { id: 'fashion_5', category: 'fashion' },
  { id: 'music_1', category: 'music' },
  { id: 'music_2', category: 'music' },
  { id: 'music_3', category: 'music' },
  { id: 'music_4', category: 'music' },
  { id: 'music_5', category: 'music' },
  { id: 'love_1', category: 'love' },
  { id: 'love_2', category: 'love' },
  { id: 'love_3', category: 'love' },
  { id: 'love_4', category: 'love' },
  { id: 'love_5', category: 'love' },
];

type Step2TextMap = Record<Locale, Record<string, string>>;

export const STEP2_CATEGORY_LABELS: Step2TextMap = {
  en: {
    food: 'Food',
    travel: 'Travel',
    movies: 'Movies',
    fashion: 'Fashion',
    music: 'Music',
    love: 'Love / Relationship Preferences',
  },
  ja: {
    food: '食べ物',
    travel: '旅行',
    movies: '映画',
    fashion: 'ファッション',
    music: '音楽',
    love: '恋愛 / 関係の好み',
  },
  vi: {
    food: 'Đồ ăn',
    travel: 'Du lịch',
    movies: 'Phim ảnh',
    fashion: 'Thời trang',
    music: 'Âm nhạc',
    love: 'Tình yêu / Ưu tiên trong mối quan hệ',
  },
};

export const STEP2_QUESTION_TEXTS: Step2TextMap = {
  en: {
    food_1: 'I often choose Japanese food.',
    food_2: 'I prefer spicy food.',
    food_3: 'I like cooking at home more than eating out.',
    food_4: 'I like trying new dishes.',
    food_5: 'I often eat sweet desserts.',
    travel_1: 'I like traveling to places with lots of nature.',
    travel_2: 'I prefer local experiences over city sightseeing.',
    travel_3: 'I like traveling alone.',
    travel_4: 'I tend to plan trips carefully.',
    travel_5: 'I more often choose domestic travel over overseas travel.',
    movies_1: 'I often watch drama films.',
    movies_2: 'I often watch action films.',
    movies_3: 'I often avoid romance films.',
    movies_4: 'I prefer watching movies alone.',
    movies_5: 'I want to watch movies in theaters rather than streaming.',
    fashion_1: 'I often choose simple outfits.',
    fashion_2: 'I value my own classic style over trends.',
    fashion_3: 'I tend to buy clothes online.',
    fashion_4: 'I often choose calm colors over bright ones.',
    fashion_5: 'I tend to care about accessories like bags and shoes.',
    music_1: 'I often listen to rock.',
    music_2: 'I more often listen to Western music than Japanese music.',
    music_3: 'I prefer calm music.',
    music_4: 'I like going to live shows.',
    music_5: 'I often play music while working.',
    love_1: 'I prefer to see my partner frequently.',
    love_2: 'I like spending long periods of time with my partner.',
    love_3: 'I often choose calm places for dates.',
    love_4: 'I want to exchange messages regularly with my partner.',
    love_5: 'I want to share hobbies with my partner.',
  },
  ja: {
    food_1: '和食をよく選ぶほうだ。',
    food_2: '辛い料理を好むほうだ。',
    food_3: '外食より自炊が好きだ。',
    food_4: '新しい料理に挑戦するのが好きだ。',
    food_5: '甘いスイーツをよく食べる。',
    travel_1: '自然の多い場所への旅行が好きだ。',
    travel_2: '都市観光よりローカルな体験を選ぶほうだ。',
    travel_3: '一人旅が好きだ。',
    travel_4: '旅行では計画をしっかり立てる方だ。',
    travel_5: '海外旅行より国内旅行を選ぶことが多い。',
    movies_1: 'ドラマ映画をよく観る。',
    movies_2: 'アクション映画をよく観る。',
    movies_3: '恋愛映画を避けることが多い。',
    movies_4: '映画は一人で観る方が好きだ。',
    movies_5: '映画は配信より映画館で観たい。',
    fashion_1: 'シンプルな服装を選ぶことが多い。',
    fashion_2: '流行より自分の定番スタイルを重視する。',
    fashion_3: '洋服はオンラインで買うほうだ。',
    fashion_4: '明るい色より落ち着いた色を選ぶことが多い。',
    fashion_5: 'バッグや靴など小物にこだわるほうだ。',
    music_1: 'ロックをよく聴く。',
    music_2: '邦楽より洋楽を聴くことが多い。',
    music_3: '落ち着いた音楽を好む。',
    music_4: 'ライブに行くのが好きだ。',
    music_5: '音楽は作業中によく流すほうだ。',
    love_1: '恋人とは頻繁に会うほうが好きだ。',
    love_2: '恋人と長時間一緒に過ごすのが好きだ。',
    love_3: 'デートでは落ち着いた場所を選ぶことが多い。',
    love_4: '恋人とはこまめにメッセージを取り合いたい。',
    love_5: '恋人と共通の趣味を持ちたいと思うほうだ。',
  },
  vi: {
    food_1: 'Tôi thường chọn món ăn Nhật.',
    food_2: 'Tôi thích đồ ăn cay.',
    food_3: 'Tôi thích tự nấu ăn hơn là ăn ngoài.',
    food_4: 'Tôi thích thử các món mới.',
    food_5: 'Tôi thường ăn đồ ngọt.',
    travel_1: 'Tôi thích du lịch đến nơi có nhiều thiên nhiên.',
    travel_2: 'Tôi thích trải nghiệm địa phương hơn là tham quan thành phố.',
    travel_3: 'Tôi thích đi du lịch một mình.',
    travel_4: 'Khi đi du lịch tôi thường lên kế hoạch kỹ.',
    travel_5: 'Tôi thường chọn du lịch trong nước hơn là nước ngoài.',
    movies_1: 'Tôi thường xem phim chính kịch.',
    movies_2: 'Tôi thường xem phim hành động.',
    movies_3: 'Tôi thường tránh xem phim tình cảm.',
    movies_4: 'Tôi thích xem phim một mình hơn.',
    movies_5: 'Tôi muốn xem phim ở rạp hơn là xem trực tuyến.',
    fashion_1: 'Tôi thường chọn trang phục đơn giản.',
    fashion_2: 'Tôi coi trọng phong cách quen thuộc của mình hơn là chạy theo xu hướng.',
    fashion_3: 'Tôi thường mua quần áo online.',
    fashion_4: 'Tôi thường chọn màu trầm hơn màu sáng.',
    fashion_5: 'Tôi chú ý đến phụ kiện như túi xách và giày.',
    music_1: 'Tôi thường nghe nhạc rock.',
    music_2: 'Tôi thường nghe nhạc quốc tế hơn nhạc Nhật.',
    music_3: 'Tôi thích nhạc nhẹ nhàng.',
    music_4: 'Tôi thích đi xem nhạc live.',
    music_5: 'Tôi thường bật nhạc khi làm việc.',
    love_1: 'Tôi thích gặp người yêu thường xuyên.',
    love_2: 'Tôi thích ở bên người yêu trong thời gian dài.',
    love_3: 'Tôi thường chọn địa điểm yên tĩnh cho các buổi hẹn hò.',
    love_4: 'Tôi muốn nhắn tin qua lại thường xuyên với người yêu.',
    love_5: 'Tôi muốn có chung sở thích với người yêu.',
  },
};

export function getStep2CategoryLabel(locale: Locale, category: Step2CategoryId) {
  return STEP2_CATEGORY_LABELS[locale]?.[category]?.trim() ?? STEP2_CATEGORY_LABELS.en[category] ?? '';
}

export function getStep2QuestionText(locale: Locale, questionId: string) {
  const localized = STEP2_QUESTION_TEXTS[locale]?.[questionId]?.trim();
  if (localized) return localized;
  return STEP2_QUESTION_TEXTS.en[questionId] ?? '';
}
