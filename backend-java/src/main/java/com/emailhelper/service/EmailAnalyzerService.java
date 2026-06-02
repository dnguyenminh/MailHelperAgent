package com.emailhelper.service;

import com.emailhelper.dto.AnalyzeResponse;
import com.emailhelper.dto.ReplyOption;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.kherud.llama.LlamaModel;
import de.kherud.llama.ModelParameters;
import de.kherud.llama.InferenceParameters;
import de.kherud.llama.LlamaOutput;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@Service
public class EmailAnalyzerService {

    private final TextPreprocessor preprocessor;
    private final ObjectMapper objectMapper;
    private LlamaModel model;

    @Value("${model.path:models/qwen2.5-3b-instruct-q4_k_m.gguf}")
    private String modelPath;

    public EmailAnalyzerService() {
        this.preprocessor = new TextPreprocessor();
        this.objectMapper = new ObjectMapper();
    }

    @PostConstruct
    public void init() {
        Path resolved = Path.of(modelPath).isAbsolute()
                ? Path.of(modelPath)
                : Path.of(System.getProperty("user.dir")).resolve(modelPath);

        System.out.println("Loading model from: " + resolved);

        ModelParameters params = new ModelParameters()
                .setModelFilePath(resolved.toString())
                .setNCtx(4096)
                .setNGpuLayers(0);  // CPU only

        model = new LlamaModel(params);
        System.out.println("Model loaded successfully.");
    }

    @PreDestroy
    public void destroy() {
        if (model != null) model.close();
    }

    public String getModelName() {
        return "qwen2.5-3b-instruct (embedded GGUF)";
    }

    public AnalyzeResponse analyze(String subject, String body) {
        String cleanedBody = preprocessor.clean(body, 4000);
        String prompt = buildPrompt(subject != null ? subject : "", cleanedBody);

        InferenceParameters inferParams = new InferenceParameters(prompt)
                .setTemperature(0.3f)
                .setNPredict(1500);

        StringBuilder sb = new StringBuilder();
        for (LlamaOutput output : model.generate(inferParams)) {
            sb.append(output);
        }

        return parseResponse(sb.toString());
    }

    private String buildPrompt(String subject, String body) {
        return """
                Phân tích chuỗi email và trả về JSON:
                
                1. TÓM TẮT: 3-5 bullet points bằng Tiếng Việt, giữ tên riêng/số liệu.
                2. GỢI Ý TRẢ LỜI: 2-3 phương án reply (label + content + tone).
                
                Tiêu đề: %s
                Nội dung:
                %s
                
                JSON format:
                {"summary": ["..."], "suggestedReplies": [{"label": "...", "content": "...", "tone": "positive|negative|neutral"}]}
                """.formatted(subject, body);
    }

    @SuppressWarnings("unchecked")
    private AnalyzeResponse parseResponse(String raw) {
        try {
            int start = raw.indexOf("{");
            int end = raw.lastIndexOf("}") + 1;
            if (start < 0 || end <= start) {
                return fallbackResponse();
            }

            String json = raw.substring(start, end);
            Map<String, Object> data = objectMapper.readValue(json, new TypeReference<>() {});

            List<String> summary = (List<String>) data.getOrDefault("summary", List.of("Không có tóm tắt"));

            List<Map<String, String>> repliesRaw =
                    (List<Map<String, String>>) data.getOrDefault("suggestedReplies", List.of());

            List<ReplyOption> replies = repliesRaw.stream()
                    .map(r -> new ReplyOption(
                            r.getOrDefault("label", ""),
                            r.getOrDefault("content", ""),
                            r.getOrDefault("tone", "neutral")
                    ))
                    .toList();

            return new AnalyzeResponse(summary, replies, null, getModelName());
        } catch (Exception e) {
            return fallbackResponse();
        }
    }

    private AnalyzeResponse fallbackResponse() {
        return new AnalyzeResponse(
                List.of("Không thể phân tích email"),
                List.of(),
                null,
                getModelName()
        );
    }
}
