// La place centrale : pavés, fontaine avec ses jets, pelouses, arbres, bancs,
// lampadaires, kiosques, et un monorail en anneau qui tourne autour.

import * as THREE from 'three';
import { PLACE, DISTRICTS } from './plan.js';
import { paves, herbe } from './textures.js';
import { enseigne } from './enseignes.js';

export function construireParc(groupe, rnd) {
  const R = PLACE.rayon;
  const obstacles = [];

  // ---- pavage de la place ----
  const texP = paves(); texP.repeat.set(R / 2, R / 2);
  const sol = new THREE.Mesh(new THREE.CircleGeometry(R + 3, 64), new THREE.MeshStandardMaterial({ map: texP, roughness: 0.9 }));
  sol.rotation.x = -Math.PI / 2; sol.position.y = 0.12; groupe.add(sol);
  const bordure = new THREE.Mesh(new THREE.RingGeometry(R + 2.6, R + 3.4, 64), new THREE.MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.9 }));
  bordure.rotation.x = -Math.PI / 2; bordure.position.y = 0.2; groupe.add(bordure);

  // ---- pelouses : un anneau d'herbe, coupé par les allées vers chaque avenue ----
  const texH = herbe(); texH.repeat.set(12, 12);
  const pelouse = new THREE.Mesh(new THREE.RingGeometry(10.5, R - 3, 64), new THREE.MeshStandardMaterial({ map: texH, roughness: 1 }));
  pelouse.rotation.x = -Math.PI / 2; pelouse.position.y = 0.16; groupe.add(pelouse);
  const alleeMat = new THREE.MeshStandardMaterial({ map: texP, roughness: 0.9 });
  for (const d of DISTRICTS) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(5, R - 8), alleeMat);
    const m = (10 + R - 3) / 2;
    a.position.set(Math.sin(d.theta) * m, 0.19, Math.cos(d.theta) * m);
    // le plan est couché (x), puis tourné autour de z pour que sa longueur suive le cap
    a.rotation.set(-Math.PI / 2, 0, d.theta);
    groupe.add(a);
  }

  // ---- fontaine : bassin, eau, colonne, jets ----
  const pierre = new THREE.MeshStandardMaterial({ color: 0x9a9da2, roughness: 0.8 });
  const bassin = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.9, 0.9, 40, 1, true), pierre);
  bassin.position.y = 0.45; groupe.add(bassin);
  const margelle = new THREE.Mesh(new THREE.TorusGeometry(6.7, 0.32, 10, 48), pierre);
  margelle.rotation.x = Math.PI / 2; margelle.position.y = 0.92; groupe.add(margelle);
  const eauMat = new THREE.MeshStandardMaterial({ color: 0x2f9fb8, roughness: 0.15, metalness: 0.5, transparent: true, opacity: 0.85, emissive: 0x0e4a5a, emissiveIntensity: 0.6 });
  const eau = new THREE.Mesh(new THREE.CircleGeometry(6.5, 40), eauMat);
  eau.rotation.x = -Math.PI / 2; eau.position.y = 0.8; groupe.add(eau);
  const colonne = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, 3.2, 12), pierre);
  colonne.position.y = 2.2; groupe.add(colonne);
  const vasque = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 0.8, 0.5, 24, 1, true), pierre);
  vasque.position.y = 3.9; groupe.add(vasque);
  const sculpture = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshStandardMaterial({ color: 0xffb454, emissive: 0xffb454, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.5 }));
  sculpture.position.y = 5.6; groupe.add(sculpture);
  const lumFontaine = new THREE.PointLight(0x7fe0ff, 30, 24, 1.6); lumFontaine.position.y = 2.5; groupe.add(lumFontaine);
  // jets : des points qui montent en parabole puis retombent
  const NJ = 520, jp = new Float32Array(NJ * 3), jv = [];
  for (let i = 0; i < NJ; i++) {
    const a = rnd() * Math.PI * 2, s = 0.55 + rnd() * 0.5;
    jv.push({ a, s, ph: rnd() });
  }
  const jGeo = new THREE.BufferGeometry(); jGeo.setAttribute('position', new THREE.Float32BufferAttribute(jp, 3));
  const jets = new THREE.Points(jGeo, new THREE.PointsMaterial({ color: 0xbff4ff, size: 0.16, transparent: true, opacity: 0.85 }));
  groupe.add(jets);
  obstacles.push({ x: 0, z: 0, w: 14, d: 14 });

  // ---- arbres : un tronc, trois couronnes rondes (ou un sapin), instanciés ----
  const NA = 52;
  const troncs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.26, 2.2, 7), new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 }), NA);
  const feuillage = new THREE.MeshStandardMaterial({ color: 0x2f6b3a, roughness: 1 });
  const feuilles = new THREE.InstancedMesh(new THREE.ConeGeometry(1.4, 2.6, 8), feuillage, NA * 3);
  const rondes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, 1), feuillage, NA * 3);
  const dummy = new THREE.Object3D(); let na = 0, nf = 0, nr = 0;
  const teintes = [0x2f6b3a, 0x3d7a3a, 0x5a7d2e, 0x8a6a2a];
  const col = new THREE.Color();
  for (let i = 0; i < NA; i++) {
    const r = 12.5 + rnd() * (R - 16), a = rnd() * Math.PI * 2;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    // pas sur une allée
    if (DISTRICTS.some(d => Math.abs(Math.atan2(Math.sin(a - d.theta), Math.cos(a - d.theta))) < 0.16)) continue;
    const s = 0.8 + rnd() * 0.7;
    dummy.position.set(x, 1.1 * s + 0.16, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(s, s, s); dummy.updateMatrix(); troncs.setMatrixAt(na++, dummy.matrix);
    col.setHex(teintes[Math.floor(rnd() * teintes.length)]);
    if (rnd() < 0.3) {
      for (let k = 0; k < 3; k++) {
        const sk = s * (1.15 - k * 0.28);
        dummy.position.set(x, 0.16 + (2.0 + k * 1.1) * s, z); dummy.scale.set(sk, sk, sk); dummy.rotation.set(0, rnd() * 6, 0); dummy.updateMatrix();
        feuilles.setMatrixAt(nf, dummy.matrix); feuilles.setColorAt(nf, col); nf++;
      }
    } else {
      for (let k = 0; k < 3; k++) {
        const sk = s * (0.75 + rnd() * 0.5);
        dummy.position.set(x + (rnd() - 0.5) * 1.4 * s, 0.16 + (2.6 + k * 0.9) * s, z + (rnd() - 0.5) * 1.4 * s);
        dummy.scale.set(sk, sk * 0.8, sk); dummy.rotation.set(rnd(), rnd() * 6, rnd()); dummy.updateMatrix();
        rondes.setMatrixAt(nr, dummy.matrix); rondes.setColorAt(nr, col); nr++;
      }
    }
    obstacles.push({ x, z, w: 1.2, d: 1.2 });
  }
  troncs.count = na; feuilles.count = Math.max(nf, 0); rondes.count = nr;
  if (feuilles.instanceColor) feuilles.instanceColor.needsUpdate = true;
  if (rondes.instanceColor) rondes.instanceColor.needsUpdate = true;
  groupe.add(troncs, feuilles, rondes);

  // ---- bancs et lampadaires autour de la fontaine ----
  const banc = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 }), 16);
  const lampe = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8), new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.5 }), 16);
  const globe = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe0b0, toneMapped: false }), 16);
  let nb = 0, nl = 0;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8;
    dummy.position.set(Math.sin(a) * 9.2, 0.62, Math.cos(a) * 9.2); dummy.rotation.set(0, a, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); banc.setMatrixAt(nb++, dummy.matrix);
    const al = i / 8 * Math.PI * 2 + Math.PI / 16;
    dummy.position.set(Math.sin(al) * 23, 2.25, Math.cos(al) * 23); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); lampe.setMatrixAt(nl, dummy.matrix);
    dummy.position.set(Math.sin(al) * 23, 4.5, Math.cos(al) * 23); dummy.updateMatrix(); globe.setMatrixAt(nl, dummy.matrix); nl++;
  }
  banc.count = nb; lampe.count = nl; globe.count = nl; groupe.add(banc, lampe, globe);
  for (let i = 0; i < 4; i++) {
    const al = i / 4 * Math.PI * 2 + Math.PI / 16;
    const l = new THREE.PointLight(0xffe0b0, 9, 16, 1.8); l.position.set(Math.sin(al) * 23, 4.3, Math.cos(al) * 23); groupe.add(l);
  }

  // ---- kiosques : trois petits pavillons lumineux au bord de la place ----
  const kioskMat = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.6, metalness: 0.3 });
  [['NOODLES', '#ff9a5c', 0.9], ['KIOSK', '#2fb8c9', 2.9], ['TEA', '#e84fd1', 4.6]].forEach(([mot, couleur, a]) => {
    const x = Math.sin(a) * (R - 6), z = Math.cos(a) * (R - 6);
    const k = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 2.4), kioskMat); corps.position.y = 1.45; k.add(corps);
    const toitK = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.14, 3), new THREE.MeshStandardMaterial({ color: 0x1a1f26 })); toitK.position.y = 2.85; k.add(toitK);
    const comptoir = new THREE.Mesh(new THREE.BoxGeometry(3.02, 1.0, 0.6), new THREE.MeshBasicMaterial({ color: couleur, toneMapped: false, transparent: true, opacity: 0.85 })); comptoir.position.set(0, 1.5, -1.0); k.add(comptoir);
    const e = enseigne(mot, '#0B0E11', couleur, 2.4, 'h', 1); e.position.set(0, 3.3, -1.2); k.add(e);
    const l = new THREE.PointLight(new THREE.Color(couleur), 6, 10, 2); l.position.set(0, 2.2, -1.6); k.add(l);
    k.position.set(x, 0.15, z); k.rotation.y = a + Math.PI; groupe.add(k);
    obstacles.push({ x, z, w: 3.6, d: 3 });
  });

  // ---- monorail : un anneau de voie à 11 m, ses piliers, deux rames qui tournent ----
  const RV = 42, N = 48;
  const voieMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.6, roughness: 0.4 });
  const liseré = new THREE.MeshBasicMaterial({ color: 0x46E6C8, toneMapped: false });
  for (let i = 0; i < N; i++) {
    const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2, am = (a0 + a1) / 2;
    const L = 2 * RV * Math.sin(Math.PI / N) + 0.1;
    const v = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, L), voieMat);
    v.position.set(Math.sin(am) * RV, 11, Math.cos(am) * RV); v.rotation.y = am; groupe.add(v);
    const lz = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, L), liseré);
    lz.position.set(Math.sin(am) * (RV - 0.8), 11.3, Math.cos(am) * (RV - 0.8)); lz.rotation.y = am; groupe.add(lz);
    if (i % 4 === 0) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 11, 0.7), voieMat);
      p.position.set(Math.sin(am) * RV, 5.5, Math.cos(am) * RV); groupe.add(p);
      obstacles.push({ x: p.position.x, z: p.position.z, w: 0.7, d: 0.7 });
    }
  }
  const rames = [];
  for (let k = 0; k < 2; k++) {
    const r = new THREE.Group();
    const corps = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 7), new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.3, metalness: 0.5 })); corps.position.y = 1.15; r.add(corps);
    const fen = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.6, 6.2), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })); fen.position.y = 1.3; r.add(fen);
    const bande = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.12, 7), new THREE.MeshBasicMaterial({ color: 0x46E6C8, toneMapped: false })); bande.position.y = 0.55; r.add(bande);
    r.userData.a = k * Math.PI;
    groupe.add(r); rames.push(r);
  }

  return {
    obstacles,
    animer(t) {
      const p = jets.geometry.attributes.position;
      for (let i = 0; i < NJ; i++) {
        const j = jv[i];
        const u = (t * 0.55 * j.s + j.ph) % 1;
        const r = u * 4.2 * j.s;
        p.setXYZ(i, Math.sin(j.a) * r, 4.2 + 3.4 * j.s * u - 8 * u * u, Math.cos(j.a) * r);
      }
      p.needsUpdate = true;
      eauMat.opacity = 0.8 + Math.sin(t * 1.8) * 0.05;
      sculpture.rotation.y = t * 0.4;
      for (const r of rames) {
        const a = r.userData.a + t * 0.09;
        r.position.set(Math.sin(a) * RV, 11.25, Math.cos(a) * RV);
        r.rotation.y = a + Math.PI / 2;
      }
    },
  };
}
