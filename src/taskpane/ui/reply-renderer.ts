/**
 * ReplyRenderer — Render reply option buttons, preview, and actions
 * OEHA-4: Suggest Reply Options
 */

import { ReplyOption } from "../types";
import { replyState } from "../state/reply-state";
import { InsertService } from "../services/insert-service";

export class ReplyRenderer {
  private container: HTMLElement;
  private insertService: InsertService;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) {
      throw new Error("Container element #" + containerId + " not found");
    }
    this.container = el;
    this.insertService = new InsertService();
  }

  renderOptions(options: ReplyOption[]): void {
    replyState.setOptions(options);
    this.container.innerHTML = "";
    this.container.style.display = "block";

    const div = document.createElement("div");
    div.className = "reply-section";

    // Header
    const header = document.createElement("h3");
    header.className = "reply-header ms-font-m";
    header.textContent = "Gợi ý trả lời";

    // Option buttons
    const btnGroup = document.createElement("div");
    btnGroup.className = "reply-btn-group";

    const self = this;
    options.forEach(function (opt, index) {
      const btn = document.createElement("button");
      btn.className = "reply-option-btn";
      btn.textContent = opt.label + " (" + opt.tone + ")";
      btn.setAttribute("data-index", String(index));
      btn.onclick = function () {
        self.onSelectOption(index);
      };
      btnGroup.appendChild(btn);
    });

    // Preview area (hidden until option selected)
    const previewWrapper = document.createElement("div");
    previewWrapper.id = "reply-preview-wrapper";
    previewWrapper.className = "reply-preview-wrapper";
    previewWrapper.style.display = "none";

    const previewLabel = document.createElement("label");
    previewLabel.className = "reply-preview-label ms-font-s";
    previewLabel.textContent = "Nội dung (có thể chỉnh sửa):";

    const preview = document.createElement("textarea");
    preview.id = "reply-preview";
    preview.className = "reply-preview";
    preview.rows = 6;
    preview.oninput = function () {
      replyState.updatePreview(preview.value);
    };

    // Action buttons
    const actions = document.createElement("div");
    actions.className = "reply-actions";

    const insertBtn = document.createElement("button");
    insertBtn.className = "ms-Button ms-Button--primary reply-insert-btn";
    const insertLabel = document.createElement("span");
    insertLabel.className = "ms-Button-label";
    insertLabel.textContent = "Chèn vào Reply All";
    insertBtn.appendChild(insertLabel);
    insertBtn.onclick = function () {
      self.onInsert();
    };

    const regenBtn = document.createElement("button");
    regenBtn.className = "ms-Button reply-regen-btn";
    regenBtn.id = "reply-regen-btn";
    const regenLabel = document.createElement("span");
    regenLabel.className = "ms-Button-label";
    regenLabel.textContent = "Tạo lại (" + replyState.getRegenerateCount() + "/" + replyState.getMaxRegenerate() + ")";
    regenBtn.appendChild(regenLabel);
    regenBtn.onclick = function () {
      self.onRegenerate();
    };

    actions.appendChild(insertBtn);
    actions.appendChild(regenBtn);

    previewWrapper.appendChild(previewLabel);
    previewWrapper.appendChild(preview);
    previewWrapper.appendChild(actions);

    div.appendChild(header);
    div.appendChild(btnGroup);
    div.appendChild(previewWrapper);
    this.container.appendChild(div);
  }

  private onSelectOption(index: number): void {
    replyState.selectOption(index);

    // Update button active state
    const buttons = this.container.querySelectorAll(".reply-option-btn");
    buttons.forEach(function (btn, i) {
      if (i === index) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Show preview
    const wrapper = document.getElementById("reply-preview-wrapper");
    const preview = document.getElementById("reply-preview") as HTMLTextAreaElement;
    if (wrapper && preview) {
      wrapper.style.display = "block";
      preview.value = replyState.getSelectedContent();
    }
  }

  private onInsert(): void {
    const content = replyState.getSelectedContent();
    if (!content) {
      return;
    }
    this.insertService.insertReply(content);
  }

  private onRegenerate(): void {
    if (!replyState.canRegenerate()) {
      return;
    }
    replyState.incrementRegenerate();

    // Update button label
    const regenBtn = document.getElementById("reply-regen-btn");
    if (regenBtn) {
      const label = regenBtn.querySelector(".ms-Button-label");
      if (label) {
        label.textContent = "Tạo lại (" + replyState.getRegenerateCount() + "/" + replyState.getMaxRegenerate() + ")";
      }
      if (!replyState.canRegenerate()) {
        regenBtn.setAttribute("disabled", "true");
        regenBtn.classList.add("is-disabled");
      }
    }

    // Dispatch event for main controller to handle
    document.dispatchEvent(new CustomEvent("regenerate-reply"));
  }

  hide(): void {
    this.container.style.display = "none";
    this.container.innerHTML = "";
  }
}
