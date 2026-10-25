"use client";

import { useId, useState } from "react";
import type { Bonificacion, Categoria } from "../lib/content";

const fmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const money = (n: number) => `$ ${fmt.format(Math.round(n))}`;

function calc(cat: Categoria, uf: number, cocheras: number, bonificaciones: Bonificacion[]) {
  const extra = Math.max(0, uf - 20);
  const base = cat.minimo20;
  const ufExtra = extra * cat.porUf;
  const coch = cocheras * cat.cochera;
  const subtotal = base + ufExtra + coch;
  const bonif = [...bonificaciones].sort((a, b) => b.desde - a.desde).find((b) => uf > b.desde);
  return { extra, base, ufExtra, coch, bonif, total: subtotal * (1 - (bonif?.pct ?? 0) / 100) };
}

function clampInt(v: string, max: number) {
  const n = Math.floor(Number(v.replace(/\D/g, "")));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, n)) : 0;
}

export function CalculadoraHonorarios({ categorias, bonificaciones }: { categorias: Categoria[]; bonificaciones: Bonificacion[] }) {
  const ufId = useId();
  const cochId = useId();
  const [codigo, setCodigo] = useState(categorias[1]?.codigo ?? categorias[0]?.codigo ?? "");
  const [uf, setUf] = useState("24");
  const [coch, setCoch] = useState("6");

  const cat = categorias.find((c) => c.codigo === codigo) ?? categorias[0];
  if (!cat) return null;
  const ufN = clampInt(uf, 999);
  const cochN = clampInt(coch, 999);
  const r = calc(cat, ufN, cochN, bonificaciones);

  return (
    <div className="calc">
      <fieldset className="calc__cats">
        <legend className="field-label">Categoría del edificio</legend>
        <div className="seg" role="radiogroup" style={{ gridTemplateColumns: `repeat(${Math.min(categorias.length, 4)}, 1fr)` }}>
          {categorias.map((c) => (
            <label key={c.codigo} className="seg__opt" data-checked={c.codigo === cat.codigo || undefined}>
              <input type="radio" name="cat" value={c.codigo} checked={c.codigo === cat.codigo} onChange={() => setCodigo(c.codigo)} />
              <span className="seg__letter">{c.codigo}</span>
              <span className="seg__name">{c.nombre}</span>
            </label>
          ))}
        </div>
        <p className="calc__desc">{cat.descripcion}</p>
      </fieldset>

      <div className="calc__inputs">
        <div>
          <label htmlFor={ufId} className="field-label">
            Unidades funcionales
          </label>
          <input id={ufId} inputMode="numeric" value={uf} onChange={(e) => setUf(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </div>
        <div>
          <label htmlFor={cochId} className="field-label">
            Cocheras
          </label>
          <input id={cochId} inputMode="numeric" value={coch} onChange={(e) => setCoch(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </div>
      </div>

      <dl className="calc__breakdown">
        <div>
          <dt>Mínimo hasta 20 UF</dt>
          <dd>{money(r.base)}</dd>
        </div>
        <div>
          <dt>
            {r.extra} UF desde la 21 × {money(cat.porUf)}
          </dt>
          <dd>{money(r.ufExtra)}</dd>
        </div>
        <div>
          <dt>
            {cochN} cochera{cochN === 1 ? "" : "s"} × {money(cat.cochera)}
          </dt>
          <dd>{money(r.coch)}</dd>
        </div>
        {r.bonif && (
          <div>
            <dt>Bonificación sugerida, más de {r.bonif.desde} UF</dt>
            <dd>− {r.bonif.pct}&nbsp;%</dd>
          </div>
        )}
        <div className="calc__total">
          <dt>Honorario mensual sugerido</dt>
          <dd>{ufN === 0 ? "—" : money(r.total)}</dd>
        </div>
      </dl>
      <p className="calc__note">Cálculo orientativo, sin IVA. La referencia oficial es la tabla en PDF.</p>
    </div>
  );
}
