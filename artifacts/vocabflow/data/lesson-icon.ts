export type LessonIconName =
  | 'users'
  | 'home'
  | 'hash'
  | 'clock'
  | 'coffee'
  | 'shopping-bag'
  | 'droplet'
  | 'heart'
  | 'book-open'
  | 'briefcase'
  | 'map'
  | 'map-pin'
  | 'shopping-cart'
  | 'cloud'
  | 'gift'
  | 'sun'
  | 'smartphone'
  | 'smile'
  | 'activity'
  | 'play-circle'
  | 'compass'
  | 'box'
  | 'link'
  | 'bookmark'
  | 'award'
  | 'feather'
  | 'type'
  | 'star';

function normalizeTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

/** Returns a stable, offline Feather icon for a lesson and its course context. */
export function getLessonIconName(lessonTitle: string, courseTitle = ''): LessonIconName {
  const title = normalizeTitle(lessonTitle);
  const course = normalizeTitle(courseTitle);
  const context = `${title} ${course}`;

  if (/collocation|ket hop|cum tu|ket hop tu/.test(context)) return 'link';

  const level = context.match(/\b([bc][12])\b/i)?.[1]?.toUpperCase();
  if (level === 'B1') return 'book-open';
  if (level === 'B2') return 'bookmark';
  if (level === 'C1') return 'award';
  if (level === 'C2') return 'star';

  if (/gia dinh/.test(title)) return 'users';
  if (/nha cua|nha o/.test(title)) return 'home';
  if (/so dem|so luong|con so/.test(title)) return 'hash';
  if (/thoi gian|gio giac/.test(title)) return 'clock';
  if (/do an|thuc pham|mon an/.test(title)) return 'coffee';
  if (/nau an|vao bep/.test(title)) return 'coffee';
  if (/quan ao|trang phuc/.test(title)) return 'shopping-bag';
  if (/mau sac/.test(title)) return 'droplet';
  if (/suc khoe|benh tat/.test(title)) return 'heart';
  if (/truong hoc|hoc tap/.test(title)) return 'book-open';
  if (/cong viec|nghe nghiep/.test(title)) return 'briefcase';
  if (/du lich|di lai/.test(title)) return 'map';
  if (/thanh pho|dia diem|noi chon/.test(title)) return 'map-pin';
  if (/mua sam/.test(title)) return 'shopping-cart';
  if (/thoi tiet/.test(title)) return 'cloud';
  if (/dong vat|thu cung/.test(title)) return 'feather';
  if (/sinh hoat|hang ngay|daily life/.test(title)) return 'sun';
  if (/cong nghe|thiet bi/.test(title)) return 'smartphone';
  if (/cam xuc|tinh cam/.test(title)) return 'smile';
  if (/dong tu/.test(title)) return 'play-circle';
  if (/tinh tu/.test(title)) return 'type';
  if (/phuong huong|chi duong|huong di/.test(title)) return 'compass';
  if (/do vat|vat dung/.test(title)) return 'box';
  if (/tu noi|lien tu|ket tu/.test(title)) return 'link';

  return 'book-open';
}
