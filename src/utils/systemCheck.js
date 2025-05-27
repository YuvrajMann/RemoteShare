const os = require('os');
const disk = require('diskusage');
const path = require('path');

async function checkSystemResources() {
    // Check available memory
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const requiredMemory = 12 * 1024 * 1024 * 1024; // 12GB for safe operation

    if (freeMemory < requiredMemory) {
        console.warn(`WARNING: Available memory (${Math.floor(freeMemory / 1024 / 1024 / 1024)}GB) is less than recommended (12GB)`);
    }

    // Check disk space
    try {
        const info = await disk.check(path.parse(process.cwd()).root);
        const freeSpace = info.free;
        const requiredSpace = 20 * 1024 * 1024 * 1024; // 20GB for safe operation

        if (freeSpace < requiredSpace) {
            console.warn(`WARNING: Available disk space (${Math.floor(freeSpace / 1024 / 1024 / 1024)}GB) is less than recommended (20GB)`);
        }
    } catch (err) {
        console.error('Error checking disk space:', err);
    }
}

module.exports = { checkSystemResources };