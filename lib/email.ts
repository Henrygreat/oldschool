import { Resend } from 'resend'
import { SITE_URL } from '@/lib/seo'
import { RESET_TOKEN_TTL_MINUTES } from '@/lib/password'

export function passwordResetUrl(token: string) {
  return `${SITE_URL}/reset-password?token=${encodeURIComponent(token)}`
}

function resetEmailHtml(url: string) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr><td style="background:#9C0621;padding:24px;color:#ffffff;">
            <div style="font-size:22px;font-weight:bold;letter-spacing:1px;">GCUOBA Network</div>
            <div style="font-size:12px;opacity:.8;margin-top:4px;">Government College Umuahia Old Boys Association</div>
          </td></tr>
          <tr><td style="padding:28px 24px;">
            <h1 style="margin:0 0 12px;font-size:20px;">Reset your password</h1>
            <p style="margin:0 0 20px;line-height:1.6;color:#334155;">We received a request to reset the password for your GCUOBA Network account. Click the button below to choose a new one.</p>
            <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#9C0621;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:10px;">Reset Password</a></p>
            <p style="margin:0 0 16px;line-height:1.6;color:#334155;">This link expires in ${RESET_TOKEN_TTL_MINUTES} minutes and can be used only once.</p>
            <p style="margin:0 0 16px;line-height:1.6;color:#64748b;font-size:13px;">If the button does not work, copy and paste this link into your browser:<br><a href="${url}" style="color:#9C0621;word-break:break-all;">${url}</a></p>
            <p style="margin:0;line-height:1.6;color:#64748b;font-size:13px;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}

function resetEmailText(url: string) {
  return [
    'GCUOBA Network - Reset your password',
    '',
    'We received a request to reset the password for your GCUOBA Network account.',
    `Open this link to choose a new password (expires in ${RESET_TOKEN_TTL_MINUTES} minutes, single use):`,
    url,
    '',
    'If you did not request this, you can safely ignore this email. Your password will not change.',
  ].join('\n')
}

/** Returns true when Resend accepted the message. Never throws and never logs the link or recipient. */
export async function sendPasswordResetEmail(to: string, token: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    console.error('Password reset email not sent: RESEND_API_KEY or EMAIL_FROM is not configured.')
    return false
  }
  try {
    const url = passwordResetUrl(token)
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      subject: 'Reset your GCUOBA Network password',
      html: resetEmailHtml(url),
      text: resetEmailText(url),
    })
    if (error) {
      console.error('Password reset email rejected by Resend', { name: error.name, statusCode: 'statusCode' in error ? error.statusCode : undefined })
      return false
    }
    return true
  } catch (error) {
    console.error('Password reset email failed', { name: error instanceof Error ? error.name : typeof error })
    return false
  }
}