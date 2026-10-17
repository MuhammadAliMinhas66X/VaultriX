const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const shell = (title, bodyHtml) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f7f8;font-family:Inter,Arial,sans-serif;color:#111114;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e5e7;border-radius:12px;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #e5e5e7;font-size:20px;letter-spacing:2px;font-weight:700;text-transform:uppercase;">Vaultrix</td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${escapeHtml(title)}</h1>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 24px;font-size:12px;color:#6b6b70;">This message was sent by Vaultrix. If you did not expect it, you can ignore it.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const otpEmail = ({ name, code, minutes }) => ({
  subject: `${code} is your Vaultrix verification code`,
  text: `Hi ${name || 'there'},\n\nYour Vaultrix password reset code is ${code}.\nIt expires in ${minutes} minutes.\n\nIf you did not ask to reset your password, you can ignore this email. Your password will not change.\n`,
  html: shell(
    'Reset your password',
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, use this code to reset your Vaultrix password.</p>
     <div style="margin:0 0 20px;padding:18px 0;text-align:center;background:#f7f7f8;border:1px solid #e5e5e7;border-radius:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;">${escapeHtml(code)}</div>
     <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3b3b40;">The code expires in ${minutes} minutes and can only be used once.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If you did not ask for this, ignore this email. Your password will not change.</p>`
  ),
});

export const signupOtpEmail = ({ name, code, minutes }) => ({
  subject: `${code} is your Vaultrix verification code`,
  text: `Hi ${name || 'there'},\n\nUse this code to finish creating your Vaultrix account: ${code}.\nIt expires in ${minutes} minutes.\n\nIf you did not try to create a Vaultrix account, you can ignore this email and no account will be created.\n`,
  html: shell(
    'Verify your email',
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, use this code to finish creating your Vaultrix account.</p>
     <div style="margin:0 0 20px;padding:18px 0;text-align:center;background:#f7f7f8;border:1px solid #e5e5e7;border-radius:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;">${escapeHtml(code)}</div>
     <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3b3b40;">The code expires in ${minutes} minutes and can only be used once.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If you did not try to create a Vaultrix account, you can ignore this email and no account will be created.</p>`
  ),
});

export const passwordChangedEmail = ({ name }) => ({
  subject: 'Your Vaultrix password was changed',
  text: `Hi ${name || 'there'},\n\nThe password for your Vaultrix account was just changed and all other sessions were signed out.\n\nIf this was not you, reset your password again right away.\n`,
  html: shell(
    'Your password was changed',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, the password for your Vaultrix account was just changed and other sessions were signed out.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If this was not you, reset your password again right away.</p>`
  ),
});

export const deviceLoginEmail = ({ name, code, minutes }) => ({
  subject: `${code} is your Vaultrix sign-in code`,
  text: `Hi ${name || 'there'},\n\nYou're already signed in to Vaultrix on 2 devices, so we need to confirm it's really you before adding a 3rd. Use this code to continue: ${code}.\nIt expires in ${minutes} minutes. Your oldest signed-in device will be signed out to make room.\n\nIf this was not you, change your password right away.\n`,
  html: shell(
    'Confirm this new device',
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, you're already signed in to Vaultrix on 2 devices. Use this code to confirm it's you signing in on a new one - your oldest signed-in device will be signed out to make room.</p>
     <div style="margin:0 0 20px;padding:18px 0;text-align:center;background:#f7f7f8;border:1px solid #e5e5e7;border-radius:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;">${escapeHtml(code)}</div>
     <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3b3b40;">The code expires in ${minutes} minutes and can only be used once.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If this was not you, change your password right away.</p>`
  ),
});

export const emailChangeOtpEmail = ({ name, code, minutes }) => ({
  subject: `${code} is your Vaultrix verification code`,
  text: `Hi ${name || 'there'},\n\nUse this code to confirm this is your new email address for Vaultrix: ${code}.\nIt expires in ${minutes} minutes.\n\nIf you did not ask to change your Vaultrix email, you can ignore this and nothing will change.\n`,
  html: shell(
    'Confirm your new email address',
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, use this code to confirm this is your new email address for Vaultrix.</p>
     <div style="margin:0 0 20px;padding:18px 0;text-align:center;background:#f7f7f8;border:1px solid #e5e5e7;border-radius:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;">${escapeHtml(code)}</div>
     <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3b3b40;">The code expires in ${minutes} minutes and can only be used once.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If you did not ask to change your Vaultrix email, you can ignore this and nothing will change.</p>`
  ),
});

export const accountDeletedEmail = ({ name }) => ({
  subject: 'Your Vaultrix account has been deleted',
  text: `Hi ${name || 'there'},\n\nYour Vaultrix account and all of its data have been permanently deleted, as requested.\n\nIf this was not you, contact support right away.\n`,
  html: shell(
    'Your account has been deleted',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, your Vaultrix account and all of its data have been permanently deleted, as requested.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If this was not you, contact support right away.</p>`
  ),
});

export const emailChangedEmail = ({ name, newEmail }) => ({
  subject: 'Your Vaultrix email address was changed',
  text: `Hi ${name || 'there'},\n\nThe email address on your Vaultrix account was just changed to ${newEmail}.\n\nIf this was not you, contact support right away.\n`,
  html: shell(
    'Your email address was changed',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, the email address on your Vaultrix account was just changed to <strong>${escapeHtml(newEmail)}</strong>.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If this was not you, contact support right away.</p>`
  ),
});
