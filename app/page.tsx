import { Header } from "../components/Header";
import HeroScene from "../components/HeroScene";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { CalculadoraHonorarios } from "../components/Honorarios";
import { Proveedores } from "../components/Proveedores";
import { Reveal } from "../components/Reveal";
import { Validador } from "../components/Validador";
import { LINKS, NOMBRE_LEGAL, RUBROS } from "../lib/data";
import { getCapacitaciones, getGaleria, getHonorarios, getProveedores, type Capacitacion } from "../lib/content";
import { Galeria3D } from "../components/Galeria3D";
import { Intro } from "../components/Intro";
import { Spotlight } from "../components/Spotlight";

// Todo lo que se edita en el panel se lee en cada visita.
export const dynamic = "force-dynamic";

const money = (n: number) => `$ ${new Intl.NumberFormat("es-AR").format(n)}`;

const TIPOS: Record<Capacitacion["tipo"], string> = {
  programa: "Programa",
  curso: "Curso",
  capacitacion: "Capacitación",
  taller: "Taller",
};

function fecha(iso: string) {
  const d = new Date(`${iso}T12:00:00-03:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return {
    dia: d.toLocaleDateString("es-AR", { day: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }),
    mes: d.toLocaleDateString("es-AR", { month: "short", timeZone: "America/Argentina/Buenos_Aires" }).replace(".", ""),
    pasada: d < hoy,
  };
}

// próximas primero (más cercana arriba), después las ya realizadas (más reciente arriba)
function ordenarAgenda(items: Capacitacion[]) {
  const proximas = items.filter((c) => !fecha(c.fecha).pasada).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pasadas = items.filter((c) => fecha(c.fecha).pasada).sort((a, b) => b.fecha.localeCompare(a.fecha));
  return [...proximas, ...pasadas].slice(0, 4);
}

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

const BENEFICIOS = [
  ["Defensa de intereses", "Representación del sector ante organismos públicos y privados."],
  ["Capacitaciones exclusivas", "Talleres, cursos y seminarios, con bonificaciones para asociados."],
  ["Asesoramiento integral", "Soporte legal, contable y técnico para tu práctica diaria."],
  ["Documentación y alertas", "Documentación modelo, normativas y novedades de la propiedad horizontal."],
  ["Networking", "Conexión con colegas y nuevas oportunidades de trabajo."],
  ["Voz institucional", "Tu opinión cuenta en las decisiones que afectan a la profesión."],
];

export default async function Home() {
  const [hon, proveedores, capacitaciones, fotos] = await Promise.all([
    getHonorarios(),
    getProveedores(),
    getCapacitaciones(),
    getGaleria(),
  ]);
  const verificados = proveedores.filter((p) => p.v).length;
  const desde = hon.categorias.length ? Math.min(...hon.categorias.map((c) => c.minimo20)) : 0;
  const destacados = capacitaciones.filter((c) => c.destacado);
  const programa = destacados.find((c) => !fecha(c.fecha).pasada) ?? destacados[0];
  const agenda = ordenarAgenda(capacitaciones.filter((c) => c !== programa));
  const rubrosTop = ["ascensores", "seguridad", "electricidad", "pintura"].map((r) => RUBROS[r]);

  return (
    <>
      <a href="#contenido" className="skip">
        Saltar al contenido
      </a>
      <Intro />
      <Header />
      <Reveal />
      <Spotlight />

      <main id="contenido">
        {/* Hero fijo: el contenido sube por encima como una hoja */}
        <section className="hero" id="inicio" aria-labelledby="hero-title">
          <HeroScene />
          <div className="hero__copy">
            <p className="eyebrow hero__eyebrow">Cámara de la Propiedad Horizontal · Santa Fe</p>
            <h1 id="hero-title" className="hero__title">
              La fuerza de una profesión, <span>la fuerza de sus protagonistas.</span>
            </h1>
            <p className="hero__lede">
              La Cámara que representa a los administradores de consorcios de Santa Fe, 1.ª Circunscripción.
            </p>
            <div className="hero__actions">
              <a className="btn btn--yellow" href={LINKS.asociarse} target="_blank" rel="noopener noreferrer">
                Quiero asociarme
                <Icon name="arrow" size={18} />
              </a>
              <a className="btn btn--glass" href={LINKS.proveedor} target="_blank" rel="noopener noreferrer">
                Soy proveedor
              </a>
            </div>
          </div>
          <a href="#herramientas" className="hero__scroll" aria-label="Ver herramientas">
            <Icon name="arrow-down" size={18} />
          </a>
        </section>

        <div className="sheet">
          {/* ---------- HERRAMIENTAS ---------- */}
          <section className="block" id="herramientas" aria-labelledby="tools-title">
            <div className="wrap">
              <div className="block__intro" data-reveal>
                <p className="eyebrow">Herramientas</p>
                <h2 id="tools-title" className="h2">
                  Tus herramientas, <span className="muted">a un toque.</span>
                </h2>
              </div>
              <div className="bento">
                <article className="tile tile--check" id="administradores" data-reveal data-glow>
                  <h3 className="tile__title">¿Sos asociado? Verificá tu estado</h3>
                  <p className="tile__text">
                    Buscá por nombre, DNI o número de asociado. Sirve también para que un consorcio confirme a su
                    administrador.
                  </p>
                  <Validador />
                </article>

                <a className="tile tile--navy tile--link" href="#honorarios" data-reveal data-glow style={delay(80)}>
                  <h3 className="tile__period">
                    Honorarios <span>{hon.periodo}</span>
                  </h3>
                  <p className="tile__text">Desde {money(desde)} por mes. Calculá el de tu consorcio.</p>
                  <span className="tile__go">
                    Calcular <Icon name="arrow" size={18} />
                  </span>
                </a>

                <a className="tile tile--sky tile--link" href="#proveedores" data-reveal data-glow style={delay(160)}>
                  <h3 className="tile__title">Directorio de proveedores</h3>
                  <p className="tile__text">{verificados} empresas verificadas por la Cámara.</p>
                  <ul className="tile__chips" aria-label="Algunos rubros">
                    {rubrosTop.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <span className="tile__go">
                    Ver directorio <Icon name="arrow" size={18} />
                  </span>
                </a>
              </div>
            </div>
          </section>

          {/* ---------- HONORARIOS ---------- */}
          <section className="block" id="honorarios" aria-labelledby="hon-title">
            <div className="wrap">
              <header className="block__head" data-reveal>
                <p className="eyebrow">Honorarios</p>
                <h2 id="hon-title" className="h2">
                  Honorarios sugeridos <span className="muted">{hon.periodo.toLowerCase()}</span>
                </h2>
                <p className="lede">Aranceles mínimos recomendados por la Cámara según la categoría del edificio.</p>
                <a className="btn btn--navy" href={hon.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="download" size={18} />
                  Tabla oficial en PDF
                </a>
              </header>

              <div className="hon-grid">
                <div data-reveal>
                  <CalculadoraHonorarios categorias={hon.categorias} bonificaciones={hon.bonificaciones} />
                </div>

                <div className="hon-tables" data-reveal style={delay(100)}>
                  <div className="table-card" data-glow>
                    <table className="table">
                      <caption className="sr-only">Honorarios mensuales sugeridos por categoría, {hon.periodo}</caption>
                      <thead>
                        <tr>
                          <th scope="col">Categoría</th>
                          <th scope="col" className="num">
                            Hasta 20 UF
                          </th>
                          <th scope="col" className="num">
                            UF desde la 21
                          </th>
                          <th scope="col" className="num">
                            Cochera
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {hon.categorias.map((c) => (
                          <tr key={c.codigo}>
                            <th scope="row">
                              <span className="cat-cell">
                                <span className="cat-letter">{c.codigo}</span>
                                <span className="cat-text">{c.descripcion}</span>
                              </span>
                            </th>
                            <td className="num">{money(c.minimo20)}</td>
                            <td className="num">{money(c.porUf)}</td>
                            <td className="num">{money(c.cochera)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="hon-extra">
                    <div className="soft-card" data-glow>
                      <h3 className="h4">Tareas independientes</h3>
                      <ul className="price-list">
                        {hon.tareas.map((t) => (
                          <li key={t.nombre}>
                            <span>
                              {t.nombre}
                              {t.detalle && <small>{t.detalle}</small>}
                            </span>
                            <span className="num">{t.valor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="soft-card" data-glow>
                      <h3 className="h4">Bonificaciones sugeridas</h3>
                      <ul className="price-list">
                        {hon.bonificaciones.map((b) => (
                          <li key={b.desde}>
                            <span>Más de {b.desde} UF</span>
                            <span className="num">{b.pct}&nbsp;%</span>
                          </li>
                        ))}
                      </ul>
                      <details className="details">
                        <summary>
                          <Icon name="arrow-down" size={16} className="details__icon" />
                          Qué cuenta como servicio central
                        </summary>
                        <ul>
                          {hon.amenities.map((a) => (
                            <li key={a}>{a}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </div>
                  <ul className="notes">
                    {hon.notas.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- CAPACITACIONES ---------- */}
          <section className="block" id="capacitaciones" aria-labelledby="cap-title">
            <div className="wrap">
              <div className="panel panel--navy">
                <header className="block__head block__head--row" data-reveal>
                  <div>
                    <p className="eyebrow">Capacitaciones</p>
                    <h2 id="cap-title" className="h2">
                      Capacitación continua
                    </h2>
                  </div>
                  <p className="lede">Cursos, talleres y programas para estar al día con la normativa y la gestión.</p>
                </header>

                <div className="cap-grid">
                  {programa && (
                    <article className="programa" data-reveal>
                      <h3 className="programa__title">{programa.titulo}</h3>
                      <p className="programa__status">
                        <Icon name="calendar" size={16} />
                        {fecha(programa.fecha).pasada
                          ? `Edición ${programa.fecha.slice(0, 4)} · inició el ${fecha(programa.fecha).dia} de ${fecha(programa.fecha).mes}`
                          : `Inicia el ${fecha(programa.fecha).dia} de ${fecha(programa.fecha).mes}`}
                      </p>
                      {programa.descripcion && <p className="programa__lede">{programa.descripcion}</p>}
                      <dl className="programa__data">
                        {(
                          [
                            ["Modalidad", programa.modalidad],
                            ["Duración", programa.duracion],
                            ["Certificación", programa.certificacion],
                            ["Dirigido a", programa.dirigidoA],
                            ["Inversión", programa.inversion],
                            ["Lugar", programa.lugar],
                          ] as const
                        )
                          .filter(([, v]) => v)
                          .map(([k, v]) => (
                            <div key={k}>
                              <dt>{k}</dt>
                              <dd>{v}</dd>
                            </div>
                          ))}
                      </dl>
                      {programa.beneficio && <p className="programa__benefit">{programa.beneficio}</p>}
                      <div className="programa__actions">
                        {programa.inscripcionUrl && !fecha(programa.fecha).pasada && (
                          <a className="btn btn--yellow" href={programa.inscripcionUrl} target="_blank" rel="noopener noreferrer">
                            Inscribirme
                            <Icon name="arrow" size={18} />
                          </a>
                        )}
                        {programa.programaUrl && (
                          <a className="btn btn--glass" href={programa.programaUrl} target="_blank" rel="noopener noreferrer">
                            <Icon name="download" size={18} />
                            Ver programa
                          </a>
                        )}
                        <a className="btn btn--glass" href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
                          <Icon name="chat" size={18} />
                          {fecha(programa.fecha).pasada ? "Próxima edición" : "Consultar"}
                        </a>
                      </div>
                    </article>
                  )}

                  <ol className="agenda">
                    {agenda.map((t, i) => {
                      const f = fecha(t.fecha);
                      return (
                        <li key={t.id} className="agenda__item" data-reveal style={delay(120 + i * 80)}>
                          <time className="agenda__date" dateTime={t.fecha}>
                            <span className="agenda__day">{f.dia}</span>
                            <span className="agenda__month">{f.mes}</span>
                          </time>
                          <div>
                            <h3 className="agenda__title">{t.titulo}</h3>
                            <p className="agenda__meta">
                              {[TIPOS[t.tipo], t.hora, t.lugar].filter(Boolean).join(" · ")}
                              {f.pasada && <span className="tag">Realizado</span>}
                            </p>
                            {t.descripcion && <p className="agenda__meta">{t.descripcion}</p>}
                            {!f.pasada && t.inscripcionUrl && (
                              <a href={t.inscripcionUrl} target="_blank" rel="noopener noreferrer" className="link-arrow agenda__cta">
                                Inscribirme <Icon name="arrow" size={18} />
                              </a>
                            )}
                            <ul className="agenda__topics">
                              {t.temas.map((x) => (
                                <li key={x}>{x}</li>
                              ))}
                            </ul>
                          </div>
                        </li>
                      );
                    })}
                    <li className="agenda__next" data-reveal>
                      <p>¿Querés enterarte de la próxima capacitación?</p>
                      <a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="link-arrow">
                        Info por WhatsApp <Icon name="arrow" size={18} />
                      </a>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </section>

          {/* ---------- PROVEEDORES ---------- */}
          <section className="block" id="proveedores" aria-labelledby="prov-title">
            <div className="wrap">
              <header className="block__head block__head--row" data-reveal>
                <div>
                  <p className="eyebrow">Proveedores</p>
                  <h2 id="prov-title" className="h2">
                    Empresas en las que confiamos
                  </h2>
                  <p className="lede">
                    Proveedores del rubro para contratar con tranquilidad. Los marcados con{" "}
                    <span className="inline-check">
                      <Icon name="check" size={12} />
                    </span>{" "}
                    son asociados verificados.
                  </p>
                </div>
                <a className="btn btn--navy" href={LINKS.proveedor} target="_blank" rel="noopener noreferrer">
                  Quiero ser proveedor
                  <Icon name="arrow" size={18} />
                </a>
              </header>
              <div data-reveal>
                <Proveedores proveedores={proveedores} />
              </div>
            </div>
          </section>

          {/* ---------- LA CÁMARA ---------- */}
          <section className="block" id="quienes-somos" aria-labelledby="qs-title">
            <div className="wrap about">
              <div data-reveal>
                <p className="eyebrow">La Cámara</p>
                <h2 id="qs-title" className="h2">
                  Uniendo a la comunidad <span className="muted">de administradores.</span>
                </h2>
                <p className="lede">
                  CAPH Santa Fe existe para que los administradores no trabajen solos. Defendemos los intereses del
                  sector ante organismos públicos y privados, fomentamos la colaboración entre colegas y elevamos los
                  estándares de la profesión, para que propietarios e inquilinos tengan administraciones más seguras y
                  transparentes.
                </p>
              </div>
              <ul className="services">
                <li data-reveal data-glow>
                  <h3 className="h3">Asesorías</h3>
                  <p>Soporte legal, técnico y contable para los asociados.</p>
                </li>
                <li data-reveal data-glow style={delay(80)}>
                  <h3 className="h3">Mediaciones</h3>
                  <p>Un nexo imparcial para resolver conflictos entre las partes.</p>
                  <a href={LINKS.mediacionPdf} target="_blank" rel="noopener noreferrer" className="link-arrow">
                    Área de gestión y conciliación <Icon name="arrow" size={18} />
                  </a>
                </li>
                <li data-reveal data-glow style={delay(160)}>
                  <h3 className="h3">Capacitaciones</h3>
                  <p>Formación técnica y académica constante.</p>
                  <a href="#capacitaciones" className="link-arrow">
                    Ver capacitaciones <Icon name="arrow" size={18} />
                  </a>
                </li>
              </ul>
            </div>
          </section>

          {/* ---------- COMUNIDAD: galería 3D (solo con fotos publicadas) ---------- */}
          {fotos.length > 0 && (
            <section className="block" id="comunidad" aria-labelledby="com-title">
              <div className="wrap">
                <div className="panel panel--navy panel--gallery">
                  <header className="block__head block__head--row" data-reveal>
                    <div>
                      <p className="eyebrow">Comunidad</p>
                      <h2 id="com-title" className="h2">
                        Nuestra comunidad <span className="muted">administradores y representantes.</span>
                      </h2>
                    </div>
                    <p className="lede">Encuentros, capacitaciones y el trabajo de quienes hacen la Cámara.</p>
                  </header>
                  <div data-reveal>
                    <Galeria3D fotos={fotos} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ---------- ASOCIARSE ---------- */}
          <section className="block" id="asociarse" aria-labelledby="as-title">
            <div className="wrap">
              <div className="panel panel--navy join">
                <div className="join__head" data-reveal>
                  <p className="eyebrow">Asociate</p>
                  <h2 id="as-title" className="h2 h2--xl">
                    Sumá tu voz a la Cámara
                  </h2>
                  <p className="lede">
                    Ser parte te da el respaldo y las herramientas para crecer profesionalmente y fortalecer tu red en
                    el sector.
                  </p>
                  <a className="btn btn--yellow btn--lg" href={LINKS.asociarse} target="_blank" rel="noopener noreferrer">
                    Quiero asociarme
                    <Icon name="arrow" size={18} />
                  </a>
                </div>
                <ul className="join__list">
                  {BENEFICIOS.map(([t, d], i) => (
                    <li key={t} data-reveal style={delay(i * 60)}>
                      <h3>{t}</h3>
                      <p>{d}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ---------- CONVOCATORIA ---------- */}
          <section className="block block--last" id="convocatoria" aria-labelledby="conv-title">
            <div className="wrap">
              <div className="panel panel--soft conv">
                <div data-reveal>
                  <p className="eyebrow">Convocatoria</p>
                  <h2 id="conv-title" className="h2">
                    Convocatoria abierta a arquitectos matriculados
                  </h2>
                  <p className="lede">
                    Sumate a la red de asistencia técnica. En convenio con el Colegio de Arquitectura y Urbanismo de la
                    Provincia de Santa Fe, Distrito 1, armamos una nómina de profesionales para asesorar a los
                    administradores asociados.
                  </p>
                  <a className="btn btn--navy" href={LINKS.convocatoria} target="_blank" rel="noopener noreferrer">
                    Inscribirme a la convocatoria
                    <Icon name="arrow" size={18} />
                  </a>
                  <p className="conv__fine">
                    Los datos se cotejan con el Colegio para verificar la matrícula. Integrar la nómina no implica
                    contratación automática. CPN Natalia Cerquetti, Presidenta CAPH Santa Fe.
                  </p>
                </div>
                <div className="conv__areas" data-reveal style={delay(100)}>
                  <h3 className="h4">Áreas de intervención</h3>
                  <ul>
                    <li>Evaluación edilicia y mantenimiento</li>
                    <li>Diagnóstico de patologías, filtraciones, humedades y deterioros estructurales</li>
                    <li>Inspección y seguimiento de obras</li>
                    <li>Informes técnicos, relevamientos y presupuestos</li>
                    <li>Seguridad edilicia y normativa</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <footer className="footer" id="contacto">
            <div className="wrap footer__grid">
              <div className="footer__brand">
                <Logo ground="#02040f" ink="#ffffff" className="footer__logo" />
                <p>{NOMBRE_LEGAL}</p>
                <a href="/admin" className="footer__admin">
                  <Icon name="lock" size={16} /> Ingresar al panel
                </a>
              </div>
              <div>
                <h2 className="footer__title">Contacto</h2>
                <ul className="footer__list">
                  <li>
                    <a href={LINKS.mapa} target="_blank" rel="noopener noreferrer">
                      <Icon name="pin" size={18} /> {LINKS.direccion}
                    </a>
                  </li>
                  <li>
                    <a href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
                      <Icon name="chat" size={18} /> WhatsApp {LINKS.whatsappLabel}
                    </a>
                  </li>
                  <li>
                    <a href={LINKS.instagram} target="_blank" rel="noopener noreferrer">
                      <Icon name="instagram" size={18} /> @camaradephdesantafe
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="footer__title">Accesos</h2>
                <ul className="footer__list">
                  <li>
                    <a href={LINKS.asociarse} target="_blank" rel="noopener noreferrer">
                      Alta de administradores
                    </a>
                  </li>
                  <li>
                    <a href={LINKS.proveedor} target="_blank" rel="noopener noreferrer">
                      Alta de proveedores
                    </a>
                  </li>
                  <li>
                    <a href="#administradores">Verificar asociado</a>
                  </li>
                  <li>
                    <a href={hon.pdfUrl} target="_blank" rel="noopener noreferrer">
                      Honorarios en PDF
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="wrap footer__base">
              <p>© 2026 CAPH Santa Fe. Todos los derechos reservados.</p>
              <p>La fuerza de una profesión, la fuerza de sus protagonistas.</p>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
