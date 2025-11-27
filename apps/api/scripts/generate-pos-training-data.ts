import * as XLSX from "xlsx";
import path from "path";

const posErrors = [
    // A. Hardware Malfunctions
    {
        error_description: "Receipt printer jammed or out of paper",
        error_type: "HARDWARE",
        severity: "Medium",
        resolution: "1. Open printer cover; 2. Check for paper jam; 3. Ensure paper roll is seated correctly; 4. Close cover firmly",
        keywords: "printer, jam, paper, receipt"
    },
    {
        error_description: "Printer not detected by terminal",
        error_type: "HARDWARE",
        severity: "High",
        resolution: "1. Check USB/Ethernet cable connection; 2. Restart printer; 3. Restart POS terminal; 4. Verify printer IP address if networked",
        keywords: "printer, connection, undetected, offline"
    },
    {
        error_description: "Barcode scanner light on but not reading",
        error_type: "HARDWARE",
        severity: "Medium",
        resolution: "1. Clean scanner lens; 2. Check barcode quality; 3. Reset scanner to factory defaults; 4. Re-pair if Bluetooth",
        keywords: "scanner, laser, reading, barcode"
    },
    {
        error_description: "Bluetooth/USB scanner disconnected",
        error_type: "HARDWARE",
        severity: "Medium",
        resolution: "1. Reconnect USB cable; 2. Check Bluetooth pairing status; 3. Replace scanner battery if wireless",
        keywords: "scanner, disconnected, bluetooth, usb"
    },
    {
        error_description: "Payment terminal stuck in initializing state",
        error_type: "HARDWARE",
        severity: "High",
        resolution: "1. Force reboot payment terminal (hold power + clear); 2. Check internet connection; 3. Contact payment processor support",
        keywords: "payment terminal, initializing, stuck, frozen"
    },
    {
        error_description: "Physical damage or tamper alert on reader",
        error_type: "HARDWARE",
        severity: "Critical",
        resolution: "1. Stop using device immediately; 2. Contact support for replacement; 3. Do not attempt to repair",
        keywords: "tamper, damage, reader, security"
    },
    {
        error_description: "Drawer fails to open after transaction",
        error_type: "HARDWARE",
        severity: "Medium",
        resolution: "1. Check printer connection (drawer connects to printer); 2. Verify key is in unlocked position; 3. Check for obstructions under drawer",
        keywords: "cash drawer, stuck, open, printer"
    },
    {
        error_description: "Secondary screen not showing items",
        error_type: "HARDWARE",
        severity: "Low",
        resolution: "1. Check HDMI/USB connection to customer display; 2. Restart POS application; 3. Verify display settings in OS",
        keywords: "customer display, screen, blank, secondary"
    },
    {
        error_description: "Dead zones or ghost touches on main display",
        error_type: "HARDWARE",
        severity: "High",
        resolution: "1. Clean screen surface; 2. Calibrate touchscreen in OS settings; 3. Restart terminal; 4. Hardware replacement required if persistent",
        keywords: "touchscreen, ghost touch, unresponsive, display"
    },
    {
        error_description: "Integrated weighing scale reading incorrectly",
        error_type: "HARDWARE",
        severity: "High",
        resolution: "1. Remove all items from scale; 2. Press Zero/Tare button; 3. Check for debris under scale platter; 4. Recalibrate if supported",
        keywords: "scale, weight, calibration, incorrect"
    },

    // B. Network & Connectivity
    {
        error_description: "Intermittent packet loss causing slow sync",
        error_type: "NETWORK",
        severity: "Medium",
        resolution: "1. Move terminal closer to Wi-Fi AP; 2. Switch to 5GHz band; 3. Use Ethernet connection if possible",
        keywords: "wifi, packet loss, slow, sync"
    },
    {
        error_description: "Payment processor not responding (504)",
        error_type: "NETWORK",
        severity: "Critical",
        resolution: "1. Check internet connection; 2. Verify gateway status page for outages; 3. Retry transaction after 30s",
        keywords: "gateway, timeout, 504, payment"
    },
    {
        error_description: "Unable to resolve backend API host",
        error_type: "NETWORK",
        severity: "High",
        resolution: "1. Check DNS settings on router; 2. Try using Google DNS (8.8.8.8); 3. Restart router/modem",
        keywords: "dns, resolution, api, host"
    },
    {
        error_description: "Terminals cannot see the main server/kitchen printer",
        error_type: "NETWORK",
        severity: "High",
        resolution: "1. Verify all devices are on same subnet; 2. Check switch/router ports; 3. Ping server IP from terminal",
        keywords: "network, partition, visibility, local"
    },
    {
        error_description: "Certificate expiry or clock skew preventing connection",
        error_type: "NETWORK",
        severity: "High",
        resolution: "1. Check system date/time on terminal; 2. Update OS root certificates; 3. Renew SSL certificate on server",
        keywords: "ssl, certificate, clock, handshake"
    },
    {
        error_description: "Unable to upload offline transactions after reconnection",
        error_type: "NETWORK",
        severity: "Critical",
        resolution: "1. Do not clear app data; 2. Ensure stable internet; 3. Trigger manual sync; 4. Export transaction logs if possible",
        keywords: "offline, sync, upload, transactions"
    },
    {
        error_description: "Port 443/8080 blocked by local security software",
        error_type: "NETWORK",
        severity: "High",
        resolution: "1. Check Windows Firewall/Antivirus settings; 2. Add exception for POS application; 3. Allow traffic on required ports",
        keywords: "firewall, blocked, port, security"
    },

    // C. Payment Processing
    {
        error_description: "Standard Insufficient Funds error",
        error_type: "TRANSACTION",
        severity: "Low",
        resolution: "1. Ask customer for alternative payment method; 2. Retry with lower amount (split payment)",
        keywords: "declined, funds, insufficient, card"
    },
    {
        error_description: "Card expiration date has passed",
        error_type: "TRANSACTION",
        severity: "Low",
        resolution: "1. Check card expiry date; 2. Ask for new card",
        keywords: "expired, card, date"
    },
    {
        error_description: "Too many wrong PIN attempts",
        error_type: "TRANSACTION",
        severity: "Medium",
        resolution: "1. Card is locked; 2. Customer must contact bank to unlock; 3. Use different card",
        keywords: "pin, lockout, wrong, attempts"
    },
    {
        error_description: "Chip malfunction, fallback to swipe required",
        error_type: "TRANSACTION",
        severity: "Medium",
        resolution: "1. Insert chip 3 times until terminal prompts for swipe; 2. Swipe card; 3. Clean chip contacts",
        keywords: "chip, emv, read fail, swipe"
    },
    {
        error_description: "Same transaction ID processed twice",
        error_type: "TRANSACTION",
        severity: "High",
        resolution: "1. Check recent transactions list; 2. Void duplicate if found; 3. Do not re-run card unless confirmed declined",
        keywords: "duplicate, transaction, double charge"
    },
    {
        error_description: "End-of-day batch upload failed",
        error_type: "TRANSACTION",
        severity: "High",
        resolution: "1. Check internet connection; 2. Manually trigger batch settlement; 3. Contact processor if error persists",
        keywords: "batch, settlement, fail, upload"
    },
    {
        error_description: "Card brand not enabled in merchant config",
        error_type: "TRANSACTION",
        severity: "Medium",
        resolution: "1. Check accepted card types; 2. Contact merchant provider to enable card brand (e.g., Amex)",
        keywords: "unsupported, card type, brand, config"
    },

    // D. System & Performance
    {
        error_description: "Out of Memory crash during heavy load",
        error_type: "SYSTEM",
        severity: "High",
        resolution: "1. Close background apps; 2. Restart POS app; 3. Upgrade RAM if frequent",
        keywords: "crash, memory, oom, slow"
    },
    {
        error_description: ">10s delay in finalizing sale",
        error_type: "SYSTEM",
        severity: "Medium",
        resolution: "1. Check database size/performance; 2. Archive old data; 3. Check network latency",
        keywords: "slow, delay, transaction, lag"
    },
    {
        error_description: "UI freezes while waiting for DB write",
        error_type: "DATABASE",
        severity: "High",
        resolution: "1. Check database locks; 2. Restart database service; 3. Check disk I/O usage",
        keywords: "freeze, database, lock, wait"
    },
    {
        error_description: "Unable to save logs or local transaction cache",
        error_type: "SYSTEM",
        severity: "Critical",
        resolution: "1. Free up disk space; 2. Clear temp files; 3. Check disk permissions",
        keywords: "disk space, full, storage, save"
    },
    {
        error_description: "Automatic software update failed",
        error_type: "SYSTEM",
        severity: "Medium",
        resolution: "1. Check internet; 2. Restart application; 3. Download installer manually from portal",
        keywords: "update, failed, rollback, software"
    },

    // E. User & Process
    {
        error_description: "User locked out after N failed tries",
        error_type: "SECURITY",
        severity: "Medium",
        resolution: "1. Wait for lockout period (15m); 2. Admin can reset password; 3. Check caps lock",
        keywords: "login, locked, password, user"
    },
    {
        error_description: "Cashier attempted discount without permission",
        error_type: "SECURITY",
        severity: "Low",
        resolution: "1. Manager override required; 2. Check user role permissions",
        keywords: "discount, permission, override, auth"
    },
    {
        error_description: "Cash in drawer does not match expected",
        error_type: "APPLICATION",
        severity: "Medium",
        resolution: "1. Recount cash; 2. Check for misplaced receipts/checks; 3. Review transaction log for errors",
        keywords: "discrepancy, cash, drawer, shift"
    },
    {
        error_description: "Manager approval required for void",
        error_type: "SECURITY",
        severity: "Low",
        resolution: "1. Call manager for PIN/Card; 2. Verify reason for void",
        keywords: "void, limit, approval, manager"
    },
    {
        error_description: "Scanned barcode not in local database",
        error_type: "APPLICATION",
        severity: "Medium",
        resolution: "1. Sync database; 2. Check item exists in backend; 3. Manually enter price/SKU",
        keywords: "item not found, barcode, sku, database"
    },

    // F. Data & Inventory
    {
        error_description: "Item sold locally but out of stock in backend",
        error_type: "DATABASE",
        severity: "Medium",
        resolution: "1. Perform inventory count; 2. Adjust stock level in backend; 3. Check sync logs",
        keywords: "inventory, sync, conflict, stock"
    },
    {
        error_description: "Mismatch between local and cloud tax rules",
        error_type: "APPLICATION",
        severity: "High",
        resolution: "1. Force sync tax settings; 2. Verify location settings; 3. Update tax tables",
        keywords: "tax, calculation, error, mismatch"
    },
    {
        error_description: "Loyalty data unavailable",
        error_type: "NETWORK",
        severity: "Low",
        resolution: "1. Check internet; 2. Proceed without loyalty or use phone number for later credit",
        keywords: "loyalty, profile, load fail, customer"
    },

    // G. Security
    {
        error_description: "Unencrypted data detected in logs",
        error_type: "SECURITY",
        severity: "Critical",
        resolution: "1. Update POS software immediately; 2. Rotate encryption keys; 3. Clear logs securely",
        keywords: "pci, compliance, unencrypted, logs"
    },
    {
        error_description: "High volume of refunds flagged",
        error_type: "SECURITY",
        severity: "High",
        resolution: "1. Review refund report; 2. Investigate cashier activity; 3. Check for system error causing duplicate charges",
        keywords: "refund, suspicious, fraud, alert"
    },

    // H. Integration
    {
        error_description: "Order not appearing on KDS",
        error_type: "NETWORK",
        severity: "High",
        resolution: "1. Check KDS network connection; 2. Restart KDS application; 3. Resend order from POS",
        keywords: "kds, kitchen, display, integration"
    }
];

const ws = XLSX.utils.json_to_sheet(posErrors);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "POS Errors");

const outputPath = path.resolve(process.cwd(), "pos_error_training_data.xlsx");
XLSX.writeFile(wb, outputPath);

console.log(`✅ Generated POS error training data at: ${outputPath}`);
