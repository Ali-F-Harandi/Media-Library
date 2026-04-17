/**
 * Byte Helper Utilities for Gen 1 Save Parsing
 */

/**
 * Read a 16-bit unsigned integer (little-endian) from a Uint8Array
 */
export function getUInt16LE(data, offset) {
  return data[offset] | (data[offset + 1] << 8);
}

/**
 * Read a 16-bit unsigned integer (big-endian) from a Uint8Array
 */
export function getUInt16BigEndian(data, offset) {
  return (data[offset] << 8) | data[offset + 1];
}

/**
 * Read a 24-bit unsigned integer (little-endian) from a Uint8Array
 */
export function getUInt24LE(data, offset) {
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
}

/**
 * Read a 24-bit unsigned integer (big-endian) from a Uint8Array
 */
export function getUInt24BigEndian(data, offset) {
  return (data[offset] << 16) | (data[offset + 1] << 8) | data[offset + 2];
}

/**
 * Read a 32-bit unsigned integer (little-endian) from a Uint8Array
 */
export function getUInt32LE(data, offset) {
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
}

/**
 * Parse BCD (Binary Coded Decimal) encoded value
 * Gen 1 stores money and coins in BCD format
 */
export function parseBCD(data, offset, numBytes) {
  let value = 0;
  let multiplier = 1;
  
  for (let i = 0; i < numBytes; i++) {
    const byte = data[offset + i];
    value += ((byte & 0x0F) * multiplier);
    multiplier *= 10;
    value += (((byte >> 4) & 0x0F) * multiplier);
    multiplier *= 10;
  }
  
  return value;
}

/**
 * Count the number of set bits in a range of bytes
 */
export function countSetBits(data, startOffset, numBytes) {
  let count = 0;
  
  for (let i = 0; i < numBytes; i++) {
    let byte = data[startOffset + i];
    
    while (byte) {
      count += byte & 1;
      byte >>= 1;
    }
  }
  
  return count;
}

/**
 * Decode Gen 1 status condition byte
 * Bit 0-2: Sleep counter (0-7)
 * Bit 3: Poison
 * Bit 4: Burn
 * Bit 5: Freeze
 * Bit 6: Paralysis
 * Bit 7: Bad Poison (toxic)
 */
export function decodeStatus(statusByte) {
  const conditions = [];
  
  // Sleep (bits 0-2)
  const sleepCounter = statusByte & 0x07;
  if (sleepCounter > 0) {
    conditions.push('Sleep');
  }
  
  // Poison
  if (statusByte & 0x08) {
    conditions.push('Poison');
  }
  
  // Burn
  if (statusByte & 0x10) {
    conditions.push('Burn');
  }
  
  // Freeze
  if (statusByte & 0x20) {
    conditions.push('Freeze');
  }
  
  // Paralysis
  if (statusByte & 0x40) {
    conditions.push('Paralysis');
  }
  
  // Bad Poison (Toxic)
  if (statusByte & 0x80) {
    conditions.push('Bad Poison');
  }
  
  return conditions.length > 0 ? conditions : 'OK';
}

/**
 * Get an ASCII string from a Uint8Array
 */
export function getAsciiString(data, offset, length) {
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const charCode = data[offset + i];
    if (charCode === 0 || charCode === 0xFF) break;
    result += String.fromCharCode(charCode);
  }
  
  return result.trim();
}

/**
 * Decode Gen 1 text encoding to readable string
 * Gen 1 uses a custom character encoding
 */
export function decodeText(data, offset, length) {
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const charCode = data[offset + i];
    
    // End of string markers
    if (charCode === 0x50 || charCode === 0xFF || charCode === 0x00) {
      break;
    }
    
    // Character mapping for Gen 1
    if (charCode >= 0x04 && charCode <= 0x13) {
      // Uppercase letters A-Z
      result += String.fromCharCode(charCode + 0x56);
    } else if (charCode >= 0x14 && charCode <= 0x1D) {
      // Lowercase letters a-j
      result += String.fromCharCode(charCode + 0x69);
    } else if (charCode === 0x1A) {
      result += '\'';
    } else if (charCode === 0x1B) {
      result += '-';
    } else if (charCode === 0x1C) {
      result += '?';
    } else if (charCode === 0x1D) {
      result += '!';
    } else if (charCode === 0x1E) {
      result += '.';
    } else if (charCode === 0x1F) {
      result += '♂'; // Male symbol
    } else if (charCode === 0x20) {
      result += '♀'; // Female symbol
    } else if (charCode === 0x21) {
      result += ',';
    } else if (charCode === 0x22) {
      result += '/';
    } else if (charCode === 0x23) {
      result += ' ';
    } else if (charCode === 0x24) {
      result += ')';
    } else if (charCode === 0x25) {
      result += '(';
    } else if (charCode === 0x26) {
      result += ':';
    } else if (charCode === 0x27) {
      result += ';';
    } else if (charCode === 0x28) {
      result += '[';
    } else if (charCode === 0x29) {
      result += ']';
    } else {
      // Unknown character
      result += '?';
    }
  }
  
  return result.trim();
}
