const { exec } = require('child_process');
exec('python --version', (err, stdout, stderr) => {
  if (err) {
      console.error('Error:', err);
  }
  console.log('STDOUT:', stdout);
  console.log('STDERR:', stderr);
});
