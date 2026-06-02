package com.emailhelper.dto;

import java.util.List;

public record AnalyzeResponse(
        List<String> summary,
        List<ReplyOption> suggestedReplies,
        Integer processingTime,
        String model
) {}
