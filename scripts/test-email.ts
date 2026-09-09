import { generatePasswordResetEmailHtml, sendPasswordResetEmail } from '../lib/email';

async function main() {
  console.log('Testing generatePasswordResetEmailHtml...');
  const html = generatePasswordResetEmailHtml({
    recipientName: 'Carlos Yulo',
    tempPassword: 'CJPass!2026',
    resetUrl: 'https://c-j-pickleball.vercel.app/auth/callback?next=/dashboard/settings',
  });

  if (!html.includes('CJPass!2026') || !html.includes('C&J PICKLEBALL ARENA')) {
    throw new Error('HTML generation failed assertions!');
  }
  console.log('✓ HTML generated successfully with branded template and temp password.');

  console.log('Testing sendPasswordResetEmail (Sandbox mode)...');
  const result = await sendPasswordResetEmail({
    to: 'player@example.com',
    recipientName: 'Carlos Yulo',
    tempPassword: 'CJPass!2026',
  });

  console.log('Result:', result);
  if (!result.success) {
    throw new Error('sendPasswordResetEmail returned failure!');
  }
  console.log('✓ Multi-transport dispatcher succeeded with provider:', result.provider);
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
