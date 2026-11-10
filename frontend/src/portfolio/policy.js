export const policy = {
  updated: 'November 8, 2026',
  intro:
    'This policy explains, in plain language, what Vaultrix collects, why it is needed, who can see it and what you can do about it. Vaultrix is owned by Muhammad Ali Minhas.',
  sections: [
    {
      id: 'collect',
      title: 'What we collect',
      bullets: [
        'Account details: your name, email address, country, language and currency, and a profile photo if you add one.',
        'What you enter: income streams, expenses, categories, loans and payments, notes, dates, and which bank, wallet or cash you picked. You type these in yourself.',
        'Photos you upload: a profile photo, and optional proof photos on loans and payments.',
        'Sign-in and security data: your active sessions, basic device and browser details used to show those sessions to you, two-step verification settings, and the records needed to limit abuse.',
        'If you choose to sign in with Google: the name, email address and profile picture Google shares with us at your request.',
      ],
      note: 'Vaultrix does not connect to your bank accounts. It cannot see your bank balances or transactions. Everything in the app is what you chose to record.',
    },
    {
      id: 'use',
      title: 'How we use it',
      bullets: [
        'To run the app: to show your income, expenses and loans, calculate totals and convert currencies.',
        'To keep your account secure: to verify it is you, manage sessions and slow down guessing and abuse.',
        'To send emails you need, such as verification codes and security notices.',
        'To find and fix problems and to improve the product.',
      ],
      note: 'We do not use your financial entries for advertising.',
    },
    {
      id: 'organizations',
      title: 'Organizations and sharing',
      paragraphs: [
        'Your data belongs to your organization. Every request is checked on the server against the organization you belong to, and no data is shared between organizations. Inside your own organization, people see only what their role allows: owner, admin, member or viewer.',
        'We do not sell your personal data. We share data only with the service providers listed below, who we need to run Vaultrix, or when the law requires it.',
      ],
    },
    {
      id: 'providers',
      title: 'Service providers',
      bullets: [
        'Hosting and database providers, to run the servers and store your data.',
        'An image hosting service (Cloudinary), to store profile and proof photos.',
        'An email delivery provider, to send verification codes and notices.',
        'An exchange-rate data provider, to show current rates. It receives currency codes only, never personal information.',
        'Google, if you sign in with Google, and for the fonts loaded by this website and the app.',
      ],
      note: 'These providers handle data only to deliver their service to us.',
    },
    {
      id: 'photos',
      title: 'Photos',
      paragraphs: [
        'Proof photos on loans and payments are private. They open only through signed links and are removed when you remove them, or when the payment, loan or organization they belong to is deleted. Profile photos are stored so they can be shown in the app.',
      ],
    },
    {
      id: 'cookies',
      title: 'Cookies and storage',
      paragraphs: [
        'We use a secure cookie to keep you signed in, and your browser storage to remember simple preferences such as your language, your animation setting and whether your balance is hidden. We do not use advertising cookies.',
        'This website and the app load fonts from Google Fonts, which means your browser contacts Google when a page opens.',
      ],
    },
    {
      id: 'security',
      title: 'Security',
      paragraphs: [
        'Data travels between your device and Vaultrix over HTTPS. Access is limited by role, sign-in is rate limited, and you can turn on two-step verification and end sessions at any time. No system is perfectly secure, so please keep your password private and sign out of shared devices.',
      ],
    },
    {
      id: 'retention',
      title: 'How long we keep data',
      paragraphs: [
        'We keep your data while your account is active. You can delete any entry yourself at any time. When the last member leaves an organization, the data of that organization is deleted with it.',
      ],
    },
    {
      id: 'choices',
      title: 'Your choices',
      bullets: [
        'Edit or delete your entries, categories, loans and payments in the app.',
        'Change your name, language, currency and photo in Settings.',
        'Turn on two-step verification and end sessions you do not recognize.',
        'Delete your account. If you are the last member of your organization, its data goes with it.',
        'Ask us to explain or correct anything we hold about you.',
      ],
    },
    {
      id: 'children',
      title: 'Children',
      paragraphs: ['Vaultrix is not directed at children under 13, and we do not knowingly collect their information.'],
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      paragraphs: ['If we change this policy we will update the date at the top. If the change is important, we will also tell you in the app or by email.'],
    },
  ],
};
