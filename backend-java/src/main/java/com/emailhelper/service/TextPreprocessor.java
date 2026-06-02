package com.emailhelper.service;

import java.util.List;
import java.util.regex.Pattern;

public class TextPreprocessor {

    private static final List<Pattern> SIGNATURE_PATTERNS = List.of(
            Pattern.compile("^--\\s*$"),
            Pattern.compile("^Sent from my .+$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^Get Outlook for .+$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^Đã gửi từ .+$", Pattern.CASE_INSENSITIVE)
    );

    private static final List<Pattern> HEADER_PATTERNS = List.of(
            Pattern.compile("^From:.*$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^Sent:.*$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^To:.*$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^Cc:.*$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^Subject:.*$", Pattern.CASE_INSENSITIVE),
            Pattern.compile("^Date:.*$", Pattern.CASE_INSENSITIVE)
    );

    public String clean(String body, int maxLength) {
        if (body == null || body.isBlank()) return "";

        String cleaned = stripSignatures(body);
        cleaned = removeRepeatedHeaders(cleaned);

        if (cleaned.length() > maxLength) {
            cleaned = smartTruncate(cleaned, maxLength);
        }

        return cleaned.strip();
    }

    private String stripSignatures(String body) {
        String[] lines = body.split("\n");
        StringBuilder result = new StringBuilder();
        boolean skipRest = false;

        for (String line : lines) {
            if (skipRest) continue;
            String trimmed = line.strip();
            for (Pattern p : SIGNATURE_PATTERNS) {
                if (p.matcher(trimmed).matches()) {
                    skipRest = true;
                    break;
                }
            }
            if (!skipRest) result.append(line).append("\n");
        }

        String cleaned = result.toString();
        if (cleaned.length() < body.length() * 0.3) return body;
        return cleaned;
    }

    private String removeRepeatedHeaders(String body) {
        String[] lines = body.split("\n");
        StringBuilder result = new StringBuilder();
        int headerCount = 0;

        for (String line : lines) {
            String trimmed = line.strip();
            boolean isHeader = HEADER_PATTERNS.stream().anyMatch(p -> p.matcher(trimmed).matches());

            if (isHeader) {
                headerCount++;
                if (headerCount <= 5) result.append(line).append("\n");
            } else {
                result.append(line).append("\n");
            }
        }

        return result.toString();
    }

    private String smartTruncate(String body, int maxLength) {
        int newestLen = (int) (maxLength * 0.6);
        int oldestLen = (int) (maxLength * 0.4);
        String newest = body.substring(0, newestLen);
        String oldest = body.substring(body.length() - oldestLen);
        return newest + "\n\n[...nội dung đã được rút gọn...]\n\n" + oldest;
    }
}
