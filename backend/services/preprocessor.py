"""
OEHA-3: Text preprocessor — clean and truncate email body before AI
"""

import re


class TextPreprocessor:
    """Strip signatures, repeated headers, and truncate long emails."""

    SIGNATURE_PATTERNS = [
        r"^--\s*$",
        r"^Sent from my .+$",
        r"^Get Outlook for .+$",
        r"^Đã gửi từ .+$",
    ]

    HEADER_PATTERNS = [
        r"^From:.*$",
        r"^Sent:.*$",
        r"^To:.*$",
        r"^Cc:.*$",
        r"^Subject:.*$",
        r"^Date:.*$",
    ]

    def clean(self, body: str, max_length: int = 8000) -> str:
        """Clean email body: strip signatures, headers, truncate."""
        if not body:
            return ""

        body = self._strip_signatures(body)
        body = self._remove_repeated_headers(body)

        if len(body) > max_length:
            body = self._smart_truncate(body, max_length)

        return body.strip()

    def _strip_signatures(self, body: str) -> str:
        """Remove common email signatures."""
        lines = body.split("\n")
        cleaned_lines = []
        skip_rest = False

        for line in lines:
            if skip_rest:
                continue
            for pattern in self.SIGNATURE_PATTERNS:
                if re.match(pattern, line.strip(), re.IGNORECASE):
                    skip_rest = True
                    break
            if not skip_rest:
                cleaned_lines.append(line)

        # Only use cleaned if we didn't remove too much
        result = "\n".join(cleaned_lines)
        if len(result) < len(body) * 0.3:
            return body  # Signature detection too aggressive, keep original
        return result

    def _remove_repeated_headers(self, body: str) -> str:
        """Remove repeated email forwarding headers (keep first occurrence)."""
        lines = body.split("\n")
        header_count = 0
        cleaned = []

        for line in lines:
            is_header = False
            for pattern in self.HEADER_PATTERNS:
                if re.match(pattern, line.strip(), re.IGNORECASE):
                    is_header = True
                    break

            if is_header:
                header_count += 1
                # Keep first set of headers, skip subsequent
                if header_count <= 5:
                    cleaned.append(line)
            else:
                cleaned.append(line)

        return "\n".join(cleaned)

    def _smart_truncate(self, body: str, max_length: int) -> str:
        """Keep newest (60%) + oldest (40%) content."""
        newest_len = int(max_length * 0.6)
        oldest_len = int(max_length * 0.4)

        newest = body[:newest_len]
        oldest = body[-oldest_len:]

        return f"{newest}\n\n[...nội dung đã được rút gọn...]\n\n{oldest}"
