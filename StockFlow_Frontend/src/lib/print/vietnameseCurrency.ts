// Đọc số tiền bằng chữ tiếng Việt (dùng cho phiếu in), VD 172.911.400 →
// "Một trăm bảy mươi hai triệu chín trăm mười một nghìn bốn trăm đồng."

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

/** Đọc 1 nhóm 3 chữ số; full = nhóm không đứng đầu → đọc cả "không trăm", "lẻ" */
function readGroup(n: number, full: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor(n / 10) % 10;
  const u = n % 10;
  const parts: string[] = [];
  if (full || h > 0) parts.push(`${DIGITS[h]} trăm`);
  if (t === 0) {
    if (u > 0) parts.push(full || h > 0 ? `lẻ ${DIGITS[u]}` : DIGITS[u]);
  } else if (t === 1) {
    parts.push(u === 0 ? 'mười' : `mười ${u === 5 ? 'lăm' : DIGITS[u]}`);
  } else {
    const unit = u === 0 ? '' : ` ${u === 1 ? 'mốt' : u === 4 ? 'tư' : u === 5 ? 'lăm' : DIGITS[u]}`;
    parts.push(`${DIGITS[t]} mươi${unit}`);
  }
  return parts.join(' ');
}

export function readVietnameseMoney(amount: number): string {
  let rest = Math.round(Math.abs(amount || 0));
  if (rest === 0) return 'Không đồng.';
  const groups: number[] = [];
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    parts.push(`${readGroup(groups[i], i !== groups.length - 1)} ${SCALES[i] ?? ''}`.trim());
  }
  const sentence = `${amount < 0 ? 'âm ' : ''}${parts.join(' ')} đồng.`;
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
