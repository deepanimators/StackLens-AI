import fs from 'fs';
import readline from 'readline';
import path from 'path';

const logPath = path.join(__dirname, '../../logs/app.log');
const N = parseInt(process.argv[2] || '5', 10);

const findLastErrors = async () => {
    if (!fs.existsSync(logPath)) {
        console.log('Log file not found at', logPath);
        return;
    }

    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const errors: any[] = [];

    for await (const line of rl) {
        try {
            const log = JSON.parse(line);
            if (log.level === 'error' || log.error_code) {
                errors.push(log);
            }
        } catch (e) {
            // ignore invalid json
        }
    }

    const lastN = errors.slice(-N);
    console.log(JSON.stringify(lastN, null, 2));
};

findLastErrors();
