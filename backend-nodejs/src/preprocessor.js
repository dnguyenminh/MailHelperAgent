/**
 * Email body preprocessor — strip signatures, truncate
 */

const SIGNATURE_PATTERNS = [
  /^--\s*$/,
  /^Sent from my .+$/i,
  /^Get Outlook for .+$/i,
  /^Đã gửi từ .+$/i,
];

export function preprocessBody(body, maxLength = 4000) {
  if (!body) return "";

  let cleaned = stripSignatures(body);
  cleaned = removeRepeatedHeaders(cleaned);

  if (cleaned.length > maxLength) {
    cleaned = smartTruncate(cleaned, maxLength);
  }

  return cleaned.trim();
}

function stripSignatures(body) {
  const lines = body.split("\n");
  const result = [];
  let skipRest = false;

  for (const line of lines) {
    if (skipRest) continue;
    for (const pattern of SIGNATURE_PATTERNS) {
      if (pattern.test(line.trim())) {
        skipRest = true;
        break;
      }
    }
    if (!skipRest) result.push(line);
  }

  const cleaned = result.join("\n");
  if (cleaned.length < body.length * 0.3) return body;
  return cleaned;
}

function removeRepeatedHeaders(body) {
  const headerPatterns = [/^From:/i, /^Sent:/i, /^To:/i, /^Cc:/i, /^Subject:/i, /^Date:/i];
  const lines = body.split("\n");
  let headerCount = 0;
  const cleaned = [];

  for (const line of lines) {
    const isHeader = headerPatterns.some((p) => p.test(line.trim()));
    if (isHeader) {
      headerCount++;
      if (headerCount <= 5) cleaned.push(line);
    } else {
      cleaned.push(line);
    }
  }

  return cleaned.join("\n");
}

function smartTruncate(body, maxLength) {
  const newestLen = Math.floor(maxLength * 0.6);
  const oldestLen = Math.floor(maxLength * 0.4);
  const newest = body.substring(0, newestLen);
  const oldest = body.substring(body.length - oldestLen);
  return `${newest}\n\n[...nội dung đã được rút gọn...]\n\n${oldest}`;
}
