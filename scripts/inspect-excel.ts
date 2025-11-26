
import * as XLSX from 'xlsx';
import path from 'path';

const filePath = '/Users/deepak/Downloads/Projects/StackLens-AI-Deploy/Tillster Store & Kiosk Information_as of 25092025 (1).xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get headers (first row)
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
    console.log('Headers:', headers);

    // Get first 3 rows of data
    const data = XLSX.utils.sheet_to_json(worksheet).slice(0, 3);
    console.log('First 3 rows:', JSON.stringify(data, null, 2));

} catch (error) {
    console.error('Error reading Excel file:', error);
}
