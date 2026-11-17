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

export const newDeviceSignedInEmail = ({ name, device, time }) => ({
  subject: 'New sign-in to your Vaultrix account',
  text: `Hi ${name || 'there'},\n\nYour Vaultrix account was just signed in from ${device} (${time}).\n\nIf this was you, no action is needed. If not, change your password right away and sign out other devices in Settings.\n`,
  html: shell(
    'New sign-in',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, your Vaultrix account was just signed in from <strong>${escapeHtml(device)}</strong> (${escapeHtml(time)}).</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If this was you, no action is needed. If not, change your password right away and sign out other devices in Settings.</p>`
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

export const emailChangeOldVerifyEmail = ({ name, code, minutes }) => ({
  subject: `${code} is your Vaultrix verification code`,
  text: `Hi ${name || 'there'},\n\nSomeone (hopefully you) asked to change the email address on your Vaultrix account. Use this code to confirm it's really you: ${code}.\nIt expires in ${minutes} minutes.\n\nIf you did not ask to change your Vaultrix email, do not share this code with anyone and change your password right away.\n`,
  html: shell(
    'Confirm it’s really you',
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, someone (hopefully you) asked to change the email address on your Vaultrix account. Use this code to confirm it's really you.</p>
     <div style="margin:0 0 20px;padding:18px 0;text-align:center;background:#f7f7f8;border:1px solid #e5e5e7;border-radius:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;">${escapeHtml(code)}</div>
     <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3b3b40;">The code expires in ${minutes} minutes and can only be used once.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#b42318;font-weight:600;">If you did not ask for this, do not share this code with anyone and change your password right away.</p>`
  ),
});

export const accountDeletionOtpEmail = ({ name, code, minutes }) => ({
  subject: `${code} is your Vaultrix account deletion code`,
  text: `Hi ${name || 'there'},\n\nUse this code to permanently delete your Vaultrix account: ${code}.\nIt expires in ${minutes} minutes. This cannot be undone.\n\nIf you did not ask to delete your account, you can ignore this and nothing will change.\n`,
  html: shell(
    'Confirm account deletion',
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, use this code to permanently delete your Vaultrix account. This cannot be undone.</p>
     <div style="margin:0 0 20px;padding:18px 0;text-align:center;background:#f7f7f8;border:1px solid #e5e5e7;border-radius:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:10px;">${escapeHtml(code)}</div>
     <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3b3b40;">The code expires in ${minutes} minutes and can only be used once.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If you did not ask to delete your account, you can ignore this and nothing will change.</p>`
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

export const googleUnlinkedEmail = ({ name }) => ({
  subject: 'Google sign-in was unlinked from your Vaultrix account',
  text: `Hi ${name || 'there'},\n\nGoogle sign-in was just unlinked from your Vaultrix account. You can still sign in with your password. Relinking a Google account will be available again in 20 days.\n\nIf this was not you, contact support right away.\n`,
  html: shell(
    'Google sign-in unlinked',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, Google sign-in was just unlinked from your Vaultrix account. You can still sign in with your password. Relinking a Google account will be available again in 20 days.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If this was not you, contact support right away.</p>`
  ),
});

export const accountDeactivatedEmail = ({ name }) => ({
  subject: 'Your Vaultrix account has been deactivated',
  text: `Hi ${name || 'there'},\n\nYour Vaultrix account has been deactivated by an administrator and you will not be able to sign in. All of your devices have been signed out.\n\nIf you think this is a mistake, contact support.\n`,
  html: shell(
    'Your account has been deactivated',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, your Vaultrix account has been deactivated by an administrator and you will not be able to sign in. All of your devices have been signed out.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If you think this is a mistake, contact support.</p>`
  ),
});

export const accountReactivatedEmail = ({ name }) => ({
  subject: 'Your Vaultrix account has been reactivated',
  text: `Hi ${name || 'there'},\n\nYour Vaultrix account has been reactivated. You can sign in again as usual.\n`,
  html: shell(
    'Your account has been reactivated',
    `<p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, your Vaultrix account has been reactivated. You can sign in again as usual.</p>`
  ),
});

export const mfaDisabledByAdminEmail = ({ name }) => ({
  subject: '2-step verification was turned off on your Vaultrix account',
  text: `Hi ${name || 'there'},\n\n2-step verification was just turned off on your Vaultrix account by an administrator, usually to help you back in after losing access to your authenticator app. You can turn it back on any time from Settings.\n\nIf you did not request this, contact support right away.\n`,
  html: shell(
    '2-step verification was turned off',
    `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#3b3b40;">Hi ${escapeHtml(name || 'there')}, 2-step verification was just turned off on your Vaultrix account by an administrator, usually to help you back in after losing access to your authenticator app. You can turn it back on any time from Settings.</p>
     <p style="margin:0;font-size:14px;line-height:1.6;color:#3b3b40;">If you did not request this, contact support right away.</p>`
  ),
});

export const inviteEmail = ({ inviterName, workspace, role, code, days }) => ({
  subject: `${inviterName} invited you to Vaultrix`,
  text: `${inviterName} invited you to share the workspace "${workspace}" on Vaultrix as ${role}.\n\nYour invite code: ${code}\nIt works for ${days} days and only with this email address.\n\nSign in (or create an account with this email), open Settings, then People, and choose "Join with a code".\n\nNote: joining only works on an account that has no data of its own yet.\n`,
  html: shell(
    'You are invited',
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3b3b40;">${escapeHtml(inviterName)} invited you to share the workspace <strong>${escapeHtml(workspace)}</strong> on Vaultrix as <strong>${escapeHtml(role)}</strong>.</p>
     <div style="margin:0 0 20px;padding:18px 0;text-align:center;background:#f7f7f8;border:1px solid #e5e5e7;border-radius:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:26px;font-weight:700;letter-spacing:6px;">${escapeHtml(code)}</div>
     <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3b3b40;">Sign in, or create an account with this email address. Then open <strong>Settings</strong>, then <strong>People</strong>, and choose <strong>Join with a code</strong>.</p>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6b70;">The code works for ${days} days, only with this email address, and only on an account that has no data of its own yet.</p>`
  ),
});

const clientBase = () => String(process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/+$/, '');

export const groupInviteEmail = ({ inviterName, group, code, days, hasAccount = true }) => {
  const link = `${clientBase()}/join-group`;
  const signupLink = `${clientBase()}/signup?next=${encodeURIComponent('/join-group')}`;
  const step = hasAccount ? 'Sign in and the invitation is waiting for you.' : 'You do not have an account yet: create one with this email address and the invitation will be waiting for you.';
  return {
    subject: `${inviterName} added you to the group "${group}" on Vaultrix`,
    text: `${inviterName} invited you to the group "${group}" on Vaultrix, to split shared costs like rent and food.\n\nJoin the group: ${link}\n${step}${hasAccount ? '' : `\nCreate your account: ${signupLink}`}\n\nOr use this code under Groups > Join with a code: ${code}\nIt works for ${days} days and only with this email address. Your own money stays private: only what you add to the group is shared.\n`,
    html: shell(
      'Join a group',
      `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3b3b40;">${escapeHtml(inviterName)} invited you to the group <strong>${escapeHtml(group)}</strong> to split shared costs like rent and food.</p>
     <p style="margin:0 0 20px;"><a href="${link}" style="display:inline-block;padding:12px 22px;background:#111114;color:#ffffff;border-radius:10px;font-size:14px;font-weight:600;text-decoration:none;">Join group</a></p>
     <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3b3b40;">${escapeHtml(step)}${hasAccount ? '' : ` <a href="${signupLink}" style="color:#111114;font-weight:600;">Create your account</a>.`}</p>
     <p style="margin:16px 0 8px;font-size:13px;line-height:1.6;color:#6b6b70;">Or enter this code under Groups &gt; Join with a code:</p>
     <div style="margin:0 0 16px;padding:14px 0;text-align:center;background:#f7f7f8;border:1px solid #e5e5e7;border-radius:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:5px;">${escapeHtml(code)}</div>
     <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6b70;">Your own income, expenses and loans stay private. Only what you add to the group is shared. The invitation works for ${days} days and only with this email address.</p>`
    ),
  };
};
