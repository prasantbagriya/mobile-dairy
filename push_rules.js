const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');

async function pushRules() {
  const auth = new GoogleAuth({
    keyFile: 'c:\\Users\\1\\Downloads\\milk-master-app-firebase-adminsdk-fbsvc-ecd49924a0.json',
    scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform']
  });

  const client = await auth.getClient();
  const projectId = 'milk-master-app';
  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

  const createRulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
  
  const rulesetBody = {
    source: {
      files: [
        {
          name: 'firestore.rules',
          content: rulesContent
        }
      ]
    }
  };

  try {
    const res = await client.request({
      url: createRulesetUrl,
      method: 'POST',
      data: rulesetBody
    });
    
    const rulesetName = res.data.name;
    console.log('Created ruleset:', rulesetName);
    
    const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
    
    const releaseBody = {
      name: `projects/${projectId}/releases/cloud.firestore`,
      rulesetName: rulesetName
    };
    
    // Check if release exists
    let exists = true;
    try {
        await client.request({ url: releaseUrl });
    } catch(e) {
        if(e.response && e.response.status === 404) {
            exists = false;
        }
    }

    if (exists) {
        console.log('Updating existing release...');
        await client.request({
            url: releaseUrl,
            method: 'PATCH',
            data: { release: releaseBody }
        });
    } else {
        console.log('Creating new release...');
        await client.request({
            url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
            method: 'POST',
            data: releaseBody
        });
    }
    
    console.log('Successfully deployed rules!');
  } catch(e) {
    console.error('Failed to deploy rules:', e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
  }
}

pushRules();
