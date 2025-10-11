const fs = require('fs');
const path = require('path');

// Using a relative path with forward slashes as requested by the user.
const relativeConfigPath = '../../source/settings/config.json';

// Resolve the relative path to an absolute path to ensure the script works regardless of the current working directory.
const configPath = path.resolve(__dirname, relativeConfigPath);

console.log(`Checking configuration at: ${configPath}`);

try {
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configFile);

    if (config.source && config.source.data === 'emulator') {
        console.log('✅ Data source is already set to "emulator". No changes needed.');
    } else {
        console.log(`🔥 Data source is currently "${config.source ? config.source.data : 'undefined'}". Updating to "emulator"...`);
        
        if (!config.source) {
            config.source = {};
        }
        config.source.data = 'emulator';

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        console.log('✅ Configuration updated successfully. Data source is now "emulator".');
    }
} catch (error) {
    console.error('❌ Error processing config file:', error);
    process.exit(1);
}
