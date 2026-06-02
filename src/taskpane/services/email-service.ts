/**
 * OEHA-2: Email reading service — Office.js wrapper
 */

import { EmailData, EmailAddressInfo } from "../types";

const MAX_BODY_LENGTH = 32000;
const BODY_TIMEOUT_MS = 5000;

export class EmailService {
  /**
   * Read current email metadata + body from Outlook via Office.js
   */
  async readEmail(): Promise<EmailData> {
    const item = Office.context.mailbox.item;

    if (!item) {
      throw new Error("NO_EMAIL_SELECTED");
    }

    // Check if in compose mode (no from = compose)
    if (!item.from) {
      throw new Error("COMPOSE_MODE");
    }

    const metadata = this.readMetadata(item);
    const body = await this.readBody(item);

    return { ...metadata, ...body } as EmailData;
  }

  private readMetadata(item: Office.MessageRead): Partial<EmailData> {
    const from: EmailAddressInfo = {
      name: item.from?.displayName || "",
      email: item.from?.emailAddress || "",
    };

    const to: EmailAddressInfo[] = (item.to || []).map((r) => ({
      name: r.displayName || "",
      email: r.emailAddress || "",
    }));

    return {
      subject: item.subject || "(Không có tiêu đề)",
      from,
      to,
      dateTimeCreated: item.dateTimeCreated,
    };
  }

  private readBody(item: Office.MessageRead): Promise<Partial<EmailData>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("BODY_TIMEOUT"));
      }, BODY_TIMEOUT_MS);

      item.body.getAsync(Office.CoercionType.Text, (result) => {
        clearTimeout(timeout);

        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          reject(new Error("BODY_EXTRACTION_FAILED"));
          return;
        }

        let bodyText = result.value || "";
        const originalLength = bodyText.length;
        let isTruncated = false;

        if (bodyText.length > MAX_BODY_LENGTH) {
          bodyText = bodyText.substring(0, MAX_BODY_LENGTH);
          isTruncated = true;
        }

        resolve({
          bodyText,
          bodyLength: bodyText.length,
          isTruncated,
          originalLength: isTruncated ? originalLength : undefined,
        });
      });
    });
  }
}
