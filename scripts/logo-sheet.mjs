// Hoja de contacto para verificar visualmente los logos locales (no se publica).
import { chromium } from '@playwright/test';
import { readdirSync } from 'node:fs';
const out = process.argv[2];
const files = readdirSync('public/brands');
const html = `<body style="font-family:sans-serif;display:grid;grid-template-columns:repeat(6,1fr);gap:12px;padding:16px;background:#f3f5f9">${files.map((f) => `<div style="background:${f.startsWith('mti') ? '#0a0f1e' : '#fff'};border:1px solid #ddd;border-radius:10px;padding:10px;text-align:center"><img src="http://localhost:5173/brands/${f}" style="height:56px;max-width:100%;object-fit:contain"><div style="font-size:11px;color:#555;margin-top:6px">${f}</div></div>`).join('')}</body>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 420 } });
await p.setContent(html, { waitUntil: 'networkidle' }); await p.screenshot({ path: out, fullPage: true }); await b.close();
