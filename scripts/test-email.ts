import { generatePasswordResetEmailHtml, sendPasswordResetEmail } from '../lib/email';

async function main() {
  console.log('Testing generatePasswordResetEmailHtml...');
  const testResetUrl = 'https://c-j-pickleball.vercel.app/reset-password?token=test_token_123';
  const html = generatePasswordResetEmailHtml({
    recipientName: 'Carlos Yulo',
    resetUrl: testResetUrl,
  });

  if (!html.includes('Change Password') || !html.includes('C&J PICKLEBALL ARENA') || !html.includes(testResetUrl)) {
    throw new Error('HTML generation failed assertions!');
  }
  console.log('✓ HTML generated successfully with branded template and Change Password button.');

  console.log('Testing sendPasswordResetEmail (Sandbox mode)...');
  const result = await sendPasswordResetEmail({
    to: 'player@example.com',
    recipientName: 'Carlos Yulo',
    resetUrl: testResetUrl,
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
