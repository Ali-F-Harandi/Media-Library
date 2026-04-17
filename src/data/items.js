/**
 * Gen 1 Item Names
 */
export const ITEM_NAMES = {
  0x00: 'None',
  0x01: 'Master Ball',
  0x02: 'Ultra Ball',
  0x03: 'Great Ball',
  0x04: 'Poké Ball',
  0x05: 'Town Map',
  0x06: 'Bicycle',
  0x07: '???', // Fake item
  0x08: 'Safari Ball',
  0x09: 'Pokédex',
  0x0A: 'Moon Stone',
  0x0B: 'Antidote',
  0x0C: 'Burn Heal',
  0x0D: 'Ice Heal',
  0x0E: 'Awakening',
  0x0F: 'Parlyz Heal',
  0x10: 'Full Restore',
  0x11: 'Max Potion',
  0x12: 'Hyper Potion',
  0x13: 'Potion',
  0x14: 'Escape Rope',
  0x15: 'Repel',
  0x16: 'Old Amber',
  0x17: 'Fire Stone',
  0x18: 'Thunder Stone',
  0x19: 'Water Stone',
  0x1A: 'HP Up',
  0x1B: 'Protein',
  0x1C: 'Iron',
  0x1D: 'Carbos',
  0x1E: 'Calcium',
  0x1F: 'Rare Candy',
  0x20: 'X Accuracy',
  0x21: 'Leaf Stone',
  0x22: 'Metal Coat',
  0x23: 'Nugget',
  0x24: 'Escape Rope', // Duplicate?
  0x25: 'Super Repel',
  0x26: 'Max Repel',
  0x27: 'Dire Hit',
  0x28: 'Coin Case',
  0x29: 'Itemfinder',
  0x2A: 'Silph Scope',
  0x2B: 'Poké Flute',
  0x2C: 'Lift Key',
  0x2D: 'Exp. All',
  0x2E: 'Old Rod',
  0x2F: 'Good Rod',
  0x30: 'Super Rod',
  0x31: 'PP Up',
  0x32: 'Ether',
  0x33: 'Max Ether',
  0x34: 'Elixir',
  0x35: 'Max Elixir',
  0xC8: 'Secret Key',
  0xC9: 'Bike Voucher',
  0xCA: 'Gold Teeth',
  0xCB: 'Card Key',
  0xCC: 'Lift Key', // Alternative location
  0xCD: 'Helix Fossil',
  0xCE: 'Dome Fossil',
  0xCF: 'Omanyte Fossil',
  0xD0: 'Kabuto Fossil',
  0xD1: 'Poké Doll',
  0xD2: 'Flareon', // Actually a key item for evolution
  0xD3: 'Jolteon',
  0xD4: 'Vaporeon',
  0xD5: 'Hi Super',
};

/**
 * Get item name by ID
 */
export function getItemName(itemId) {
  if (itemId === 0xFF || itemId === 0x00) {
    return 'None';
  }
  return ITEM_NAMES[itemId] || `Unknown Item (${itemId})`;
}
