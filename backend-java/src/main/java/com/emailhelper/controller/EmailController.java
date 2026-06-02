package com.emailhelper.controller;

import com.emailhelper.dto.EmailRequest;
import com.emailhelper.dto.AnalyzeResponse;
import com.emailhelper.service.EmailAnalyzerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class EmailController {

    private final EmailAnalyzerService analyzerService;

    public EmailController(EmailAnalyzerService analyzerService) {
        this.analyzerService = analyzerService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok", "model", analyzerService.getModelName()));
    }

    @PostMapping("/analyze-email")
    public ResponseEntity<AnalyzeResponse> analyzeEmail(@RequestBody EmailRequest request) {
        if (request.body() == null || request.body().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        long startTime = System.currentTimeMillis();
        AnalyzeResponse response = analyzerService.analyze(request.subject(), request.body());
        long processingTime = System.currentTimeMillis() - startTime;

        return ResponseEntity.ok(new AnalyzeResponse(
                response.summary(),
                response.suggestedReplies(),
                (int) processingTime,
                analyzerService.getModelName()
        ));
    }
}
