// Kode kejuruan canonical (normalisasi nama -> kode standar).
// Digunakan saat membuat/memperbarui data kejuruan.

const legacyCodes: Record<string, string> = {
  'imp-1nl422t': 'SB-04',
  'imp-1t5ojqc': 'ST-04',
  'imp-hyd7hm': 'WEB-04',
};

export const canonicalKejuruanCode = (name: string, currentCode: string) => {
  const normalizedName = name.trim().toLocaleLowerCase('id-ID');
  if (normalizedName.includes('pemasangan sistem integrasi bangunan cerdas')) return 'SB-04';
  if (normalizedName.includes('pembuatan sistem informasi pariwisata berbasis website')) return 'ST-04';
  if (normalizedName.includes('pengembangan web dengan node.js dan react')) return 'WEB-04';
  return legacyCodes[normalizedName] || currentCode;
};