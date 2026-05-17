(function (window) {
  const starValues = { platinum: 100, gold: 75, silver: 30, bronze: 10, basic: 0 };
  const numericToStarKey = { 0: 'basic', 1: 'bronze', 2: 'silver', 3: 'gold', 4: 'platinum' };

  const abilityKeyMapping = {
    regen: 'regenerate'
  };

  const ICONS = {
    life: 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/common_files/icon_hp.png',
    speed: 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/common_files/icon_speed.png',
    ability: 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/icons/',
    typeBase: 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/m_m_m/icon_'
  };

  let mutantsData = [];
  let gachaData = {};

  function parseAbilityKey(ability) {
    if (!ability) return '';
    const key = ability.trim().toLowerCase().replace(/^ability_/, '');
    return abilityKeyMapping[key] || key;
  }

  function getAbilityName(ability) {
    const base = parseAbilityKey(ability);
    if (!base) return '';
    return base
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getAbilityIconUrl(ability) {
    const fullKey = ability && ability.trim().toLowerCase();
    if (!fullKey) return '';
    if (fullKey === 'ability_regen') {
      return ICONS.ability + 'ability_regenerate.png';
    }
    return ICONS.ability + fullKey + '.png';
  }

  function extractNumber(value) {
    if (!value) return 0;
    const str = String(value).trim();
    const match = str.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : parseInt(str, 10) || 0;
  }

  function calculateMutantStats(mutantData, fameLevel, starType = 'platinum', bonusGacha = 0, starValueOverride = null) {
    const globalAdjust = 100;
    const starValue = starValueOverride !== null ? starValueOverride : (starValues[starType] ?? starValues.platinum);
    const bonusStar = 100 + starValue;
    fameLevel = Math.max(25, parseInt(fameLevel, 10) || 25);
    const level = 100 + 10 * (fameLevel - 1);

    const atk1pValue = extractNumber(mutantData.atk1p);
    const atk2pValue = extractNumber(mutantData.atk2p);
    const lifeValue = parseInt(mutantData.life, 10) || 0;
    const speedValue = parseInt(mutantData.speed, 10) || 0;
    const abilityPct1 = parseInt(mutantData.abilityPct1, 10) || 0;
    const abilityPct2 = parseInt(mutantData.abilityPct2, 10) || 0;
    const abilitiesStr = mutantData.abilities || '';

    const abilityNames = {};
    const abilityIcons = {};
    if (abilitiesStr) {
      const parts = abilitiesStr.split(';');
      parts.forEach((part) => {
        const [num, ability] = part.split(':');
        if (num && ability) {
          abilityNames[num] = getAbilityName(ability);
          abilityIcons[num] = getAbilityIconUrl(ability);
        }
      });
    }

    const lifeF = Math.round((lifeValue * (bonusStar - bonusGacha) * level * globalAdjust) / 1000000);
    const bonusGachaDecimal = bonusGacha / 100;
    const atk1F = Math.round(Math.abs(((atk1pValue * bonusGachaDecimal + atk1pValue) * bonusStar * level * globalAdjust) / 1000000));
    const atk2F = Math.round(Math.abs(((atk2pValue * bonusGachaDecimal + atk2pValue) * bonusStar * level * globalAdjust) / 1000000));
    const atk1AbilityF = Math.round(Math.abs((atk1F / 100) * abilityPct2));
    const atk2AbilityF = Math.round(Math.abs((atk2F / 100) * abilityPct2));
    const speedF = speedValue > 0 ? (10 / (speedValue / 100)).toFixed(2) : '0.00';

    return {
      specimen: mutantData.specimen,
      name: mutantData.name,
      type: mutantData.type,
      fameLevel,
      level,
      lifeF,
      speedF,
      atk1F,
      atk2F,
      atk1AbilityF,
      atk2AbilityF,
      ability1Name: abilityNames['1'] || getAbilityName('ability_' + mutantData.atk1?.replace(/\s+/g, '_') || ''),
      ability2Name: abilityNames['2'] || getAbilityName('ability_' + mutantData.atk2?.replace(/\s+/g, '_') || ''),
      ability1Icon: abilityIcons['1'] || getAbilityIconUrl(mutantData.abilities?.split(';')[0]?.split(':')[1] || ''),
      ability2Icon: abilityIcons['2'] || getAbilityIconUrl(mutantData.abilities?.split(';')[1]?.split(':')[1] || ''),
      starType,
      bonusGacha,
      starValue
    };
  }

  function parseStatsCsv(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) return;
    const headers = lines[0].split('|').map((h) => h.trim());
    mutantsData = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split('|');
      if (values.length < 3) continue;
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim() : '';
      });
      mutantsData.push({
        specimen: row.Specimen || row.specimen || '',
        name: row.Name || row.name || '',
        speed: parseInt(row.speed, 10) || 0,
        odds: parseInt(row.odds, 10) || 0,
        dna: row.dna || row.DNA || '',
        life: row.life || row.Life || '0',
        incubMin: parseInt(row.incubMin, 10) || 0,
        atk1: row.atk1 || '',
        atk1p: row.atk1p || '',
        atk2: row.atk2 || '',
        atk2p: row.atk2p || '',
        bank: parseInt(row.bank, 10) || 0,
        unlockattack: row.unlockattack || row.unlockAttack || '',
        type: row.type || '',
        recipe: row.recipe || '',
        abilities: row.abilities || '',
        abilityPct1: row.abilityPct1 || '0',
        abilityPct2: row.abilityPct2 || '0',
        orbSlots: row.orbSlots || '',
        attack1p_name: row.attack1p_name || '',
        attack2p_name: row.attack2p_name || '',
        description: row.description || ''
      });
    }
  }

  function parseGachaCsv(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    gachaData = {};
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = line.split(',');
      if (values.length < 4) continue;
      const entry = {
        gachaId: values[0].trim(),
        specimen: values[1].trim(),
        stars: parseInt(values[2], 10) || 0,
        bonus: parseFloat(values[3]) || 0,
        odds: values[4]?.trim() || '',
        source: values[5]?.trim() || ''
      };
      if (!gachaData[entry.specimen]) gachaData[entry.specimen] = [];
      gachaData[entry.specimen].push(entry);
    }
  }

  async function loadStatsCsv(url) {
    const response = await fetch(url);
    const text = await response.text();
    parseStatsCsv(text);
    return mutantsData;
  }

  async function loadGachaCsv(url) {
    const response = await fetch(url);
    const text = await response.text();
    parseGachaCsv(text);
    return gachaData;
  }

  function getMutantFromCsv(id) {
    if (!mutantsData || mutantsData.length === 0) return null;
    const lowerId = String(id || '').trim().toLowerCase();
    return mutantsData.find((item) => item.specimen.trim().toLowerCase() === lowerId || item.name.trim().toLowerCase() === lowerId) || null;
  }

  function getAvailableSkins(mutantData) {
    if (!mutantData) return [];
    const skins = [
      { starType: 'basic', label: 'Basic', bonusGacha: 0, starValue: starValues.basic },
      { starType: 'bronze', label: 'Bronze', bonusGacha: 0, starValue: starValues.bronze },
      { starType: 'silver', label: 'Silver', bonusGacha: 0, starValue: starValues.silver },
      { starType: 'gold', label: 'Gold', bonusGacha: 0, starValue: starValues.gold },
      { starType: 'platinum', label: 'Platinum', bonusGacha: 0, starValue: starValues.platinum }
    ];

    const gachaList = gachaData[mutantData.specimen] || [];
    gachaList.forEach((entry, idx) => {
      const key = `gacha_${idx}`;
      const starKey = numericToStarKey[entry.stars] || 'basic';
      const label = `Gacha ${entry.gachaId} (${entry.stars}★, bonus ${entry.bonus})`;
      skins.push({ starType: key, label, bonusGacha: entry.bonus, starValue: starValues[starKey] || 0, imageSuffix: entry.gachaId });
    });

    return skins;
  }

  function getMutantThumbnailUrl(specimen, skinType = 'basic', imageSuffix = null) {
    const base = String(specimen || '').trim().toLowerCase();
    if (!base) return '';
    if (skinType.startsWith('gacha_') && imageSuffix) {
      return `https://s-ak.kobojo.com/mutants/assets/thumbnails/${base}_${imageSuffix}.png`;
    }
    if (skinType === 'basic') {
      return `https://s-ak.kobojo.com/mutants/assets/thumbnails/${base}.png`;
    }
    return `https://s-ak.kobojo.com/mutants/assets/thumbnails/${base}_${skinType}.png`;
  }

  window.BloggerMutants = {
    starValues,
    numericToStarKey,
    ICONS,
    mutantsData,
    gachaData,
    loadStatsCsv,
    loadGachaCsv,
    getMutantFromCsv,
    calculateMutantStats,
    getAvailableSkins,
    getMutantThumbnailUrl,
    getAbilityIconUrl
  };
})(window);
