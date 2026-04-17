/**
 * Byte manipulation helper functions for Gen 1 save parsing
 */

/**
 * Get 16-bit unsigned integer (big endian) from Uint8Array
 */
function getUInt16BigEndian(view, offset) {
    return (view[offset] << 8) | view[offset + 1];
}

/**
 * Get 24-bit unsigned integer (big endian) from Uint8Array
 */
function getUInt24BigEndian(view, offset) {
    return (view[offset] << 16) | (view[offset + 1] << 8) | view[offset + 2];
}

/**
 * Parse BCD (Binary Coded Decimal) value
 */
function parseBCD(view, offset, bytes) {
    let value = 0;
    let multiplier = 1;
    for (let i = bytes - 1; i >= 0; i--) {
        value += ((view[offset + i] >> 4) * 10 + (view[offset + i] & 0x0F)) * multiplier;
        multiplier *= 100;
    }
    return value;
}

/**
 * Count set bits in a range of bytes
 */
function countSetBits(view, start, byteCount) {
    let count = 0;
    for (let i = 0; i < byteCount; i++) {
        let byte = view[start + i];
        while (byte) {
            count += byte & 1;
            byte >>= 1;
        }
    }
    return count;
}

/**
 * Decode Pokémon status condition
 */
function decodeStatus(statusByte) {
    const sleepMask = 0x07;
    const poisonMask = 0x08;
    const burnMask = 0x10;
    const freezeMask = 0x20;
    const paralysisMask = 0x40;
    
    const sleepTurns = statusByte & sleepMask;
    if (sleepTurns > 0) return `Sleep (${sleepTurns})`;
    if (statusByte & poisonMask) return 'Poison';
    if (statusByte & burnMask) return 'Burn';
    if (statusByte & freezeMask) return 'Freeze';
    if (statusByte & paralysisMask) return 'Paralysis';
    return 'OK';
}

/**
 * Get ASCII string from Uint8Array
 */
function getAsciiString(view, offset, length) {
    let str = '';
    for (let i = 0; i < length; i++) {
        const char = view[offset + i];
        if (char === 0) break;
        str += String.fromCharCode(char);
    }
    return str;
}

/**
 * Decode Gen 1 text (Pokémon character encoding)
 */
function decodeText(view, offset, length) {
    const charMap = " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz()[]-.,'?!:;«»♂♀×/";
    let str = '';
    for (let i = 0; i < length; i++) {
        const charCode = view[offset + i];
        if (charCode === 0x50) { // End of string marker
            break;
        }
        if (charCode < charMap.length) {
            str += charMap[charCode];
        } else if (charCode >= 0x60 && charCode <= 0x79) {
            // Uppercase letters (alternative range)
            str += String.fromCharCode(charCode - 0x60 + 65);
        } else if (charCode >= 0x80 && charCode <= 0x99) {
            // Lowercase letters
            str += String.fromCharCode(charCode - 0x80 + 97);
        } else if (charCode === 0xAA) {
            str += '♂';
        } else if (charCode === 0xAB) {
            str += '♀';
        } else {
            str += '?';
        }
    }
    return str.trim();
}

// Make available globally
window.getUInt16BigEndian = getUInt16BigEndian;
window.getUInt24BigEndian = getUInt24BigEndian;
window.parseBCD = parseBCD;
window.countSetBits = countSetBits;
window.decodeStatus = decodeStatus;
window.getAsciiString = getAsciiString;
window.decodeText = decodeText;
