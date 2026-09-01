const fs = require('fs');
fetch('https://api.sleeper.app/v1/players/nfl').then(r => r.json()).then(data => {
  const matches = Object.values(data).filter(p => p.full_name && p.full_name.toLowerCase().replace(/[^a-z0-9]/g, '') === 'justinjefferson');
  console.log(JSON.stringify(matches, null, 2));
});
