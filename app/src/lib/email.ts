import { Resend } from "resend";

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Get base URL for links
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
};

// Email configuration
const FROM_EMAIL = "noreply@franklinhouse.com";
const FROM_NAME = "Franklin House Project Manager";
const ALWAYS_CC = "peteracworth@kink.com";

interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send email notification when a user is added to a project's team roster
 */
export async function sendTeamAddedEmail({
  recipientEmail,
  recipientName,
  projectTitle,
  projectId,
  addedByName,
}: {
  recipientEmail: string;
  recipientName: string;
  projectTitle: string;
  projectId: string;
  addedByName?: string;
}): Promise<EmailResult> {
  const baseUrl = getBaseUrl();
  const projectUrl = `${baseUrl}/projects?project=${projectId}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been added to a project</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">🎉 You've been added to a project!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${recipientName},</p>
    
    <p style="font-size: 16px;">
      ${addedByName ? `<strong>${addedByName}</strong> has added you to the team roster for:` : "You've been added to the team roster for:"}
    </p>
    
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 20px;">📋 ${projectTitle}</h2>
    </div>
    
    <a href="${projectUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">
      View Project →
    </a>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      You can now view and collaborate on this project.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>This is an automated notification from Project Manager.</p>
  </div>
</body>
</html>
`;

  const textContent = `
Hi ${recipientName},

${addedByName ? `${addedByName} has added you` : "You've been added"} to the team roster for: ${projectTitle}

View the project here: ${projectUrl}

You can now view and collaborate on this project.

---
This is an automated notification from Project Manager.
`;

  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      cc: ALWAYS_CC,
      subject: `You've been added to: ${projectTitle}`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error("[Email] Failed to send team added email:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Team added notification sent to ${recipientEmail} (cc: ${ALWAYS_CC})`);
    return { success: true };
  } catch (err: any) {
    console.error("[Email] Error sending team added email:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send email notification when a new comment is posted on a project
 */
export async function sendNewCommentEmail({
  recipientEmail,
  recipientName,
  projectTitle,
  projectId,
  commenterName,
  commentContent,
}: {
  recipientEmail: string;
  recipientName: string;
  projectTitle: string;
  projectId: string;
  commenterName: string;
  commentContent: string;
}): Promise<EmailResult> {
  const baseUrl = getBaseUrl();
  const projectUrl = `${baseUrl}/projects?project=${projectId}`;

  // Truncate long comments for the preview
  const truncatedComment = commentContent.length > 500 
    ? commentContent.substring(0, 500) + "..."
    : commentContent;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New comment on project</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">💬 New comment on your project</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-top: 0;">Hi ${recipientName},</p>
    
    <p style="font-size: 16px;">
      <strong>${commenterName}</strong> commented on:
    </p>
    
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">📋 ${projectTitle}</h2>
      
      <div style="background: #f3f4f6; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-style: italic; color: #374151; white-space: pre-wrap;">"${truncatedComment}"</p>
      </div>
      
      <p style="margin: 15px 0 0 0; font-size: 13px; color: #6b7280;">
        — ${commenterName}
      </p>
    </div>
    
    <a href="${projectUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px;">
      View & Reply →
    </a>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>This is an automated notification from Project Manager.</p>
    <p>You're receiving this because you're on the team roster for this project.</p>
  </div>
</body>
</html>
`;

  const textContent = `
Hi ${recipientName},

${commenterName} commented on: ${projectTitle}

"${truncatedComment}"

— ${commenterName}

View and reply here: ${projectUrl}

---
This is an automated notification from Project Manager.
You're receiving this because you're on the team roster for this project.
`;

  try {
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipientEmail,
      cc: ALWAYS_CC,
      subject: `💬 ${commenterName} commented on: ${projectTitle}`,
      html: htmlContent,
      text: textContent,
    });

    if (error) {
      console.error("[Email] Failed to send comment notification:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Comment notification sent to ${recipientEmail} (cc: ${ALWAYS_CC})`);
    return { success: true };
  } catch (err: any) {
    console.error("[Email] Error sending comment notification:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Send emails to multiple recipients (batch)
 * Useful for notifying all team members of a comment
 */
export async function sendBatchCommentEmails({
  recipients,
  projectTitle,
  projectId,
  commenterName,
  commentContent,
  excludeEmail,
}: {
  recipients: Array<{ email: string; name: string }>;
  projectTitle: string;
  projectId: string;
  commenterName: string;
  commentContent: string;
  excludeEmail?: string; // Don't send to the commenter
}): Promise<{ sent: number; failed: number }> {
  const filteredRecipients = recipients.filter(r => r.email !== excludeEmail);
  
  let sent = 0;
  let failed = 0;

  // Send emails in parallel (Resend handles rate limiting)
  const results = await Promise.all(
    filteredRecipients.map(recipient =>
      sendNewCommentEmail({
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        projectTitle,
        projectId,
        commenterName,
        commentContent,
      })
    )
  );

  results.forEach(result => {
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  });

  console.log(`[Email] Batch comment notifications: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

