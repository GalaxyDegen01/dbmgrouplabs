// Externalized JS from post.html — contains Swiper init and dynamic CSV-driven logic
document.addEventListener('DOMContentLoaded', function () {
  // Swiper initialization
  try {
    if (typeof Swiper !== 'undefined') {
      new Swiper('.swiper', {
        loop: true,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev'
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true
        }
      });
    }
  } catch (e) {
    console.error('Swiper init error', e);
  }
});

// script dinámico para rellenar según CSV
const statsUrl = 'https://raw.githubusercontent.com/GalaxyDegen01/dbmgrouplabs/refs/heads/main/Stats.csv';
let statsData = {};
const defaultSpecimen = 'Specimen_CC_12';
let abilitiesConfig = {};
let genesMap = {
  'A_AOE': 'https://i.imgur.com/sIcJZzv.png',
  'A': 'https://i.imgur.com/rMC3BeM.png',
  'NEUTRE_AOE': 'https://i.imgur.com/2YSPY07.png',
  'NEUTRE': 'https://i.imgur.com/w6Brqxu.png',
  'B_AOE': 'https://i.imgur.com/W5XiML2.png',
  'B': 'https://i.imgur.com/7S29w5Q.png',
  'C_AOE': 'https://i.imgur.com/xUhwO0U.png',
  'C': 'https://i.imgur.com/fqF3cB7.png',
  'D_AOE': 'https://i.imgur.com/P79cYIn.png',
  'D': 'https://i.imgur.com/ML7kYuK.png',
  'E_AOE': 'https://i.imgur.com/wOMwEhZ.png',
  'E': 'https://i.imgur.com/j42y4DA.png',
  'F_AOE': 'https://i.imgur.com/c2geO8E.png',
  'F': 'https://i.imgur.com/6YzwR72.png'
};

async function loadAbilitiesCsv(url) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split('|');
      if (parts.length < 2) continue;
      const specimen = parts[0].trim();
      const appliesTo = parts[1].trim();
      abilitiesConfig[specimen] = appliesTo;
    }
  } catch (e) {
    console.error('error loading abilities config', e);
  }
}

function parseUnlockAttack(unlockAttack) {
  const genes = {};
  if (!unlockAttack) return genes;
  const parts = unlockAttack.split(';');
  parts.forEach(part => {
    const p = part.split(':');
    if (p.length >= 3) {
      const attack = p[0].trim();
      let gen = p[2].trim().toLowerCase();
      if (gen === 'neutre' || gen === 'neutral' || gen === 'n') gen = 'n';
      genes[attack] = gen;
    }
  });
  return genes;
}

async function loadGenesMapping(path = 'genes.txt') {
  try {
    const res = await fetch(path);
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    lines.forEach(line => {
      const m = line.split(':');
      if (m.length >= 2) {
        const key = m[0].trim();
        const url = m.slice(1).join(':').trim();
        if (key && url) genesMap[key.toUpperCase()] = url;
      }
    });
  } catch (e) {
    console.warn('could not load genes mapping', e);
  }
}

async function loadStatsCsv() {
  try {
    const res = await fetch(statsUrl);
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return;
    const headers = lines[0].split('|').map(h => h.trim());
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('|');
      if (cols.length !== headers.length) continue;
      const obj = {};
      headers.forEach((h,j) => obj[h] = cols[j]);
      statsData[obj['Specimen']] = obj;
    }
  } catch (e) {
    console.error('error al cargar Stats.csv', e);
  }
}

function getSpecimenId() {
  const el = document.getElementById('specimenIndicator');
  if (el && el.textContent.trim()) return el.textContent.trim();
  const params = new URLSearchParams(window.location.search);
  return params.get('specimen') || defaultSpecimen;
}

function replacePlaceholders(data, specimen) {
  function replacer(text) {
    function cleanKey(k) { return k.replace(/\)+$/, ''); }
    function lookup(k) {
      if (data[k] !== undefined) return data[k];
      const lower = k.toLowerCase();
      for (const prop in data) {
        if (prop.toLowerCase() === lower) return data[prop];
      }
      return undefined;
    }
    return text.replace(/\(([^)]+)\)/g, (m,k) => {
      k = cleanKey(k);
      if (k === 'ID') {
        if (text.includes('larva_')) {
          let v = specimen.toLowerCase();
          if (v.startsWith('specimen_')) v = v.substr(9);
          return v;
        }
        return specimen.toLowerCase();
      }
      if (k === 'type') {
        const t = (lookup('type') || '').trim();
        return t.toLowerCase();
      }
      if (k === 'ability' || k === 'abilities') {
        const abil = lookup('abilities') || '';
        const firstAbilityEntry = abil.split(';')[0];
        let fullAbilityName = firstAbilityEntry.split(':')[1] || firstAbilityEntry;
        if (fullAbilityName === 'ability_regen') {
          fullAbilityName = 'ability_regenerate';
        }
        if (text.includes('.png') || text.includes('http')) {
          return fullAbilityName;
        } else {
          let nameOnly = fullAbilityName.replace(/^ability_/, '');
          if (nameOnly === 'regen') nameOnly = 'regenerate';
          return nameOnly.charAt(0).toUpperCase() + nameOnly.slice(1);
        }
      }
      if (k === 'spx100') {
        const spValue = parseInt(lookup('spx100')) || 0;
        const speedF = (spValue > 0 ? 10 / (spValue / 100) : 0).toFixed(2);
        return speedF;
      }
      const val = lookup(k);
      return val !== undefined ? val : m;
    });
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let node;
  while (node = walker.nextNode()) {
    node.nodeValue = replacer(node.nodeValue);
  }
  document.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      attr.value = replacer(attr.value);
    });
    if (el.tagName === 'IMG' && el.hasAttribute('data-src')) {
      el.src = el.getAttribute('data-src');
    }
  });
}

function fillGenesRow(dnaString) {
  const container = document.getElementById('genesContainer');
  if (!container) return;
  container.innerHTML = '';
  if (!dnaString) return;
  const genes = dnaString.trim().split('');
  genes.forEach(gene => {
    const img = document.createElement('img');
    const geneStr = gene.toLowerCase();
    img.src = 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/fight_ui/gene_' + geneStr + '.png';
    img.alt = 'Gene ' + gene;
    container.appendChild(img);
  });
}

function fillMutantInfo(id) {
  let data = null;
  const candidates = [id, 'Specimen_' + id, id.replace(/^Specimen_/, ''), 'Specimen_' + id.replace(/^Specimen_/, '')];
  for (const k of candidates) {
    if (k && statsData[k]) { data = statsData[k]; break; }
  }
  if (!data) {
    alert('Specimen no encontrado: ' + id);
    return;
  }
  const nameEl = document.querySelector('.mutant-info h2');
  if (nameEl) nameEl.textContent = data.Name;
  const typeImg = document.querySelector('.mutant-type-image');
  if (typeImg) {
    const typeVal = (data.type || '').trim();
    if (typeVal) {
      const t = typeVal.toLowerCase();
      typeImg.src = 'https://s-ak.kobojo.com/mutants/assets/mobile/hud/m_m_m/icon_' + t + '.png';
      typeImg.alt = data.type;
      typeImg.style.display = 'inline-block';
    } else {
      typeImg.style.display = 'none';
    }
  }
  fillGenesRow(data.dna || data.DNA);
  replacePlaceholders(data, id);

  try {
    const specimenKey = data.Specimen || data.specimen || data.Name || id;
    const applies = (abilitiesConfig[specimenKey] || abilitiesConfig[id] || 'both').toLowerCase();
    const geneSections = document.querySelectorAll('.gene-section');
    if (geneSections && geneSections.length >= 2) {
      const firstAbilityRows = geneSections[0].querySelectorAll('.ability-row');
      const secondAbilityRows = geneSections[1].querySelectorAll('.ability-row');
      if (applies === 'both') {
        firstAbilityRows.forEach(r => r.style.display = 'block');
        secondAbilityRows.forEach(r => r.style.display = 'block');
      } else if (applies === 'atk1') {
        firstAbilityRows.forEach(r => r.style.display = 'block');
        secondAbilityRows.forEach(r => r.style.display = 'none');
      } else if (applies === 'atk2') {
        firstAbilityRows.forEach(r => r.style.display = 'none');
        secondAbilityRows.forEach(r => r.style.display = 'block');
      } else {
        firstAbilityRows.forEach(r => r.style.display = 'block');
        secondAbilityRows.forEach(r => r.style.display = 'none');
      }
    }
  } catch (e) {
    console.error('error applying abilities config', e);
  }

  try {
    const unlock = data.unlockAttack || data.unlockattack || '';
    const mapping = parseUnlockAttack(unlock);
    const atk1gene = mapping['1'] || mapping['1p'] || null;
    const atk2gene = mapping['2'] || mapping['2p'] || null;
    const headerImgs = document.querySelectorAll('.gene-section h4 img');
    const isAtk1Aoe = /(AOE)/i.test((data.atk1 || '') + (data.atk1p || ''));
    const isAtk2Aoe = /(AOE)/i.test((data.atk2 || '') + (data.atk2p || ''));

    function geneToIcon(g, isAoe) {
      if (!g) return null;
      const gi = (g === 'n' ? 'NEUTRE' : g.toString().toUpperCase());
      const keyBase = gi;
      const keyAoe = gi + '_AOE';
      if (isAoe) {
        if (genesMap[keyAoe]) return genesMap[keyAoe];
        if (genesMap[keyBase]) return genesMap[keyBase];
      } else {
        if (genesMap[keyBase]) return genesMap[keyBase];
        if (genesMap[keyAoe]) return genesMap[keyAoe];
      }
      return null;
    }
    if (headerImgs && headerImgs.length > 0) {
      if (headerImgs[0]) {
        const url1 = geneToIcon(atk1gene, isAtk1Aoe) || headerImgs[0].getAttribute('data-src') || headerImgs[0].src;
        headerImgs[0].setAttribute('data-src', url1);
        headerImgs[0].src = url1;
      }
      if (headerImgs[1]) {
        const url2 = geneToIcon(atk2gene, isAtk2Aoe) || headerImgs[1].getAttribute('data-src') || headerImgs[1].src;
        headerImgs[1].setAttribute('data-src', url2);
        headerImgs[1].src = url2;
      }
    }
  } catch (e) {
    console.error('error setting gene header icons', e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadAbilitiesCsv('https://raw.githubusercontent.com/GalaxyDegen01/dbmgrouplabs/refs/heads/main/abilitiesconfig.csv');
  await loadStatsCsv();
  const id = getSpecimenId();
  if (id) fillMutantInfo(id);
});
